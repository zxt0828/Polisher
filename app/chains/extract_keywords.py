"""LangChain chain: JD text -> keywords."""

from langchain_anthropic import ChatAnthropic

from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.prompts.extract_keywords import EXTRACT_KEYWORDS_PROMPT
from app.schemas import Keywords

model = ChatAnthropic(
    model=ANTHROPIC_MODEL,
    api_key=ANTHROPIC_API_KEY,
    #temperature=0,#模型输出的随机性发散性，0-1之间，0表示最确定的输出，1表示最随机的输出，像提取关键词设计0就好
).with_structured_output(Keywords)

#LCEL管道，把prompt和模型组合成一个链，输入JD文本，输出关键词列表
extract_keywords_chain = EXTRACT_KEYWORDS_PROMPT | model
