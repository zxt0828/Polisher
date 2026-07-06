"""LangChain chain: JD text -> keywords."""

from langchain_anthropic import ChatAnthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.prompts.extract_keywords import EXTRACT_KEYWORDS_PROMPT
from app.schemas import Keywords

model = ChatAnthropic(
    model=ANTHROPIC_MODEL,
    api_key=ANTHROPIC_API_KEY,
    # temperature omitted: passing it causes a 400 error on this model.
    #temperature=0.0, which means how much randomness to introduce into the model's output. A temperature of 0.0 means the model will always choose the most likely next token, resulting in deterministic output.
).with_structured_output(Keywords)

# LCEL pipe: prompt -> model. Input is JD text, output is a Keywords object.
extract_keywords_chain = EXTRACT_KEYWORDS_PROMPT | model
