import os
import sys
import tempfile
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pypdf import PdfReader, PdfWriter

from pdf_ops import split_pdf_groups


class TestSplitPdfGroups(unittest.TestCase):
    """Régression : export multi-PDF depuis un source (job split_groups / route /split-groups)."""

    def _create_pdf(self, path: str, pages: int) -> None:
        writer = PdfWriter()
        for _ in range(pages):
            writer.add_blank_page(width=595, height=842)
        with open(path, "wb") as f:
            writer.write(f)

    def test_two_groups_distinct_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            out_a = os.path.join(tmp, "a.pdf")
            out_b = os.path.join(tmp, "b.pdf")
            self._create_pdf(src, 5)
            groups = [
                {"output_path": out_a, "page_indices": [1, 3]},
                {"output_path": out_b, "page_indices": [2, 4, 5]},
            ]
            outputs = split_pdf_groups(src, groups)
            self.assertEqual(len(outputs), 2)
            self.assertEqual(len(PdfReader(out_a).pages), 2)
            self.assertEqual(len(PdfReader(out_b).pages), 3)

    def test_empty_page_indices_skips_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            out_a = os.path.join(tmp, "a.pdf")
            out_b = os.path.join(tmp, "b.pdf")
            self._create_pdf(src, 2)
            groups = [
                {"output_path": out_a, "page_indices": [1]},
                {"output_path": out_b, "page_indices": []},
            ]
            outputs = split_pdf_groups(src, groups)
            self.assertEqual(len(outputs), 1)
            self.assertTrue(os.path.isfile(out_a))
            self.assertFalse(os.path.isfile(out_b))

    def test_page_order_preserved_in_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            out = os.path.join(tmp, "out.pdf")
            self._create_pdf(src, 3)
            outputs = split_pdf_groups(src, [{"output_path": out, "page_indices": [3, 1]}])
            self.assertEqual(len(outputs), 1)
            self.assertEqual(len(PdfReader(out).pages), 2)

    def test_rejects_output_outside_source_directory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            sub = os.path.join(tmp, "nested")
            os.makedirs(sub, exist_ok=True)
            out_bad = os.path.join(sub, "out.pdf")
            self._create_pdf(src, 2)
            with self.assertRaises(RuntimeError):
                split_pdf_groups(src, [{"output_path": out_bad, "page_indices": [1]}])


if __name__ == "__main__":
    unittest.main()
