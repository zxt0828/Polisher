"""Debug script to run the PDF parser directly against a local resume file.

Usage:
    python scripts/try_pdf_parser.py path/to/resume.pdf

The API endpoint hands `extract_text_from_pdf` a FastAPI `UploadFile`, but on
disk here we only have a plain file path. To exercise the exact same code
path (not just the shared bytes-level helper), we build a minimal stand-in
object that offers the same `.file` attribute (a readable binary stream)
that `extract_text_from_pdf` relies on.
"""

import sys
from dataclasses import dataclass
from typing import BinaryIO

from app.services.pdf_parser import extract_text_from_pdf


@dataclass
class FakeUploadFile:
    """Minimal stand-in for FastAPI's UploadFile, exposing just `.file`."""

    file: BinaryIO


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/try_pdf_parser.py path/to/resume.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]

    with open(pdf_path, "rb") as f:
        fake_upload = FakeUploadFile(file=f)
        text = extract_text_from_pdf(fake_upload)

    print(text)
