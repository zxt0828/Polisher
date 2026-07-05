"""Pydantic models: structured output schemas and API request/response models."""

from pydantic import BaseModel, Field


class Keywords(BaseModel):
    """从职位描述(JD)中提取出的关键词列表。"""

    keywords: list[str] = Field(
        description="从JD中提取的关键技能、工具、技术栈和硬性资质关键词，不包含空泛的软素质描述。"
    )
