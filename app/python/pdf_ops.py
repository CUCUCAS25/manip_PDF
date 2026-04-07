from __future__ import annotations

import os
from typing import Iterable


def _require_pypdf():
    try:
        from pypdf import PdfReader, PdfWriter  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Le module 'pypdf' est requis pour les operations PDF. Installez-le avec: pip install pypdf"
        ) from exc
    return PdfReader, PdfWriter


def merge_pdfs(inputs: Iterable[str], output_path: str) -> str:
    PdfReader, PdfWriter = _require_pypdf()
    writer = PdfWriter()
    for pdf in inputs:
        reader = PdfReader(pdf)
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def split_pdf(input_path: str, from_page: int, to_page: int, output_path: str) -> str:
    PdfReader, PdfWriter = _require_pypdf()
    reader = PdfReader(input_path)
    writer = PdfWriter()
    max_page = len(reader.pages)
    start = max(1, from_page)
    end = min(max_page, to_page)
    if start > end:
        raise RuntimeError("Intervalle de pages invalide.")
    for idx in range(start - 1, end):
        writer.add_page(reader.pages[idx])
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def compress_pdf(input_path: str, output_path: str) -> str:
    PdfReader, PdfWriter = _require_pypdf()
    reader = PdfReader(input_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    if os.path.getsize(output_path) == 0:
        raise RuntimeError("Compression invalide: fichier de sortie vide.")
    return output_path


def protect_pdf(input_path: str, output_path: str, password: str) -> str:
    if not password:
        raise RuntimeError("Mot de passe requis.")
    PdfReader, PdfWriter = _require_pypdf()
    reader = PdfReader(input_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def unprotect_pdf(input_path: str, output_path: str, password: str) -> str:
    PdfReader, PdfWriter = _require_pypdf()
    reader = PdfReader(input_path)
    if reader.is_encrypted:
        if reader.decrypt(password or "") == 0:
            raise RuntimeError("Mot de passe invalide.")
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

