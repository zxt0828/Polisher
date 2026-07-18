"""Runs the naturalness (refine) pass over a tailored resume's bullets.

Second pass of the tailor pipeline. Deliberately narrow: it only touches
experience/project bullets. Every other field of the TailoredResume (contact,
education, skills, tech_stack, dates, ...) is physically kept out of the LLM call,
so the refine pass can never alter it.
"""

import json
import logging

from app.chains.refine_bullets import refine_bullets_chain
from app.schemas import TailoredResume

logger = logging.getLogger(__name__)


def refine_resume_bullets(resume: TailoredResume, keywords: str) -> TailoredResume:
    """Return a copy of `resume` with its bullets smoothed for naturalness.

    Flattens every experience then project bullet into an id-tagged list, sends it
    to `refine_bullets_chain`, and splices the refined text back by id. The input
    `resume` is never mutated. Defensive by design: any id the model fails to return
    keeps its original text, so bullet content is never lost.
    """
    refined = resume.model_copy(deep=True) #deep copy to avoid mutating the original resume

    # Flatten bullets into an id-tagged list, remembering where each id lives so the
    # refined text can be spliced back to the exact bullet it came from.
    flat: list[dict] = []
    index: dict[int, tuple[list[str], int]] = {}
    next_id = 0
    for section in (refined.experience, refined.projects):
        for entry in section:
            for bullet_idx, text in enumerate(entry.bullets):
                flat.append({"id": next_id, "text": text})
                index[next_id] = (entry.bullets, bullet_idx)
                next_id += 1

    # No bullets at all: nothing to refine, skip the LLM call entirely.
    if not flat:
        return refined

    # Best-effort pass: refine is an enhancement, not core to tailoring. If the LLM call
    # fails (network, rate limit, malformed output), fall back to the un-refined resume
    # (the pristine deep copy) rather than failing the whole tailor request.
    try:
        result = refine_bullets_chain.invoke(
            {"keywords": keywords, "bullets": json.dumps(flat, ensure_ascii=False)}
        )
    except Exception:
        logger.warning("Bullet refine pass failed; returning un-refined resume.", exc_info=True)
        return refined

    # Defensive splice: only overwrite bullets the model actually returned, keyed by id.
    # Any id it dropped or renumbered simply keeps its original text.
    refined_by_id = {b.id: b.text for b in result.bullets}
    for bullet_id, (bullets_list, bullet_idx) in index.items():
        if bullet_id in refined_by_id:
            bullets_list[bullet_idx] = refined_by_id[bullet_id]

    return refined
