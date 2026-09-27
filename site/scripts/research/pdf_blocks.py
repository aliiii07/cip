#!/usr/bin/env python3
"""
Font aware text extraction for the research script.

Prints one JSON array of blocks: {"t": text, "b": bold, "s": font size}.
A block is a run of consecutive lines with the same weight and a similar
size, so a bold heading is its own block and a paragraph is one block even
when it wraps. Lines that repeat on many pages (running headers, page
numbers, "Table of Contents") are dropped.

Usage: python3 pdf_blocks.py file.pdf
"""
import json
import re
import sys
from collections import Counter

import fitz  # PyMuPDF

PAGE_MARK = re.compile(r"^(\d+\s*/\s*\d+|Page \d+( of \d+)?|\d{1,2}\.\d{2}\.\d{4}, \d{2}:\d{2}.*)$")


def line_info(line):
    text = ""
    bold_chars = 0
    total = 0
    size = 0.0
    for span in line.get("spans", []):
        s = span.get("text", "")
        if not s:
            continue
        n = len(s)
        total += n
        is_bold = bool(span.get("flags", 0) & 16) or "bold" in span.get("font", "").lower() or "black" in span.get("font", "").lower()
        if is_bold:
            bold_chars += n
        size += span.get("size", 0) * n
        text += s
    text = " ".join(text.split())
    if not text or total == 0:
        return None
    return {"t": text, "b": bold_chars / total > 0.6, "s": round(size / total, 1)}


def main(path):
    doc = fitz.open(path)
    pages = []
    for page in doc:
        d = page.get_text("dict")
        lines = []
        for block in d.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                li = line_info(line)
                if li:
                    lines.append(li)
        pages.append(lines)

    # Running headers and footers: exact lines that appear on many pages.
    counts = Counter(l["t"] for lines in pages for l in lines)
    page_count = max(1, len(pages))
    repeated = {t for t, c in counts.items() if c >= max(6, page_count * 0.15)}

    def continues(cur, l):
        """Does line l continue the block cur?"""
        if cur is None or cur["b"] != l["b"] or abs(cur["s"] - l["s"]) >= 0.6:
            return False
        ends = cur["t"].endswith((".", ":", "?", "!"))
        if l["b"]:
            # A bold run continues only when it is a wrapped heading, not a
            # short group title followed by the next heading.
            return not ends and len(cur["t"]) >= 60
        if not ends:
            return True
        return not l["t"][:1].isupper()

    blocks = []
    cur = None
    for lines in pages:
        for l in lines:
            t = l["t"]
            if t in repeated or t.isdigit() or PAGE_MARK.match(t):
                continue
            if continues(cur, l):
                cur["t"] = f'{cur["t"]} {t}'
            else:
                if cur is not None:
                    blocks.append(cur)
                cur = dict(l)
    if cur is not None:
        blocks.append(cur)
    json.dump(blocks, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
