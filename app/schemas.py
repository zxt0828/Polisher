"""Pydantic models: structured output schemas and API request/response models."""

from pydantic import BaseModel, Field, field_validator


class Keywords(BaseModel):
    """Keywords extracted from a job description (JD)."""

    keywords: list[str] = Field(
        description="Key technical skills, tools, technologies, and hard qualification "
        "keywords extracted from the JD. Excludes vague soft-skill phrases."
    )


class Contact(BaseModel):
    """Contact info, extracted verbatim from the resume, never rewritten or fabricated."""

    name: str = Field(default="", description="Full name. Empty string if not found.")
    email: str = Field(default="", description="Email address. Empty string if not found.")
    phone: str = Field(default="", description="Phone number. Empty string if not found.")
    city: str = Field(default="", description="City. Empty string if not found.")
    github: str = Field(
        default="", description="GitHub URL or username. Empty string if not found."
    )
    linkedin: str = Field(
        default="", description="LinkedIn URL or username. Empty string if not found."
    )


class SkillCategory(BaseModel):
    """A skill category and its items."""

    category: str = Field(description="Skill category name, e.g. 'Backend', 'Frontend', 'DevOps'.")
    items: list[str] = Field(
        default_factory=list,
        description="Skills in this category: every skill already present in the resume, "
        "plus at most a few concrete named technologies (languages, frameworks, tools, "
        "databases) appended from the keyword list. Never include vague umbrella phrases "
        "or methodologies. Keep it concise.",
    )


class ExperienceItem(BaseModel):
    """A single work experience entry."""

    company: str = Field(default="", description="Company name.")
    title: str = Field(default="", description="Job title.")
    location: str = Field(
        default="",
        description="Location of this experience, extracted verbatim, never rewritten "
        "or fabricated. Empty string if not stated in the resume.",
    )
    start_date: str = Field(default="", description="Start date.")
    end_date: str = Field(
        default="", description="End date; keep original wording such as 'Present' if still current."
    )
    bullets: list[str] = Field(
        default_factory=list,
        description="Bullet points for this experience. Only rewrite existing wording, "
        "never add experience the user doesn't have.",
    )


class ProjectItem(BaseModel):
    """A single project entry."""

    name: str = Field(default="", description="Project name.")
    tech_stack: list[str] = Field(
        default_factory=list,
        description="Technologies used in this project, e.g. ['React', 'Node.js', "
        "'PostgreSQL']. Source rule is strict: every entry must come from this "
        "project's own real content in the resume — either a tech stack already "
        "listed for this project, or a technology actually mentioned in this "
        "project's bullets. Never add anything from the keyword list, and never "
        "add a technology this project did not actually use. If the resume gives "
        "no extractable tech info for this project, leave this as an empty list "
        "rather than inventing one.",
    )
    bullets: list[str] = Field(
        default_factory=list,
        description="Bullet points for this project. Only rewrite existing wording, "
        "never add a project the user doesn't have.",
    )


class EducationItem(BaseModel):
    """A single education entry, extracted verbatim, never rewritten."""

    school: str = Field(default="", description="School name.")
    degree: str = Field(default="", description="Degree, e.g. Bachelor, Master.")
    major: str = Field(default="", description="Major / field of study.")
    gpa: str = Field(
        default="",
        description="GPA, extracted verbatim from the resume, never rewritten or "
        "fabricated. Kept as a string since resumes format it inconsistently "
        "(e.g. '3.8', '3.8/4.0', '3.8/4.3'). Empty string if not stated.",
    )
    dates: str = Field(default="", description="Start and end dates.")


class CertificationItem(BaseModel):
    """A single certification entry, extracted verbatim, never rewritten."""

    name: str = Field(default="", description="Certification name.")
    issuer: str = Field(default="", description="Issuing organization.")
    date: str = Field(default="", description="Date obtained / issued.")


class TailoredResume(BaseModel):
    """Structured, tailored resume generated from the user's resume content and keywords."""

    contact: Contact = Field(
        default_factory=Contact,
        description="Contact info, extracted verbatim, never rewritten or fabricated.",
    )
    summary: str = Field(
        default="",
        description="A short summary generated from the user's experience and skills. "
        "Does not restate the specific details already covered in experience/projects.",
    )
    skills: list[SkillCategory] = Field(
        default_factory=list,
        description="Categorized skills. Additive but concise: keep every existing skill, and "
        "append only a few concrete named technologies from the keyword list (no vague "
        "umbrella phrases or methodologies). Prefer a small number of focused categories.",
    )
    experience: list[ExperienceItem] = Field(
        default_factory=list,
        description="Work experience list. Only rewrite existing wording, never add experience.",
    )
    projects: list[ProjectItem] = Field(
        default_factory=list,
        description="Project list. Only rewrite existing wording, never add a project.",
    )
    education: list[EducationItem] = Field(
        default_factory=list, description="Education list, extracted verbatim, never rewritten."
    )
    certifications: list[CertificationItem] = Field(
        default_factory=list,
        description="Certification list, extracted verbatim, never rewritten; empty if none.",
    )


class RefinedBullet(BaseModel):
    """One bullet after the naturalness pass, tied back to its input by `id`."""

    id: int = Field(
        description="The same id as the input bullet, so the refined text can be "
        "spliced back to the exact experience/project bullet it came from."
    )
    text: str = Field(description="The refined bullet text (verbatim original if unchanged).")


class RefinedBullets(BaseModel):
    """Structured output of the refine pass: exactly one RefinedBullet per input id."""

    bullets: list[RefinedBullet] = Field(
        default_factory=list,
        description="Refined bullets, one per input id, same ids, none added/dropped/merged.",
    )


# The six optional, toggleable/orderable resume modules. `contact` is deliberately excluded:
# it's a fixed header that always renders first, never part of the `sections` list.
SECTION_KEYS = {"summary", "education", "experience", "projects", "skills", "certifications"}
DEFAULT_SECTION_ORDER = ["summary", "education", "experience", "projects", "skills", "certifications"]


class ResumeExportRequest(BaseModel):
    """Request body for POST /api/resume/export: the resume plus which optional modules
    to render and in what order. Contact always renders first regardless of this list."""

    resume: TailoredResume
    sections: list[str] = Field(default_factory=lambda: list(DEFAULT_SECTION_ORDER))

    @field_validator("sections")
    @classmethod
    def _validate_sections(cls, value: list[str]) -> list[str]:
        unknown = [key for key in value if key not in SECTION_KEYS]
        if unknown:
            raise ValueError(f"Unknown section key(s): {unknown}")
        return value
