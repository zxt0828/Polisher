"""Prompt template for extracting keywords from a JD."""

from langchain_core.prompts import ChatPromptTemplate

EXTRACT_KEYWORDS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert technical recruiter. Extract keywords from the job "
            "description below that a candidate could concretely match against on a "
            "resume. Include:\n"
            "- Specific technical skills, tools, technologies, and frameworks "
            "(e.g. Python, FastAPI, Docker, PostgreSQL).\n"
            "- Important technical competencies, domains, and architectural experience, "
            "even when they are not a single named tool "
            "(e.g. distributed systems, high concurrency, microservices architecture, "
            "REST API design, system design).\n"
            "- Hard qualifications (e.g. degree requirements, years of experience, "
            "certifications).\n\n"
            "Extract as comprehensively as possible — prefer including a relevant keyword "
            "over omitting it, since the user will review and remove any they don't want.\n\n"
            "Do not include vague soft-skill phrases such as 'team player', "
            "'good communication', or 'responsible'.",
        ),
        ("human", "Job description:\n\n{jd_text}"),
    ]
)
