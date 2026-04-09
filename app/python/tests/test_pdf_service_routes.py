import json
import os
import sys
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from http.server import HTTPServer

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pypdf import PdfReader, PdfWriter

from pdf_service import Handler


class TestPdfServiceRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), Handler)
        cls.host, cls.port = cls.server.server_address
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, method, route, payload=None):
        conn = HTTPConnection(self.host, self.port, timeout=5)
        body = json.dumps(payload or {})
        headers = {"Content-Type": "application/json"}
        conn.request(method, route, body=body if method == "POST" else None, headers=headers)
        resp = conn.getresponse()
        data = resp.read().decode("utf8")
        conn.close()
        return resp.status, json.loads(data or "{}")

    def _create_pdf(self, path):
        writer = PdfWriter()
        writer.add_blank_page(width=595, height=842)
        with open(path, "wb") as f:
            writer.write(f)

    def test_health(self):
        status, data = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertTrue(data["ok"])

    def test_validate(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "a.pdf")
            self._create_pdf(p)
            status, data = self.request("POST", "/validate", {"path": p})
            self.assertEqual(status, 200)
            self.assertTrue(data["ok"])

    def test_protect_unprotect(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "src.pdf")
            protected = os.path.join(tmp, "protected.pdf")
            unprotected = os.path.join(tmp, "unprotected.pdf")
            self._create_pdf(src)

            status, data = self.request(
                "POST", "/protect", {"input_path": src, "output_path": protected, "password": "1234"}
            )
            self.assertEqual(status, 200)
            self.assertTrue(data["ok"])
            self.assertTrue(PdfReader(protected).is_encrypted)

            status, data = self.request(
                "POST", "/unprotect", {"input_path": protected, "output_path": unprotected, "password": "1234"}
            )
            self.assertEqual(status, 200)
            self.assertTrue(data["ok"])
            self.assertFalse(PdfReader(unprotected).is_encrypted)


if __name__ == "__main__":
    unittest.main()
