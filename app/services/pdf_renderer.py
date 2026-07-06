"""Renders a TailoredResume into a PDF via an HTML/CSS template.

Stateless by design: takes a TailoredResume in, returns PDF bytes out.
Mirrors pdf_parser.py's shape, just the reverse direction (pdf_parser.py
goes PDF bytes -> text; this module goes structured data -> PDF bytes).
"""

import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.schemas import TailoredResume

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# autoescape must be explicit: unlike Flask's Jinja2 integration, a hand-built
# Environment defaults to autoescape=False. Without it, resume content
# containing "&", "<", ">" (e.g. a company name like "AT&T") would corrupt
# the HTML structure WeasyPrint parses.
_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)
_template = _env.get_template("resume.html")


def _join_nonempty(parts: list[str], sep: str = ", ") -> str:
    """Join only the non-empty strings in `parts` with `sep`."""
    return sep.join(part for part in parts if part)


def _build_context(resume: TailoredResume) -> dict:
    """Flatten a TailoredResume into plain template variables.

    Formatting decisions (how to join degree/major, how to combine start/end
    dates, etc.) live here rather than in the template, so resume.html only
    ever does interpolation, conditionals, and loops.
    """
    contact = resume.contact
    return {
        "contact_name": contact.name,
        "contact_line": _join_nonempty(
            [contact.city, contact.email, contact.phone, contact.linkedin, contact.github],
            " | ",
        ),
        "summary": resume.summary,
        "education": [
            {
                "school": edu.school,
                "degree_major": _join_nonempty([edu.degree, edu.major], " "),
                "gpa": edu.gpa,
                "dates": edu.dates,
            }
            for edu in resume.education
        ],
        "experience": [
            {
                "company": exp.company,
                "dates": _join_nonempty([exp.start_date, exp.end_date], " – "),
                "title": exp.title,
                "location": exp.location,
                "bullets": exp.bullets,
            }
            for exp in resume.experience
        ],
        "projects": [
            {"name": proj.name, "tech_stack": proj.tech_stack, "bullets": proj.bullets}
            for proj in resume.projects
        ],
        # Key is "entries", not "items": a dict already has a built-in
        # `.items()` method, so `cat.items` in the template would resolve to
        # that bound method instead of our list (Jinja2 tries attribute
        # access before subscript access for the `.` operator).
        "skills": [{"category": sc.category, "entries": sc.items} for sc in resume.skills],
        "certifications": [
            {"name": cert.name, "issuer": cert.issuer, "date": cert.date}
            for cert in resume.certifications
        ],
    }


def render_resume_pdf(resume: TailoredResume) -> bytes:
    """Render a TailoredResume into PDF bytes."""
    html = _template.render(**_build_context(resume))
    return HTML(string=html).write_pdf()


def build_export_filename(resume: TailoredResume) -> str:
    """Build a download filename from the resume's contact name.

    Falls back to a generic name when the name is empty, or empty after
    stripping anything that isn't ASCII alphanumeric/underscore (safe for
    both a filesystem name and an HTTP header value).
    """
    safe_name = re.sub(r"[^A-Za-z0-9_]+", "_", resume.contact.name.strip()).strip("_")
    if not safe_name:
        return "resume.pdf"
    return f"{safe_name}_Resume.pdf"
