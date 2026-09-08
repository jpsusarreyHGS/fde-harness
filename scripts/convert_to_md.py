#!/usr/bin/env -S uv run --script
# /// script
# requires-python = "==3.12.*"
# dependencies = [
#   "markitdown[pdf,docx,pptx,xlsx,xls]==0.1.6",
#   "openpyxl==3.1.5",
# ]
# ///
"""Convert a binary document to LLM-readable Markdown.

    uv run --script --frozen scripts/convert_to_md.py <input> [--out <output.md>]

For .xlsx/.xlsm, --formulas extracts literal cell formulas (=B2*C2) instead of
MarkItDown's computed-value tables. Use it when you need a workbook's *logic*
rather than its numbers -- reverse-engineering a client's spreadsheet model into
an ontology, for instance. Run both passes to separate files when you need both.

Writes to <name>.md in the current directory unless --out is given. Refuses to
write into datasources/, which the harness treats as read-only.

Prints the written path to stdout; diagnostics to stderr.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SUPPORTED = frozenset({".pdf", ".docx", ".pptx", ".xlsx", ".xlsm", ".xls"})
FORMULA_CAPABLE = frozenset({".xlsx", ".xlsm"})
READ_ONLY_DIR = "datasources"


def fail(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def check_output_path(out: Path) -> None:
    """Refuse to write anywhere under a datasources/ directory."""
    parts = {p.lower() for p in out.resolve().parts}
    if READ_ONLY_DIR in parts:
        fail(
            f"refusing to write into {READ_ONLY_DIR}/ -- it is read-only to the "
            "harness. Write into the engagement folder instead."
        )


def convert_values(src: Path) -> str:
    from markitdown import MarkItDown

    result = MarkItDown().convert(str(src))
    return result.text_content


def convert_formulas(src: Path) -> str:
    """Dump literal cell formulas per sheet, with coordinates.

    Cells holding only a static value are skipped -- the point of this mode is
    the logic. A workbook with no formulas produces an explicit note rather than
    an empty file, so the caller can tell "no formulas" from "conversion failed".
    """
    from openpyxl import load_workbook

    wb = load_workbook(filename=str(src), data_only=False, read_only=True)
    out: list[str] = [f"# Cell formulas — {src.name}", ""]
    found = 0

    for ws in wb.worksheets:
        rows: list[str] = []
        for row in ws.iter_rows():
            for cell in row:
                value = cell.value
                if isinstance(value, str) and value.startswith("="):
                    rows.append(f"| `{cell.coordinate}` | `{value}` |")
                    found += 1
        if rows:
            out.append(f"## Sheet: {ws.title}")
            out.append("")
            out.append("| Cell | Formula |")
            out.append("|---|---|")
            out.extend(rows)
            out.append("")

    wb.close()

    if not found:
        out.append(
            "_No formulas found in this workbook. Every cell holds a static "
            "value; re-run without `--formulas` to extract those._"
        )
    else:
        out.insert(2, f"_{found} formula cells across {len(wb.sheetnames)} sheets._")
        out.insert(3, "")

    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Convert a binary document to Markdown for the FDE harness."
    )
    ap.add_argument("input", type=Path, help="PDF, DOCX, PPTX, XLSX, XLSM or XLS")
    ap.add_argument("--out", type=Path, help="output path (default: <name>.md here)")
    ap.add_argument(
        "--formulas",
        action="store_true",
        help="xlsx/xlsm only: extract literal cell formulas instead of values",
    )
    args = ap.parse_args()

    src: Path = args.input
    if not src.is_file():
        fail(f"not a file: {src}")

    ext = src.suffix.lower()
    if ext not in SUPPORTED:
        fail(f"unsupported extension {ext!r}. Supported: {', '.join(sorted(SUPPORTED))}")

    if args.formulas and ext not in FORMULA_CAPABLE:
        fail(
            f"--formulas needs .xlsx or .xlsm, got {ext!r}. Other formats carry no "
            "formulas; run without --formulas."
        )

    out: Path = args.out or Path.cwd() / f"{src.stem}.md"
    check_output_path(out)

    try:
        text = convert_formulas(src) if args.formulas else convert_values(src)
    except Exception as exc:  # noqa: BLE001 - surface the real cause to the operator
        fail(f"conversion failed: {type(exc).__name__}: {exc}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
