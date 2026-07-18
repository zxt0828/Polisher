"""Node functions, each internally calling a chain from app.chains."""

from app.chains.tailor import tailor_chain
from app.graph.state import TailorState
from app.services.bullet_refiner import refine_resume_bullets


def tailor_node(state: TailorState) -> dict:
    """First pass: tailor the raw resume toward the keywords (coverage-focused, Opus)."""
    tailored = tailor_chain.invoke(
        {"resume_text": state["resume_text"], "keywords": state["keywords"]}
    )
    return {"resume": tailored}


def refine_node(state: TailorState) -> dict:
    """Second pass: smooth the tailored bullets for naturalness (Sonnet-5)."""
    refined = refine_resume_bullets(state["resume"], state["keywords"])
    return {"resume": refined}


def score_node(state: TailorState) -> dict:
    """RESERVED, not implemented yet — do not wire into the live graph.

    Will be a thin wrapper over a future scoring chain (e.g. app/chains/score.py) that
    scores the tailored resume's job fit against the keywords and returns {"score": <float>}.
    The score is meant to be surfaced to the user as job-fit feedback — flagging when the
    candidate's experience/projects genuinely lack what the role requires. Needs deeper
    design before it ships. See TAILOR_REFINE_GRAPH.md.
    """
    raise NotImplementedError("score_node is reserved for future work; not implemented yet.")
