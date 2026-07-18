"""LangChain chain: already-tailored bullets + keywords -> naturalness-refined bullets."""

from langchain_anthropic import ChatAnthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.prompts.refine_bullets import REFINE_BULLETS_PROMPT
from app.schemas import RefinedBullets

# Sonnet-5 (ANTHROPIC_MODEL): the naturalness pass is a light editing task, so it uses the
# cheaper/faster model rather than the Opus TAILOR_MODEL used for the first coverage pass.
model = ChatAnthropic(
    model=ANTHROPIC_MODEL,
    api_key=ANTHROPIC_API_KEY,
    # temperature omitted: passing it causes a 400 error on this model (same as tailor chain).
).with_structured_output(RefinedBullets)

# LCEL pipe: prompt -> model. Input is keywords + bullets (JSON), output is a RefinedBullets object.
refine_bullets_chain = REFINE_BULLETS_PROMPT | model
