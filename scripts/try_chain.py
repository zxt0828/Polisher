"""Debug script to run chains directly, without going through the API."""

from app.chains.extract_keywords import extract_keywords_chain

SAMPLE_JD = """\
We are hiring a Backend Software Engineer to join our platform team.

Responsibilities:
- Design and build scalable REST APIs using Python and FastAPI
- Write efficient SQL queries and manage schemas in PostgreSQL
- Deploy and monitor services on AWS using Docker and Kubernetes
- Collaborate closely with frontend engineers and product managers
- Be a responsible, self-motivated team player with strong ownership

Requirements:
- Bachelor's degree in Computer Science or related field
- 3+ years of professional experience with Python
- Hands-on experience with FastAPI or Django
- Familiarity with CI/CD pipelines (e.g. GitHub Actions)
- Excellent communication skills
"""

if __name__ == "__main__":
    result = extract_keywords_chain.invoke({"jd_text": SAMPLE_JD})
    print(result)
