#!/usr/bin/env python3
"""Find invalid HTML nesting in ty SSR output (a common hydration-mismatch source)."""
from __future__ import annotations

import sys
from html.parser import HTMLParser

import requests

from qa_ty_audit import BASE

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
BLOCK = {"div", "p", "ul", "ol", "li", "section", "article", "header", "footer", "nav", "table", "form", "h1", "h2", "h3", "h4", "h5", "h6"}
BAD_PARENTS = {
    "p": BLOCK - {"p"} | {"p"},
    "a": {"a", "button"},
    "button": {"a", "button"},
    "span": set(),
    "ul": {"p"},
    "ol": {"p"},
}


class Checker(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.problems: list[str] = []

    def handle_starttag(self, tag, attrs):  # noqa: D102
        for parent, bad_children in BAD_PARENTS.items():
            if parent in self.stack and tag in bad_children:
                # only report the nearest offending ancestor
                if self.stack[-1] != parent or tag in BLOCK or tag == parent:
                    ctx = " > ".join(self.stack[-3:])
                    self.problems.append(f"<{tag}> inside <{parent}>   ctx: {ctx}")
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):  # noqa: D102
        if tag in self.stack:
            while self.stack and self.stack.pop() != tag:
                pass


def check(path: str) -> None:
    html = requests.get(f"{BASE}{path}", timeout=60).text
    c = Checker()
    c.feed(html)
    uniq = list(dict.fromkeys(c.problems))
    print(f"=== {path}: {len(uniq)} unique nesting issues ===")
    for p in uniq[:12]:
        print("  ", p)


for p in sys.argv[1:] or ["/", "/clubs", "/events"]:
    check(p)
