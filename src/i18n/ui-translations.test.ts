import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { translateUiText } from "@/i18n/ui-translations";

const attributesWithVisibleText = new Set(["placeholder", "title", "aria-label", "alt"]);
const languageNeutralText = new Set([
  "DD/MM/YYYY",
  "e.g. 50x30mm",
  "Excel",
  "GRAM",
  "https://...",
  "INFO",
  "KG",
  "LITER",
  "MILLILITER",
  "MM/DD/YYYY",
  "PDF",
  "PIECE",
  "YYYY-MM-DD"
]);

function tsxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? tsxFiles(target) : target.endsWith(".tsx") ? [target] : [];
  });
}

function visibleLiterals(file: string) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const literals: Array<{ file: string; line: number; text: string }> = [];

  function add(node: ts.Node, value: string) {
    const text = value.replace(/\s+/g, " ").trim();
    if (!/[A-Za-z]{2}/.test(text) || languageNeutralText.has(text)) return;
    literals.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text });
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) add(node, node.text);
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      attributesWithVisibleText.has(node.name.text)
    ) {
      add(node, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return literals;
}

describe("Arabic UI translation coverage", () => {
  it("translates every static user-visible TSX literal", () => {
    const missing = tsxFiles(path.resolve("src"))
      .flatMap(visibleLiterals)
      .filter(({ text }) => translateUiText("ar", text) === text);

    expect(missing).toEqual([]);
  });

  it("translates dynamic status and pagination text", () => {
    expect(translateUiText("ar", "IN_PROGRESS")).toBe("قيد التنفيذ");
    expect(translateUiText("ar", "Page 2 of 5")).toBe("الصفحة 2 من 5");
    expect(translateUiText("en", "IN_PROGRESS")).toBe("IN_PROGRESS");
  });
});
