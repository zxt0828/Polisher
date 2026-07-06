"""Parses an uploaded PDF resume into plain text (pure engineering, no LLM).

Stateless by design: takes bytes in, returns a str out. Nothing is ever
written to disk and nothing is cached.
"""

import io

import pdfplumber
from fastapi import UploadFile


def extract_text_from_pdf(file: UploadFile) -> str:
    """Extract plain text from an uploaded PDF, page by page.

    Args:
        file: A FastAPI ``UploadFile`` coming straight from an endpoint's
            ``File(...)`` parameter.

    Returns:
        The concatenated text of every page, separated by newlines.

    Raises:
        ValueError: If the file can't be parsed as a PDF, or if parsing
            succeeds but no extractable text is found on any page (e.g. a
            scanned/image-only resume with no text layer).
    """
    # UploadFile wraps a SpooledTemporaryFile (`.file`), not a path, and its
    # read position may already be anywhere. pdfplumber needs a file-like
    # object it can seek on, so we pull the raw bytes out and wrap them in
    # BytesIO ourselves rather than handing it `.file` directly — that keeps
    # this function agnostic to whatever state the UploadFile's cursor is in.
    raw_bytes = file.file.read()

    return extract_text_from_pdf_bytes(raw_bytes)


def extract_text_from_pdf_bytes(raw_bytes: bytes) -> str:
    """Same as `extract_text_from_pdf`, but takes raw PDF bytes directly.

    Factored out so both an `UploadFile` (API layer) and a plain file read
    from disk (e.g. tests, scripts) can share the same extraction logic.
    """
    try:
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            page_texts = []
            for page in pdf.pages:
                # `.extract_text()` returns None (not "") when a page has no
                # extractable text layer — e.g. a blank page or a scanned
                # image. Skip those pages instead of letting a None sneak
                # into the joined output or blowing up on concatenation.
                text = page.extract_text()
                if text:
                    page_texts.append(text)
    except Exception as exc:
        # pdfplumber/pdfminer raise a variety of low-level, cryptic
        # exceptions for corrupt or non-PDF input. Wrap them in a single,
        # clear error type so the calling endpoint can translate it into a
        # clean HTTP 4xx without leaking implementation details.
        raise ValueError(f"Failed to parse PDF: {exc}") from exc

    if not page_texts:
        raise ValueError(
            "No extractable text found in PDF. It may be a scanned/image-only "
            "document with no text layer."
        )

    return "\n".join(page_texts)
