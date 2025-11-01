import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const packages = [
  "@motion-canvas/2d",
  "@hhenrichsen/canvas-commons",
  "@spidunno/motion-canvas-graphing",
];

/**
 * Find all component classes by looking for classes that extend Node
 */
function findComponents(packageName) {
  const components = new Map(); // componentName -> { propsInterface, extendsFrom }

  try {
    // Use require.resolve which works more reliably across environments
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packagePath = path.dirname(packageJsonPath);
    const componentsDir = path.join(packagePath, "lib", "components");

    const files = [];

    // Try the components directory first
    if (fs.existsSync(componentsDir)) {
      files.push(...fs.readdirSync(componentsDir).filter(f => f.endsWith(".d.ts")).map(f => path.join(componentsDir, f)));
    }

    // If no components directory, try index.d.ts (for bundled libraries)
    if (files.length === 0) {
      const indexPath = path.join(packagePath, "lib", "index.d.ts");
      if (fs.existsSync(indexPath)) {
        files.push(indexPath);
      } else {
        console.warn(`No type definitions found for ${packageName}`);
        return components;
      }
    }

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");

      // Look for class declarations
      // Pattern 1: export class ComponentName extends SomeBase {
      // Pattern 2: export class Node implements ... {
      // Pattern 3: declare class ComponentName extends SomeBase { (for bundled .d.ts files)
      // Note: Also handles abstract classes
      const classExtendsRegex = /(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)\s+extends\s+(\w+)/g;
      const classImplementsRegex = /(?:export\s+)?(?:declare\s+)?class\s+(\w+)\s+implements/g;

      let match;

      // Handle classes that extend
      while ((match = classExtendsRegex.exec(content)) !== null) {
        const [, className, extendsFrom] = match;

        // Look for the corresponding Props interface
        const propsInterfaceRegex = new RegExp(
          `(?:export\\s+)?interface\\s+${className}Props(?:\\s+extends\\s+(\\w+))?`,
          'g'
        );

        const propsMatch = propsInterfaceRegex.exec(content);

        if (propsMatch) {
          components.set(className, {
            propsInterface: `${className}Props`,
            extendsPropsFrom: propsMatch[1] || null,
            extendsFrom: extendsFrom,
            file: filePath,
          });
        }
      }

      // Handle Node class specifically (it implements, not extends)
      if (content.includes('export declare class Node implements') || content.includes('declare class Node implements')) {
        const propsInterfaceRegex = /(?:export\s+)?interface\s+NodeProps/g;
        if (propsInterfaceRegex.test(content)) {
          components.set('Node', {
            propsInterface: 'NodeProps',
            extendsPropsFrom: null,
            extendsFrom: null, // Root of the hierarchy
            file: filePath,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to scan ${packageName}:`, error.message);
  }

  return components;
}

/**
 * Build a dependency graph of components based on inheritance
 */
function buildInheritanceGraph(allComponents) {
  const graph = new Map();

  for (const [componentName, info] of allComponents.entries()) {
    graph.set(componentName, {
      ...info,
      children: [],
    });
  }

  // Build parent-child relationships
  for (const [componentName, info] of allComponents.entries()) {
    if (info.extendsFrom && graph.has(info.extendsFrom)) {
      graph.get(info.extendsFrom).children.push(componentName);
    }
  }

  return graph;
}

/**
 * Find all components that descend from Node
 */
function findNodeDescendants(graph) {
  const descendants = new Set();
  const queue = ["Node"];

  while (queue.length > 0) {
    const current = queue.shift();
    const node = graph.get(current);

    if (!node) continue;

    descendants.add(current);

    if (node.children) {
      queue.push(...node.children);
    }
  }

  return descendants;
}

/**
 * Extract property names and JSDoc from an interface in a .d.ts file
 */
function extractPropsFromInterface(filePath, interfaceName) {
  const content = fs.readFileSync(filePath, "utf-8");
  const props = [];

  // Find the interface definition - handle nested braces
  const interfaceStart = content.indexOf(`interface ${interfaceName}`);
  if (interfaceStart === -1) {
    return props;
  }

  // Find the opening brace
  const openBraceIndex = content.indexOf('{', interfaceStart);
  if (openBraceIndex === -1) {
    return props;
  }

  // Find the matching closing brace
  let braceCount = 1;
  let closeBraceIndex = openBraceIndex + 1;
  while (closeBraceIndex < content.length && braceCount > 0) {
    if (content[closeBraceIndex] === '{') {
      braceCount++;
    } else if (content[closeBraceIndex] === '}') {
      braceCount--;
    }
    closeBraceIndex++;
  }

  const interfaceBody = content.substring(openBraceIndex + 1, closeBraceIndex - 1);

  // Extract properties with optional JSDoc
  const propPattern = /(?:\/\*\*([^*]|\*(?!\/))*\*\/)?\s*(\w+)\??:\s*([^;]+);/g;

  let propMatch;
  while ((propMatch = propPattern.exec(interfaceBody)) !== null) {
    const [, jsDoc, propName, propType] = propMatch;

    // Clean up JSDoc
    let description;
    if (jsDoc) {
      // Extract comment text, removing /** */ and * prefixes
      description = jsDoc
        .replace(/\/\*\*/, '')
        .replace(/\*\//, '')
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line.length > 0)
        .join(' ')
        .trim();
    }

    props.push({
      name: propName,
      description: description || undefined,
      type: propType.trim(),
    });
  }

  return props;
}

/**
 * Recursively collect all props for a component including inherited props
 */
function collectAllProps(componentName, allComponents, propsCache = new Map()) {
  if (propsCache.has(componentName)) {
    return propsCache.get(componentName);
  }

  const componentInfo = allComponents.get(componentName);
  if (!componentInfo) {
    return [];
  }

  const directProps = extractPropsFromInterface(
    componentInfo.file,
    componentInfo.propsInterface
  );

  // Get inherited props
  let inheritedProps = [];
  if (componentInfo.extendsFrom && allComponents.has(componentInfo.extendsFrom)) {
    inheritedProps = collectAllProps(componentInfo.extendsFrom, allComponents, propsCache);
  }

  // Combine and deduplicate (direct props override inherited)
  const propMap = new Map();

  for (const prop of inheritedProps) {
    propMap.set(prop.name, prop);
  }

  for (const prop of directProps) {
    propMap.set(prop.name, prop);
  }

  const allProps = Array.from(propMap.values());
  propsCache.set(componentName, allProps);

  return allProps;
}

function main() {
  console.log("Extracting component props from Motion Canvas packages...\n");

  // Step 1: Find all components in all packages
  const allComponents = new Map();

  for (const packageName of packages) {
    console.log(`Scanning ${packageName}...`);
    const components = findComponents(packageName);

    for (const [name, info] of components.entries()) {
      allComponents.set(name, info);
    }

    console.log(`  Found ${components.size} components`);
  }

  console.log(`\nTotal components found: ${allComponents.size}`);

  // Step 2: Build inheritance graph
  const graph = buildInheritanceGraph(allComponents);

  // Step 3: Find all descendants of Node
  const nodeDescendants = findNodeDescendants(graph);
  console.log(`\nComponents extending Node: ${nodeDescendants.size}`);

  // Step 4: Extract props for each Node descendant
  const componentPropsMap = {};

  for (const componentName of nodeDescendants) {
    if (componentName === "Node") continue; // Skip the base Node class itself if needed

    const props = collectAllProps(componentName, allComponents);

    if (props.length > 0) {
      // Deduplicate props by name (in case of multiple inheritance paths)
      const uniqueProps = Array.from(
        new Map(props.map(p => [p.name, p])).values()
      );

      componentPropsMap[componentName] = uniqueProps;
      console.log(`  ${componentName}: ${uniqueProps.length} props`);
    }
  }

  // Step 5: Generate the output file
  const output = `// This file is auto-generated by scripts/extract-component-props.mjs
// Do not edit manually - run 'npm run generate:props' to regenerate

export interface PropInfo {
  name: string;
  description?: string;
  type?: string;
}

export const componentProps: Record<string, PropInfo[]> = ${JSON.stringify(componentPropsMap, null, 2)};
`;

  const outputPath = path.join(__dirname, "..", "src", "generated-component-props.ts");
  fs.writeFileSync(outputPath, output, "utf-8");

  console.log(`\n✓ Generated component props at: ${outputPath}`);
  console.log(`✓ Total components with props: ${Object.keys(componentPropsMap).length}`);
}

main();
