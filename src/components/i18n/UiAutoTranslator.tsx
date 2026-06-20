"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";
import { translateUiText } from "@/i18n/ui-translations";

const translatedAttributes = ["placeholder", "title", "aria-label", "alt"] as const;

function preserveWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translateTextNode(node: Text, locale: string) {
  const original = node.nodeValue ?? "";
  const translated = translateUiText(locale, original);
  if (translated !== original.trim() && translated !== original) {
    node.nodeValue = preserveWhitespace(original, translated);
  }
}

function translateElement(element: Element, locale: string) {
  for (const attribute of translatedAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const translated = translateUiText(locale, value);
    if (translated !== value) element.setAttribute(attribute, translated);
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, locale);
    current = walker.nextNode();
  }
}

export function UiAutoTranslator() {
  const locale = useLocale();

  useLayoutEffect(() => {
    if (locale !== "ar") return;
    translateElement(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, locale);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element, locale);
        }
      }
    });

    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}

