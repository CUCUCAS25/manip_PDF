import os
import sys
import tempfile
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pypdf import PdfReader, PdfWriter

from pdf_ops import protect_pdf, unprotect_pdf


class TestPdfOpsSecurity(unittest.TestCase):
    def _create_pdf(self, path: str):
        writer = PdfWriter()
        writer.add_blank_page(width=595, height=842)
        with open(path, "wb") as f:
            writer.write(f)

    def test_protect_unprotect_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            protected = os.path.join(tmp, "protected.pdf")
            unprotected = os.path.join(tmp, "unprotected.pdf")
            self._create_pdf(src)

            protect_pdf(src, protected, "1234")
            self.assertTrue(PdfReader(protected).is_encrypted)

            unprotect_pdf(protected, unprotected, "1234")
            self.assertFalse(PdfReader(unprotected).is_encrypted)


if __name__ == "__main__":
    unittest.main()
