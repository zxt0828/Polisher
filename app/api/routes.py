"""FastAPI routes: /api/keywords/extract, /api/resume/tailor, /api/resume/export.

Routing layer only: parses the request, calls into services/chains, and
shapes the response. No business logic lives here.
"""

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel

from app.chains.extract_keywords import extract_keywords_chain
from app.chains.tailor import tailor_chain
from app.schemas import Keywords, TailoredResume
from app.services.pdf_parser import extract_text_from_pdf
from app.services.pdf_renderer import build_export_filename, render_resume_pdf

router = APIRouter(prefix="/api")


class ExtractRequest(BaseModel):
    """Request body for POST /api/keywords/extract."""

    jd_text: str


@router.post("/keywords/extract", response_model=Keywords)
def extract_keywords(req: ExtractRequest) -> Keywords:
    # The dict key here must match the prompt template's placeholder name
    # ({jd_text} in app/prompts/extract_keywords.py), not the request field
    # name in general — they just happen to already be spelled the same way.
    return extract_keywords_chain.invoke({"jd_text": req.jd_text})


@router.post("/resume/tailor", response_model=TailoredResume)
def tailor_resume(
    # This endpoint is multipart/form-data, not JSON: a PDF file can't be
    # sent as a JSON field, so the file goes through `File(...)` and the
    # keywords string rides along as a plain form field via `Form(...)`.
    resume: UploadFile = File(...),
    keywords: str = Form(...),
) -> TailoredResume:
    try:
        resume_text = extract_text_from_pdf(resume)
    except ValueError as exc:
        # Don't let pdfplumber/pdfminer's raw error surface to the client;
        # translate it into a clean 400 with a readable message instead.
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # tailor_chain's prompt template (app/prompts/tailor.py) has placeholders
    # `resume_text` and `keywords` — the invoke dict keys must match those
    # placeholder names exactly, which is why the extracted text is passed
    # under "resume_text" rather than "resume".
    return tailor_chain.invoke({"resume_text": resume_text, "keywords": keywords})


@router.post("/resume/export")
def export_resume(resume: TailoredResume) -> Response:
    # No response_model: this endpoint returns a raw PDF byte stream, not a
    # JSON-serializable Pydantic model, so there's nothing for response_model
    # to validate against.
    pdf_bytes = render_resume_pdf(resume)
    filename = build_export_filename(resume)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
