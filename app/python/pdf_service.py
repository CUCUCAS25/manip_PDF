from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from pdf_ops import compress_pdf, merge_pdfs, protect_pdf, split_pdf, unprotect_pdf
from pdf_validation import validate_pdf_path


class Handler(BaseHTTPRequestHandler):
    def _json_response(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        payload = json.loads(body or "{}")
        try:
            if self.path == "/validate":
                result = validate_pdf_path(payload.get("path", ""))
                if result.ok:
                    self._json_response(200, {"ok": True})
                else:
                    self._json_response(400, {"ok": False, "error": result.error})
                return

            if self.path == "/merge":
                output = merge_pdfs(payload.get("inputs", []), payload.get("output_path", ""))
                self._json_response(200, {"ok": True, "output_path": output})
                return

            if self.path == "/split":
                output = split_pdf(
                    payload.get("input_path", ""),
                    int(payload.get("from_page", 1)),
                    int(payload.get("to_page", 1)),
                    payload.get("output_path", ""),
                )
                self._json_response(200, {"ok": True, "output_path": output})
                return

            if self.path == "/compress":
                output = compress_pdf(payload.get("input_path", ""), payload.get("output_path", ""))
                self._json_response(200, {"ok": True, "output_path": output})
                return

            if self.path == "/protect":
                output = protect_pdf(
                    payload.get("input_path", ""),
                    payload.get("output_path", ""),
                    payload.get("password", ""),
                )
                self._json_response(200, {"ok": True, "output_path": output})
                return

            if self.path == "/unprotect":
                output = unprotect_pdf(
                    payload.get("input_path", ""),
                    payload.get("output_path", ""),
                    payload.get("password", ""),
                )
                self._json_response(200, {"ok": True, "output_path": output})
                return

            self._json_response(404, {"ok": False, "error": "Route inconnue"})
        except Exception as exc:
            self._json_response(400, {"ok": False, "error": str(exc)})

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            try:
                import pypdf  # type: ignore  # noqa: F401

                self._json_response(200, {"ok": True, "pypdf": True})
            except Exception:
                self._json_response(200, {"ok": True, "pypdf": False})
            return
        self._json_response(404, {"ok": False, "error": "Route inconnue"})


def run() -> int:
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(run())
