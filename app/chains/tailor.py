"""LangChain chain: resume text + keywords -> tailored resume."""

from langchain_anthropic import ChatAnthropic

from app.config import ANTHROPIC_API_KEY, TAILOR_MODEL
from app.prompts.tailor import TAILOR_PROMPT
from app.schemas import TailoredResume

model = ChatAnthropic(
    model=TAILOR_MODEL,
    api_key=ANTHROPIC_API_KEY,
    # temperature omitted: passing it causes a 400 error on this model.
).with_structured_output(TailoredResume)

# LCEL pipe: prompt -> model. Input is resume_text + keywords, output is a TailoredResume object.
tailor_chain = TAILOR_PROMPT | model
