import { CodeHighlighter, HighlightResult } from "@motion-canvas/2d";
import { PromiseHandle, DependencyContext } from "@motion-canvas/core";
import { createHighlighter } from "shiki";
import { BundledLanguage } from "shiki/langs";
import { BundledTheme } from "shiki/themes";
import {
  BundledHighlighterOptions,
  CodeToTokensOptions,
  ThemedToken,
  HighlighterGeneric,
} from "shiki";

export type ShikiOptions = {
  // Enforce one language/theme
  highlighter: Omit<
    BundledHighlighterOptions<BundledLanguage, BundledTheme>,
    "langs" | "themes"
  > & {
    lang: BundledHighlighterOptions<
      BundledLanguage,
      BundledTheme
    >["langs"][number];
    theme: BundledHighlighterOptions<
      BundledLanguage,
      BundledTheme
    >["themes"][number];
  };
  codeToTokens?: CodeToTokensOptions<BundledLanguage, BundledTheme>;
};

export class ShikiHighlighter implements CodeHighlighter<ThemedToken[]> {
  private shikiOptions: ShikiOptions;
  private handle: PromiseHandle<HighlighterGeneric<
    BundledLanguage,
    BundledTheme
  > | null> | null;

  public constructor(shikiOptions: ShikiOptions) {
    this.shikiOptions = shikiOptions;
    this.handle = null;
  }

  public initialize(): boolean {
    if (this.handle?.value !== undefined) {
      return true;
    } else {
      this.handle = DependencyContext.collectPromise(
        createHighlighter({
          ...this.shikiOptions.highlighter,
          langs: [this.shikiOptions.highlighter.lang],
          themes: [this.shikiOptions.highlighter.theme],
        })
      );

      return false;
    }
  }

  public prepare(code: string): ThemedToken[] {
    const result = this.handle?.value?.codeToTokens(
      code,
      this.codeToTokensOptions()
    );

    return result?.tokens.flat() ?? [];
  }

  public highlight(index: number, cache: ThemedToken[]): HighlightResult {
    const token = cache.find(
      (token) =>
        token.offset <= index && index < token.offset + token.content.length
    );

    if (token) {
      return {
        color: token.color ?? null,
        skipAhead: token.offset + token.content.length - index,
      };
    } else {
      return {
        color: null,
        skipAhead: 0,
      };
    }
  }

  public tokenize(code: string): string[] {
    const lineTokens = this.handle?.value
      ?.codeToTokens(code, this.codeToTokensOptions())
      .tokens.map((line) => line.map(({ content }) => content));

    const tokens = lineTokens?.flatMap((line, i) =>
      i === lineTokens.length - 1 ? line : [...line, "\n"]
    );

    return tokens ?? [];
  }

  private codeToTokensOptions() {
    return this.shikiOptions.codeToTokens !== undefined
      ? this.shikiOptions.codeToTokens
      : {
          lang: this.shikiOptions.highlighter.lang as BundledLanguage,
          theme: this.shikiOptions.highlighter.theme as BundledLanguage,
        };
  }
}
