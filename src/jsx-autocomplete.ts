import type {
  CompletionContext,
  Completion,
  CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { componentProps } from "./generated-component-props";

function findJSXContext(node: SyntaxNode, state: any): { componentName: string; inAttribute: boolean } | null {
  let current: SyntaxNode | null = node;

  while (current) {
    // Check if we're in a JSX opening tag or self-closing tag
    if (current.name === "JSXOpenTag" || current.name === "JSXSelfClosingTag" || current.name === "JSXElement") {
      // Find the tag name by looking for a child node
      let tagNameNode: SyntaxNode | null = null;
      let tagNameEnd = -1;

      // Walk through children to find the identifier
      const cursor = current.cursor();
      if (cursor.firstChild()) {
        do {
          if (cursor.name === "JSXIdentifier" || cursor.name === "Identifier") {
            tagNameNode = cursor.node;
            tagNameEnd = cursor.to;
            break;
          }
        } while (cursor.nextSibling());
      }

      if (tagNameNode) {
        const componentName = state.doc.sliceString(tagNameNode.from, tagNameNode.to);

        // Check if we're in the attributes section (after the tag name)
        const cursorPos = node.from;

        return {
          componentName,
          inAttribute: cursorPos > tagNameEnd,
        };
      }
    }

    current = current.parent;
  }

  return null;
}

export function jsxAttributeCompletion(
  context: CompletionContext,
): CompletionResult | null {
  const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);

  const jsxContext = findJSXContext(nodeBefore, context.state);

  if (!jsxContext || !jsxContext.inAttribute) {
    return null;
  }

  const { componentName } = jsxContext;
  const props = componentProps[componentName];

  if (!props) {
    return null;
  }

  // Match the word being typed (or allow explicit trigger on whitespace)
  const word = context.matchBefore(/\w*/);

  if (!word) {
    return null;
  }

  // Allow showing completions even when no word is typed if explicitly requested
  if (word.from === word.to && !context.explicit) {
    return null;
  }

  // Get already used attributes to avoid suggesting them again
  const usedAttributes = new Set<string>();
  let current: SyntaxNode | null = nodeBefore.parent;
  while (current && (current.name === "JSXOpenTag" || current.name === "JSXSelfClosingTag")) {
    current.getChildren("JSXAttribute").forEach((attr) => {
      const attrName = attr.getChild("JSXAttributeName");
      if (attrName) {
        usedAttributes.add(attrName.toString());
      }
    });
    break;
  }

  const options: Completion[] = props
    .filter((prop) => !usedAttributes.has(prop.name))
    .map((prop) => ({
      label: prop.name,
      type: "property",
      detail: prop.description,
      info: prop.type,
    }));

  return {
    from: word.from,
    options,
  };
}
