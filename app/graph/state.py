"""LangGraph State definition, shared between nodes."""

from typing import NotRequired, TypedDict

from app.schemas import TailoredResume


class TailorState(TypedDict):
    """State threaded through the tailor graph.

    `resume_text` and `keywords` are the inputs. `resume` is produced by the tailor
    node and then overwritten by the refine node; the final graph output reads it.
    """

    resume_text: str
    keywords: str
    resume: TailoredResume
    # Reserved for a future scoring node (job-fit score). Not written or read yet;
    # NotRequired so today's tailor -> refine runs need not populate it.
    score: NotRequired[float]
