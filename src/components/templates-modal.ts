import { html, css, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";

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
];

@customElement("templates-modal")
export class TemplatesModal extends BaseModal {
  @state()
  private selectedTemplate: string | null = null;

  static styles = [
    BaseModal.styles,
    css`
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
          `,
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

    this.dispatchEvent(
      new CustomEvent("apply", {
        detail: template.code,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "templates-modal": TemplatesModal;
  }
}
