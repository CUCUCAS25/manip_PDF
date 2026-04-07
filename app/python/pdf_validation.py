from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class ValidationResult:
    ok: bool
    error: str | None = None


def validate_pdf_path(path: str) -> ValidationResult:
    if not path:
        return ValidationResult(False, "Le chemin PDF est vide.")
    if not os.path.exists(path):
        return ValidationResult(False, "Le fichier PDF n'existe pas.")
    if not os.path.isfile(path):
        return ValidationResult(False, "Le chemin n'est pas un fichier.")
    if os.path.getsize(path) == 0:
        return ValidationResult(False, "Le fichier PDF est vide.")
    if not path.lower().endswith(".pdf"):
        return ValidationResult(False, "Le fichier n'est pas un PDF.")
    return ValidationResult(True)

