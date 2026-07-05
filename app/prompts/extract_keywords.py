"""Prompt template for extracting keywords from a JD."""

from langchain_core.prompts import ChatPromptTemplate

EXTRACT_KEYWORDS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert technical recruiter. Extract keywords from the job "
            "description below that a candidate could concretely match against on a "
            "resume: specific technical skills, tools, technologies, frameworks, and "
            "hard qualifications (e.g. degree requirements, years of experience, "
            "certifications).\n\n"
            "Do not include vague soft-skill phrases such as 'team player' or "
            "'responsible' — only include concrete, matchable keywords.",
        ),
        ("human", "Job description:\n\n{jd_text}"),
    ]
)
