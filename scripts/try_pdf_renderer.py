"""Debug script to render a sample TailoredResume to a local PDF file.

Usage:
    python scripts/try_pdf_renderer.py [output_path.pdf]

Exercises render_resume_pdf directly, without going through the API. The
sample data deliberately covers edge cases: an empty module (certifications),
an empty field (one education entry with no GPA), and HTML-special
characters in content ("AT&T", "< 500ms") to confirm Jinja2 autoescaping
round-trips correctly through WeasyPrint.
"""

import sys

from app.schemas import (
    CertificationItem,
    Contact,
    EducationItem,
    ExperienceItem,
    ProjectItem,
    SkillCategory,
    TailoredResume,
)
from app.services.pdf_renderer import render_resume_pdf

SAMPLE_RESUME = TailoredResume(
    contact=Contact(
        name="Jane Doe",
        email="jane.doe@example.com",
        phone="",  # deliberately empty: contact line should skip it, not show "| |"
        city="Boston, MA",
        github="github.com/janedoe",
        linkedin="linkedin.com/in/janedoe",
    ),
    summary=(
        "Backend engineer focused on building reliable APIs and data pipelines, "
        "with recent experience at AT&T shipping services with < 500ms p99 latency."
    ),
    skills=[
        SkillCategory(category="Backend", items=["Python", "FastAPI", "PostgreSQL"]),
        SkillCategory(category="DevOps", items=["Docker", "AWS", "CI/CD"]),
    ],
    experience=[
        ExperienceItem(
            company="AT&T",
            title="Software Engineer",
            location="Boston, MA",
            start_date="Jun 2023",
            end_date="Present",
            bullets=[
                "Rebuilt a core routing service, cutting p99 latency to < 500ms",
                "Migrated batch jobs to an event-driven pipeline, reducing runtime by 40%",
            ],
        ),
        ExperienceItem(
            company="Startup Inc",
            title="Software Engineer Intern",
            location="Remote",
            start_date="Jun 2022",
            end_date="Aug 2022",
            bullets=[],  # deliberately empty: bullet list should not render at all
        ),
    ],
    projects=[
        ProjectItem(
            name="Task Tracker",
            tech_stack=["React", "Node.js", "MongoDB"],
            bullets=["Built a full-stack task management app with real-time sync"],
        ),
    ],
    education=[
        EducationItem(
            school="Northeastern University",
            degree="Master of Science",
            major="Computer Science",
            gpa="3.9/4.0",
            dates="2022 - 2024",
        ),
        EducationItem(
            school="Some College",
            degree="Bachelor of Science",
            major="Computer Science",
            gpa="",  # deliberately empty: should not print a dangling "GPA:"
            dates="2018 - 2022",
        ),
    ],
    certifications=[],  # deliberately empty: whole Certifications section should vanish
)

if __name__ == "__main__":
    output_path = sys.argv[1] if len(sys.argv) > 1 else "resume_preview.pdf"
    pdf_bytes = render_resume_pdf(SAMPLE_RESUME)
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"Wrote {len(pdf_bytes)} bytes to {output_path}")
