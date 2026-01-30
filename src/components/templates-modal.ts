import { html, css, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";
import { trackEvent } from "../analytics";

export interface Template {
  id: string;
  name: string;
  description: string;
  code: string;
}

const TEMPLATES: Template[] = [
  {
    id: "hello-world",
    name: "Hello World",
    description: "Simple text animation",
    code: `import { makeScene2D, Txt } from "@motion-canvas/2d";
import { createRef } from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  const text = createRef<Txt>();

  view.add(
    <Txt
      ref={text}
      fontSize={60}
      fill={"#fff"}
      text="Hello World"
    />
  );

  yield* text().scale(0, 0).to(1, 1);
  yield* text().rotation(0, 0).to(360, 2);
});`,
  },
  {
    id: "variable-fonts",
    name: "Variable Fonts",
    description: "Demonstrates working with variable fonts",
    code: `import {
  Layout,
  LayoutProps,
  Node,
  Rect,
  Txt,
  makeScene2D,
} from "@motion-canvas/2d";
import { loop, SignalValue, spawn, unwrap, waitFor } from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  view.fill("black");

  view.add(
    <Txt
      fontWeight={100}
      fontFamily={"Inter"}
      fontSize={50}
      textAlign={"center"}
      fill={"white"}
      ref={(node: Txt) => spawn(loop(() => node.fontWeight(900, 3).to(100, 3)))}
      text={"Hello, Motion Canvas!"}
    ></Txt>
  );

  yield* waitFor(12);
});`,
  },
  {
    id: "bubble-sort",
    name: "Bubble Sort",
    description: "Demonstrates bubble sort algorithm",
    code: `import { Layout, Rect, Txt, makeScene2D } from "@motion-canvas/2d";
import { Colors } from "@hhenrichsen/canvas-commons";
import {
  Vector2,
  all,
  chain,
  createComputed,
  createRefArray,
  createSignal,
  easeInCubic,
  easeInOutCubic,
  unwrap,
  useRandom,
  waitFor,
} from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  view.fill(Colors.Nord.PolarNight["1"])
  const colors = Object.values(Colors.Nord.Aurora);
  const count = 5;
  const random = useRandom();
  const rects = createRefArray<Rect>();
  const rectMap = Array.from({ length: count }, (_, i) => i);
  const size = createSignal(100);
  const gap = createSignal(100);
  const space = createComputed(() => gap() + size());

  function* swap(aIndex: number, bIndex: number) {
    const a = rects[rectMap[aIndex]];
    const b = rects[rectMap[bIndex]];
    const aPos = a.position();
    const bPos = b.position();
    const middlePos = aPos.sub(bPos).div(2).add(bPos);
    yield* chain(
      all(
        a.position(
          bPos,
          1,
          easeInCubic,
          Vector2.createPolarLerp(true, middlePos)
        ),
        b.position(
          aPos,
          1,
          easeInCubic,
          Vector2.createPolarLerp(true, middlePos)
        )
      )
    );
  }

  view.add(
    <Layout>
      {Array.from({ length: 5 }, (_, i) => (
        <Rect
          x={() => i * space() - Math.floor(count / 2) * space()}
          y={0}
          size={size}
          radius={8}
          fill={colors[i % colors.length]}
          ref={rects}
        >
          <Txt
            text={random.nextInt(1, 20).toString()}
            fill={Colors.Nord.PolarNight["1"]}
            fontSize={30}
            fontFamily="JetBrains Mono"
          />
        </Rect>
      ))}
    </Layout>
  );

  for (let i = 0; i < count - 1; i++) {
    let swapped = false;
    for (let j = 0; j < count - 1 - i; j++) {
      const aValue = parseInt(unwrap(rects[rectMap[j]]).childAs<Txt>(0).text());
      const bValue = parseInt(
        unwrap(rects[rectMap[j + 1]])
          .childAs<Txt>(0)
          .text()
      );
      if (aValue > bValue) {
        yield* swap(j, j + 1);
        const temp = rectMap[j];
        rectMap[j] = rectMap[j + 1];
        rectMap[j + 1] = temp;
        swapped = true;
      }
    }
    if (!swapped) {
      break;
    }
  }

  yield* waitFor(2);

  yield* all(
    ...rects.map((rect, index) => {
      const originalPosition = new Vector2(
        index * space() - Math.floor(count / 2) * space(),
        0
      );
      const midpoint = originalPosition.add(rect.position()).div(2);
      return rect.position(
        originalPosition,
        1,
        easeInOutCubic,
        // If it's moving left, we need to move counterclockwise
        // If it's moving right, we need to move clockwise
        Vector2.createPolarLerp(true, midpoint)
      );
    })
  );

  yield* waitFor(2);
});
;
`,
  },
  {
    id: "bubble-sort-code-viz",
    name: "Bubble Sort Code Highlighting",
    description: "Demonstrates bubble sort algorithm with code highlighting",
    code: `import {
  Code,
  Layout,
  LezerHighlighter,
  Rect,
  lines,
  makeScene2D,
} from '@motion-canvas/2d';
import {all, createRef, waitFor} from '@motion-canvas/core';
import {parser as python} from '@lezer/python';
import {
  CatppuccinMochaHighlightStyle,
  Colors,
} from '@hhenrichsen/canvas-commons';

export default makeScene2D(function* (view) {
  const code = createRef<Code>();
  const highlightRect = createRef<Rect>();
  const highlighter = new LezerHighlighter(
    python,
    CatppuccinMochaHighlightStyle,
  );

  view.add(
    <Layout cache compositeOperation={'exclusion'}>
      <Rect
        ref={highlightRect}
        width={0}
        height={0}
        fill={Colors.Catppuccin.Mocha.Blue}
        opacity={0.5}
        radius={8}
      />
      <Code
        highlighter={highlighter}
        ref={code}
        code={\`\\
def bubble_sort(a):
  for i in range(len(a)):
    for j in range(len(a) - 1):
      if a[j] > a[j + 1]:
        a[j], a[j + 1] = a[j + 1], a[j]
  return a
\`}
      ></Code>
    </Layout>,
  );

  const highlightLine = function* (idx: number, duration: number = 0.2) {
    const bbox = code().getSelectionBBox(lines(idx, idx))[0];
    yield* all(
      highlightRect().width(bbox.width + 10, duration),
      highlightRect().height(bbox.height + 10, duration),
      highlightRect().x(bbox.x + bbox.width / 2, duration),
      highlightRect().y(bbox.y + bbox.height / 2, duration),
    );
  };

  yield* highlightLine(0, 0);
  const a = [5, 3, 2, 4, 1];
  for (let i = 0; i < a.length; i++) {
    yield* highlightLine(1);
    for (let j = 0; j < a.length - 1; j++) {
      yield* highlightLine(2);
      yield* highlightLine(3);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield* highlightLine(4);
      }
    }
  }
  yield* highlightLine(5);
  yield* waitFor(1);
});`
  },
  {
    id: "fractions",
    name: "Reciprocal Fractions",
    description: "Demonstrates reciprocal fractions",
    code: `import { makeScene2D, Circle, Line, Txt } from "@motion-canvas/2d";
import {
  all,
  waitFor,
  createRef,
  Vector2,
  createSignal,
  easeInCubic,
  easeInOutBack,
  tween,
} from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  const red = "#BF616A";
  const white = "#E5E9F0";

  const lineWidth = createSignal(20);
  const fontSize = createSignal(170);
  const goalSymbolHeight = createSignal(125);

  const numerator1 = createRef<Txt>();
  view.add(
    <Txt
      ref={numerator1}
      text="5"
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [200, fontSize() / 2 + 50]}
      fill={white}
    />
  );
  const denominator1 = createRef<Txt>();
  view.add(
    <Txt
      ref={denominator1}
      text="8"
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [200, -fontSize() / 2 - 30]}
      fill={white}
    />
  );
  const divider1 = createRef<Line>();
  view.add(
    <Line
      ref={divider1}
      lineWidth={() => lineWidth()}
      stroke={red}
      points={[
        [300, 0],
        [100, 0],
      ]}
      lineCap="round"
    />
  );

  const numerator2 = createRef<Txt>();
  view.add(
    <Txt
      ref={numerator2}
      text="11"
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [-200, fontSize() / 2 + 50]}
      fill={white}
    />
  );
  const denominator2 = createRef<Txt>();
  view.add(
    <Txt
      ref={denominator2}
      text="7"
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [-200, -fontSize() / 2 - 30]}
      fill={white}
    />
  );
  const divider2 = createRef<Line>();
  view.add(
    <Line
      ref={divider2}
      lineWidth={() => lineWidth()}
      stroke={red}
      points={[
        [-100, 0],
        [-300, 0],
      ]}
      lineCap="round"
    />
  );

  const middle = createRef<Line>();
  view.add(
    <Line
      ref={middle}
      lineWidth={() => lineWidth()}
      stroke={red}
      points={[
        [50, 0],
        [-50, 0],
      ]}
      lineCap="round"
    />
  );
  const middleDot1 = createRef<Circle>();
  view.add(
    <Circle
      ref={middleDot1}
      position={[0, 50]}
      fill={red}
      size={Vector2.one.scale(lineWidth())}
      lineCap="round"
      opacity={1}
    />
  );
  const middleDot2 = createRef<Circle>();
  view.add(
    <Circle
      ref={middleDot2}
      position={[0, -50]}
      fill={red}
      size={Vector2.one.scale(lineWidth())}
      lineCap="round"
      opacity={1}
    />
  );
  const middleLine = createRef<Line>();
  view.add(
    <Line
      ref={middleLine}
      lineWidth={() => lineWidth()}
      stroke={red}
      points={[
        [0, -50],
        [0, -50],
      ]}
      lineCap="round"
    />
  );
  yield* waitFor(2);

  yield* middleLine().points(
    [
      [0, 50],
      [0, -50],
    ],
    0.3,
    easeInCubic
  );

  yield middleDot1().opacity(0, 0);
  yield middleDot2().opacity(0, 0);
  yield* all(
    middle().rotation(50, 0.2).to(45, 0.1),
    middleLine().rotation(50, 0.2).to(45, 0.1)
  );

  // yield* all(middle().position.y(20, 0.15, linear).to(0, 0.1, easeOutBack), middleLine().position.y(20, 0.15, linear).to(0, 0.1, easeOutBack))

  yield* waitFor(0.5);
  const center = new Vector2(200, 10);
  const p1 = numerator1().position().sub(center);
  const p2 = denominator1().position().sub(center);

  yield* tween(1, (current) => {
    const angle = easeInOutBack(current, 0, -Math.PI);
    numerator1().position(
      center.add(
        new Vector2(
          Math.cos(angle) * p1.x - Math.sin(angle) * p1.y,
          Math.sin(angle) * p1.x + Math.cos(angle) * p1.y
        )
      )
    );
    denominator1().position(
      center.add(
        new Vector2(
          Math.cos(angle) * p2.x - Math.sin(angle) * p2.y,
          Math.sin(angle) * p2.x + Math.cos(angle) * p2.y
        )
      )
    );
  });

  const middleClone = middle().snapshotClone();
  const middleLineClone = middleLine().snapshotClone();

  view.add(middleClone);
  view.add(middleLineClone);

  yield* waitFor(0.25);

  yield all(
    middleClone.position
      .y(() => goalSymbolHeight() * 1.1, 0.2)
      .to(() => goalSymbolHeight(), 0.1),
    middleLineClone.position
      .y(() => goalSymbolHeight() * 1.1, 0.2)
      .to(() => goalSymbolHeight(), 0.1),
    middle()
      .position.y(() => -goalSymbolHeight() * 1.1, 0.2)
      .to(() => -goalSymbolHeight(), 0.1),
    middleLine()
      .position.y(() => -goalSymbolHeight() * 1.1, 0.2)
      .to(() => -goalSymbolHeight(), 0.1)
  );
  yield* waitFor(0.5);

  yield* waitFor(0.5);
  yield* divider2().points(
    [
      [300, 0],
      [-300, 0],
    ],
    0.2
  );
  yield* divider1().opacity(0, 0);
  yield* waitFor(0.5);

  yield all(
    middleClone.opacity(0, 0.3),
    middleLineClone.opacity(0, 0.3),
    middle().opacity(0, 0.3),
    middleLine().opacity(0, 0.3)
  );

  const numeratorFinal = createRef<Txt>();
  view.add(
    <Txt
      ref={numeratorFinal}
      text="88"
      opacity={0}
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [0, fontSize() / 2 + 50]}
      fill={white}
    />
  );
  const denominatorFinal = createRef<Txt>();
  view.add(
    <Txt
      ref={denominatorFinal}
      text="35"
      opacity={0}
      fontSize={() => fontSize()}
      lineHeight={() => numerator1().fontSize() * 1.1}
      position={() => [0, -fontSize() / 2 - 30]}
      fill={white}
    />
  );

  yield* all(
    numerator1().opacity(0, 0.3),
    numerator1().position.x(0, 0.3),
    denominator1().opacity(0, 0.3),
    denominator1().position.x(0, 0.3),
    numerator2().opacity(0, 0.3),
    numerator2().position.x(0, 0.3),
    denominator2().opacity(0, 0.3),
    denominator2().position.x(0, 0.3),
    numeratorFinal().opacity(1, 0.3),
    denominatorFinal().opacity(1, 0.3),
    divider2().points(
      [
        [200, 0],
        [-200, 0],
      ],
      0.3
    )
  );

  yield* waitFor(2);
});

`,
  },
  {
    id: "graphing",
    name: "Graphing",
    description: "Demonstrates using spidunno's graphing library",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { Vector2 } from "@motion-canvas/core";
import {
	MathGrid,
	MathExpression,
	MathSpace,
	MathGraphingCalculator,
} from "@spidunno/motion-canvas-graphing";

export default makeScene2D(function* (view) {
	// MathGraphingCalculator is asynchronous, so it must be yielded to ensure it's loaded before rendering.
	yield view.add(
		<MathSpace
			width={() => view.width()}
			height={() => view.height()}
			/* \`min\` and \`max\` specify the domain that the \`MathSpace\` should span across */
			min={new Vector2(-8, -4.5)}
			max={new Vector2(8, 4.5)}
		>
			{/* Minor subdivisions */}
			<MathGrid lineWidth={1} spacing={[1 / 2, 1 / 2]} stroke="#4e5485" />

			{/* Major subdivisions */}
			<MathGrid
				lineWidth={2}
				spacing={[1, 1]}
				stroke="#919cff"
				xAxisStroke={"#f27949"}
				yAxisStroke={"#71e377"}
			/>

			<MathGraphingCalculator>
				<MathExpression
					/* equations are passed in as LaTeX, an easy way to write these is to write it in Desmos and then copy/paste it here. */
					equation={String.raw\`y = \\sin(x)\`}
					stroke="rgb(241, 249, 12)"
				/>
			</MathGraphingCalculator>
		</MathSpace>
	);
});`,
  },
  {
    id: "shiki",
    name: "Shiki Highlighting",
    description: "Demonstrates using Shiki for syntax highlighting",
    code: `
    import {Circle, Code, Rect, makeScene2D} from '@motion-canvas/2d';
import {all, createRef, waitFor} from '@motion-canvas/core';
import {ShikiHighlighter} from './shiki';

const H = new ShikiHighlighter({
  highlighter: {
    lang: 'asm',
    theme: 'vitesse-dark',
  },
});

export default makeScene2D(function* (view) {
  const code = createRef<Code>();

  view.add(
    <Code
      ref={code}
      highlighter={H}
      fontFamily={'JetBrains Mono, monospace'}
      code={\`\\
section .text
   global _start

_start:
    mov rax, 60
    mov rdi, 0
    syscall
\`}
    />,
  );

  const asmCode = \`\\
section .data
    input: incbin "../input.txt"
    input_len: equ $-input

section .text
   global _start

_start:
    mov dl, [input + rcx]
    cmp rdx, \\\\n
    jne not_new_line
\`;

  yield* waitFor(0.6);
  yield* code().code(asmCode, 0.6).wait(0.6).back(0.6).wait(0.6);
  yield* waitFor(0.6);
});
`,
  },
  {
    id: "code-highlighting",
    name: "Canvas Commons: Code with Syntax Highlighting",
    description:
      "Shows how to display code with syntax highlighting and line numbers",
    code: `import { makeScene2D, Layout, Code, LezerHighlighter } from "@motion-canvas/2d";
import { createRef, waitFor } from "@motion-canvas/core";
import { parser as javascript } from "@lezer/javascript";
import { CatppuccinMochaHighlightStyle } from "@hhenrichsen/canvas-commons/highlightstyle/Catppuccin";
import { CodeLineNumbers } from "@hhenrichsen/canvas-commons/components/CodeLineNumbers";
import { Colors } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const code = createRef<Code>();
  const codeContainer = createRef<Layout>();

  view.add(
    <Layout layout direction={"row"} gap={20} opacity={0} ref={codeContainer}>
      <CodeLineNumbers
        code={code}
        numberProps={{
          fill: Colors.Catppuccin.Mocha.Overlay2,
        }}
      />
      <Code
        ref={code}
        highlighter={
          new LezerHighlighter(javascript, CatppuccinMochaHighlightStyle)
        }
        code={\`const btn = document.getElementById('btn');
let count = 0;

function render() {
  btn.innerHTML = \\\`Count: \\\${count}\\\`;
}

btn.addEventListener('click', () => {
  if (count < 10) {
    count++;
    render();
  }
});\`}
        fontSize={30}
      />
    </Layout>
  );

  yield* codeContainer().opacity(1, 1);
  yield* waitFor(1);
  yield* code().code.append("\\n// This is a comment", 1);
  yield* waitFor(2);
});`,
  },
  {
    id: "draw-animation",
    name: "Canvas Commons: Draw Animation",
    description: "Demonstrates drawing a shape with animated stroke",
    code: `import { makeScene2D, Rect } from "@motion-canvas/2d";
import { createRef, waitFor } from "@motion-canvas/core";
import { drawIn } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const draw = createRef<Rect>();

  view.add(
    <Rect
      radius={5}
      size={200}
      ref={draw}
      lineCap={"round"}
      strokeFirst
    />
  );

  yield* drawIn(draw, "white", "white", 1, true);
  yield* waitFor(2);
});`,
  },
  {
    id: "terminal",
    name: "Canvas Commons: Terminal",
    description: "Animated terminal with typing effects",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { createRef, waitFor } from "@motion-canvas/core";
import { Terminal, Window, Colors } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const terminal = createRef<Terminal>();
  const terminalWindow = createRef<Window>();

  yield view.add(
    <Window
      ref={terminalWindow}
      title={"Terminal"}
      size={[1200, 800]}
      headerColor={Colors.Catppuccin.Mocha.Base}
      bodyColor={Colors.Catppuccin.Mocha.Mantle}
      buttonColors={[
        Colors.Catppuccin.Mocha.Red,
        Colors.Catppuccin.Mocha.Yellow,
        Colors.Catppuccin.Mocha.Green,
      ]}
      icon={"ph:terminal"}
    >
      <Terminal
        ref={terminal}
        defaultTxtProps={{ fontFamily: "Ellograph CF", fontSize: 30 }}
        padding={20}
      />
    </Window>
  );

  yield* terminalWindow().open(view, 1);
  yield* terminal().typeLine("npm init @motion-canvas@latest", 2);
  yield* waitFor(1);
  terminal().lineAppear("");
  terminal().lineAppear("Need to install the following packages:");
  terminal().lineAppear("  @motion-canvas/create");
  terminal().lineAppear("Ok to proceed? (y)");
  yield* waitFor(1);
  yield* terminal().typeAfterLine(" y", 1);
  terminal().lineAppear([
    { text: "? Project name " },
    { text: "»", fill: Colors.Catppuccin.Mocha.Surface2 },
  ]);
  yield* waitFor(1);
  yield* terminal().typeAfterLine(" my-animation");
  yield* waitFor(2);
});`,
  },
  {
    id: "plot-random",
    name: "Canvas Commons: Plot with Random Data",
    description: "Line plot with randomly generated data points",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { createRef, range, useRandom, waitFor } from "@motion-canvas/core";
import { Plot, LinePlot } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const random = useRandom();
  const plot = createRef<Plot>();

  view.add(
    <Plot
      size={500}
      ref={plot}
      labelX="Time"
      labelY="Values"
      labelSize={10}
      opacity={0}
    >
      <LinePlot
        lineWidth={4}
        stroke={"red"}
        data={range(0, 26).map((i) => [i * 4, random.nextInt(0, 100)])}
      />
    </Plot>
  );

  yield* plot().opacity(1, 2);
  yield* waitFor(2);
  yield* plot().ticks(20, 3);
  yield* plot().size(800, 2);
  yield* waitFor(2);
});`,
  },
  {
    id: "plot-sine",
    name: "Canvas Commons: Plot Sine Wave",
    description: "Animated sine wave using mathematical function",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { createRef, waitFor } from "@motion-canvas/core";
import { Plot, LinePlot } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const plot = createRef<Plot>();
  const line = createRef<LinePlot>();

  view.add(
    <Plot
      clip
      size={500}
      ref={plot}
      labelSize={0}
      min={[-Math.PI * 2, -2]}
      max={[Math.PI * 2, 2]}
      labelFormatterX={(x) => \`\${Math.round(x / Math.PI)}π\`}
      ticks={[4, 4]}
      opacity={0}
    >
      <LinePlot lineWidth={4} stroke={"red"} end={0} ref={line} />
    </Plot>
  );

  line().data(plot().makeGraphData(0.1, (x) => Math.sin(x)));

  yield* plot().opacity(1, 2);
  yield* waitFor(2);
  yield* line().end(1, 2);
  yield* waitFor(2);
});`,
  },
  {
    id: "plot-scatter",
    name: "Canvas Commons: Scatter Plot",
    description: "Animated scatter plot with random data",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { createRef, range, useRandom, waitFor, linear } from "@motion-canvas/core";
import { Plot, ScatterPlot } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const random = useRandom();
  const plot = createRef<Plot>();
  const scatter = createRef<ScatterPlot>();

  view.add(
    <Plot
      size={500}
      ref={plot}
      labelX="Time"
      labelY="Errors"
      labelSize={10}
      opacity={0}
    >
      <ScatterPlot
        pointRadius={5}
        pointColor={"red"}
        ref={scatter}
        start={0.5}
        end={0.5}
        data={range(0, 26).map((i) => [i * 4, random.nextInt(0, 100)])}
      />
    </Plot>
  );

  yield* plot().opacity(1, 2);
  yield* waitFor(2);
  yield scatter().end(1, 3, linear);
  yield* waitFor(0.1);
  yield* scatter().start(0, 3, linear);
  yield* waitFor(2);
});`,
  },
  {
    id: "plot-parabola",
    name: "Canvas Commons: Plot Parabola",
    description: "Animated parabola using mathematical function",
    code: `import { makeScene2D } from "@motion-canvas/2d";
import { createRef, waitFor } from "@motion-canvas/core";
import { Plot, LinePlot } from "@hhenrichsen/canvas-commons";

export default makeScene2D(function* (view) {
  const plot = createRef<Plot>();
  const line = createRef<LinePlot>();

  view.add(
    <Plot
      clip
      size={500}
      ref={plot}
      labelSize={0}
      minX={-10}
      maxX={10}
      minY={-2}
      maxY={50}
      opacity={0}
      ticks={[4, 4]}
      offset={[-1, 0]}
    >
      <LinePlot lineWidth={4} stroke={"red"} ref={line} />
    </Plot>
  );

  line().data(plot().makeGraphData(0.1, (x) => Math.pow(x, 2)));

  yield* plot().opacity(1, 2);
  yield* waitFor(2);
  yield* line().end(1, 2);
  yield* waitFor(2);
});`,
  },
];

@customElement("templates-modal")
export class TemplatesModal extends BaseModal {
  @state()
  private selectedTemplate: string | null = null;

  static styles = [
    BaseModal.styles,
    css`
      .modal-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-height: 80vh;
      }

      .modal-body {
        overflow-y: auto;
        overflow-x: hidden;
        max-height: calc(80vh - 140px);
      }

      .modal-footer {
        position: sticky;
        bottom: 0;
        margin-top: auto;
      }

      /* Custom scrollbar styling to match CodeMirror */
      .modal-body::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }

      .modal-body::-webkit-scrollbar-track {
        background: var(--ctp-mocha-base);
      }

      .modal-body::-webkit-scrollbar-thumb {
        background: var(--ctp-mocha-surface2);
        border: 2px solid var(--ctp-mocha-base);
      }

      .modal-body::-webkit-scrollbar-thumb:hover {
        background: var(--ctp-mocha-overlay0);
      }

      .modal-body::-webkit-scrollbar-corner {
        background: var(--ctp-mocha-base);
      }

      /* Firefox scrollbar styling */
      .modal-body {
        scrollbar-width: thin;
        scrollbar-color: var(--ctp-mocha-surface2) var(--ctp-mocha-base);
      }

      .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .template-card {
        background: var(--ctp-mocha-surface0);
        border: 2px solid var(--ctp-mocha-surface1);
        padding: 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .template-card:hover {
        border-color: var(--ctp-mocha-sky);
        background: var(--ctp-mocha-surface1);
      }

      .template-card.selected {
        border-color: var(--ctp-mocha-sky);
        background: var(--ctp-mocha-surface1);
        box-shadow: 0 0 0 1px var(--ctp-mocha-sky);
      }

      .template-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--ctp-mocha-text);
        margin: 0 0 8px 0;
      }

      .template-description {
        font-size: 13px;
        color: var(--ctp-mocha-subtext0);
        margin: 0;
        line-height: 1.4;
      }

      @media (max-width: 768px) {
        .templates-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.title = "Code Templates";
  }

  protected renderBody(): TemplateResult {
    return html`
      <div class="templates-grid">
        ${TEMPLATES.map(
          (template) => html`
            <div
              class="template-card ${this.selectedTemplate === template.id
                ? "selected"
                : ""}"
              @click=${() => this.selectTemplate(template.id)}
            >
              <h4 class="template-name">${template.name}</h4>
              <p class="template-description">${template.description}</p>
            </div>
          `
        )}
      </div>
    `;
  }

  protected renderFooter(): TemplateResult {
    return html`
      <base-button variant="cancel" @click=${this.handleClose}>
        Cancel
      </base-button>
      <base-button
        variant="primary"
        @click=${this.handleApply}
        ?disabled=${!this.selectedTemplate}
      >
        Apply Template
      </base-button>
    `;
  }

  private selectTemplate(id: string): void {
    this.selectedTemplate = id;
  }

  private handleApply(): void {
    if (!this.selectedTemplate) return;

    const template = TEMPLATES.find((t) => t.id === this.selectedTemplate);
    if (!template) return;

    // Track template usage
    trackEvent("use_template", {
      template_id: template.id,
      template_name: template.name,
    });

    this.dispatchEvent(
      new CustomEvent("apply", {
        detail: template.code,
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "templates-modal": TemplatesModal;
  }
}
