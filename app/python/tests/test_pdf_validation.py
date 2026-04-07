import os
import sys
import tempfile
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from pdf_validation import validate_pdf_path


class TestPdfValidation(unittest.TestCase):
    def test_empty_path_fails(self):
        result = validate_pdf_path("")
        self.assertFalse(result.ok)

    def test_missing_path_fails(self):
        result = validate_pdf_path("C:/never/exists/file.pdf")
        self.assertFalse(result.ok)

    def test_non_pdf_extension_fails(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
            path = tmp.name
            tmp.write(b"hello")
        try:
            result = validate_pdf_path(path)
            self.assertFalse(result.ok)
        finally:
            os.unlink(path)

    def test_empty_pdf_fails(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            path = tmp.name
        try:
            result = validate_pdf_path(path)
            self.assertFalse(result.ok)
        finally:
            os.unlink(path)

    def test_basic_pdf_passes(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            path = tmp.name
            tmp.write(b"%PDF-1.4\n%Fake")
        try:
            result = validate_pdf_path(path)
            self.assertTrue(result.ok)
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
