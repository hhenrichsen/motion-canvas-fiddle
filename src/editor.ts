import { EditorState, Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
} from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { catppuccinMocha } from "@catppuccin/codemirror";

const DEFAULT_CODE = `import { makeScene2D } from '@motion-canvas/2d';
import { waitFor, all, createRef } from '@motion-canvas/core';
import { Circle, Rect } from '@motion-canvas/2d/lib/components';

export default makeScene2D(function* (view) {
  const circle = createRef<Circle>();
  const rect = createRef<Rect>();

  view.add(
    <>
      <Circle
        ref={circle}
        width={100}
        height={100}
        fill={'#ff0000'}
        x={-200}
        y={0}
      />
      <Rect
        ref={rect}
        width={100}
        height={100}
        fill={'#0000ff'}
        x={200}
        y={0}
      />
    </>
  );

  yield* waitFor(1.0);

  yield* all(
    circle().position.x(200, 2),
    rect().position.x(-200, 2),
    circle().fill('#00ff00', 2),
    rect().fill('#ff00ff', 2)
  );

  yield* waitFor(0.5);

  yield* all(
    circle().scale(1.5, 1),
    rect().rotation(360, 1)
  );
});`;

export interface EditorCallbacks {
  onSave: () => Promise<void>;
}

export interface EditorOptions extends EditorCallbacks {
  initialCode?: string | null;
}

export function createEditor(
  container: HTMLElement,
  options: EditorOptions
): EditorView {
  const extensions: Extension[] = [
    lineNumbers(),
    history(),
    drawSelection(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightSelectionMatches(),
    foldGutter(),
    javascript({ jsx: true, typescript: true }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          options.onSave().catch((error) => {
            console.error("Manual reload failed:", error);
          });
          return true;
        },
      },
    ]),
    catppuccinMocha,
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-content": { padding: "12px" },
      ".cm-focused .cm-cursor": { borderLeftColor: "var(--ctp-mocha-sky)" },
      ".cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--ctp-mocha-surface2)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--ctp-mocha-mantle)",
        borderRight: "1px solid var(--ctp-mocha-surface1)",
      },
    }),
  ];

  const initialContent = options.initialCode || DEFAULT_CODE;

  const state = EditorState.create({
    doc: initialContent,
    extensions,
  });

  return new EditorView({
    state,
    parent: container,
  });
}

export function resetEditorToDefault(editor: EditorView): void {
  editor.dispatch({
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: DEFAULT_CODE,
    },
  });
}

export function getEditorContent(editor: EditorView): string {
  return editor.state.doc.toString();
}
