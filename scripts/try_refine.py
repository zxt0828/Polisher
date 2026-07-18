"""Debug script to run the refine (naturalness) pass directly, without the API.

Feeds deliberately redundant / near-synonym-stuffed bullets to refine_resume_bullets
and prints a before/after diff, so you can eyeball whether the second pass collapses
the redundancy (e.g. "high-performance and high-concurrency" -> one term) while keeping
<strong> tags, metrics, and technical content intact.

Run from the project root as a module (so `app` is importable):
    .venv/bin/python -m scripts.try_refine
Needs ANTHROPIC_API_KEY in .env (this only calls the Sonnet refine chain, not WeasyPrint,
so no DYLD_LIBRARY_PATH is required).
"""

from app.schemas import Contact, ExperienceItem, ProjectItem, TailoredResume
from app.services.bullet_refiner import refine_resume_bullets

# A TailoredResume whose bullets are intentionally stuffed with repeated / near-synonym
# phrasing — the kind of awkward output the first (coverage) pass can produce.
SAMPLE_RESUME = TailoredResume(
    contact=Contact(name="Jane Doe", email="jane.doe@example.com"),
    experience=[
        ExperienceItem(
            company="Acme Corp",
            title="Backend Engineer",
            bullets=[
                "Built a high-performance and high-concurrency backend service using "
                "<strong>Go</strong>, handling scalable and scalable traffic at large scale.",
                "Designed a distributed and distributed systems architecture with "
                "<strong>Kafka</strong> and <strong>Kafka</strong> for real-time streaming.",
                "Optimized fast, high-speed, and low-latency data pipelines with "
                "<strong>Spark</strong>, improving performance and improving throughput by 40%.",
            ],
        )
    ],
    projects=[
        ProjectItem(
            name="Realtime Dashboard",
            bullets=[
                "Developed a responsive and responsive frontend with <strong>React</strong>, "
                "delivering a fast and quick user experience.",
            ],
        )
    ],
)

SAMPLE_KEYWORDS = "high-performance, distributed systems, scalable, microservices architecture, low-latency"

# Redundant phrases that should be gone after the refine pass.
EXPECTED_GONE = [
    "high-performance and high-concurrency",
    "scalable and scalable",
    "distributed and distributed",
    "kafka</strong> and <strong>kafka",
    "responsive and responsive",
]


def _flatten(resume: TailoredResume) -> list[str]:
    return [b for e in resume.experience for b in e.bullets] + [
        b for p in resume.projects for b in p.bullets
    ]


if __name__ == "__main__":
    originals = _flatten(SAMPLE_RESUME)
    print("=" * 80)
    print("BEFORE (deliberately redundant):")
    print("=" * 80)
    for i, b in enumerate(originals):
        print(f"  [{i}] {b}")

    refined = _flatten(refine_resume_bullets(SAMPLE_RESUME, SAMPLE_KEYWORDS))

    print("\n" + "=" * 80)
    print("AFTER (refine pass):")
    print("=" * 80)
    for i, (o, r) in enumerate(zip(originals, refined)):
        print(f"  [{i}] ({'changed' if o != r else 'unchanged'}) {r}")

    changed = sum(o != r for o, r in zip(originals, refined))
    print("\n" + "=" * 80)
    print(f"{len(originals)} bullets, {changed} changed")
    joined = " ".join(refined).lower()
    for phrase in EXPECTED_GONE:
        print(f"  {'STILL PRESENT' if phrase in joined else 'gone'}: {phrase!r}")
