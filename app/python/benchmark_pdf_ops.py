from __future__ import annotations

import tempfile
import time

from pypdf import PdfWriter

from pdf_ops import compress_pdf, merge_pdfs, split_pdf


def create_sample_pdf(path: str, pages: int) -> None:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)
    with open(path, "wb") as f:
        writer.write(f)


def timed(label: str, fn):
    start = time.perf_counter()
    fn()
    elapsed = (time.perf_counter() - start) * 1000
    print(f"{label}: {elapsed:.2f} ms")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        p1 = f"{tmp}/a.pdf"
        p2 = f"{tmp}/b.pdf"
        create_sample_pdf(p1, 50)
        create_sample_pdf(p2, 50)

        timed("merge 2x50 pages", lambda: merge_pdfs([p1, p2], f"{tmp}/merged.pdf"))
        timed("split pages 10-30", lambda: split_pdf(p1, 10, 30, f"{tmp}/split.pdf"))
        timed("compress 50 pages", lambda: compress_pdf(p1, f"{tmp}/compressed.pdf"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
