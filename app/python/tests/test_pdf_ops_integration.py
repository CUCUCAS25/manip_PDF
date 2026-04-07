import os
import sys
import tempfile
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pypdf import PdfReader, PdfWriter

from pdf_ops import compress_pdf, merge_pdfs, split_pdf


class TestPdfOpsIntegration(unittest.TestCase):
    def _create_pdf(self, path: str, pages: int):
        writer = PdfWriter()
        for _ in range(pages):
            writer.add_blank_page(width=595, height=842)
        with open(path, "wb") as f:
            writer.write(f)

    def test_merge_split_compress(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = os.path.join(tmp, "a.pdf")
            b = os.path.join(tmp, "b.pdf")
            merged = os.path.join(tmp, "merged.pdf")
            split = os.path.join(tmp, "split.pdf")
            compressed = os.path.join(tmp, "compressed.pdf")

            self._create_pdf(a, 3)
            self._create_pdf(b, 2)

            merge_pdfs([a, b], merged)
            self.assertEqual(len(PdfReader(merged).pages), 5)

            split_pdf(merged, 2, 4, split)
            self.assertEqual(len(PdfReader(split).pages), 3)

            compress_pdf(merged, compressed)
            self.assertTrue(os.path.getsize(compressed) > 0)


if __name__ == "__main__":
    unittest.main()
