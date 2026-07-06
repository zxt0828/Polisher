"""Debug script to run extract_keywords_chain -> tailor_chain end to end."""

import json

from app.chains.extract_keywords import extract_keywords_chain
from app.chains.tailor import tailor_chain

SAMPLE_JD = """\
We are hiring a Backend Software Engineer to join our platform team.

Responsibilities:
- Design and build scalable REST APIs using Python and FastAPI
- Write efficient SQL queries and manage schemas in PostgreSQL
- Deploy and monitor services on AWS using Docker and Kubernetes
- Collaborate closely with frontend engineers and product managers

Requirements:
- Bachelor's degree in Computer Science or related field
- 3+ years of professional experience with Python
- Hands-on experience with FastAPI or Django
- Familiarity with CI/CD pipelines (e.g. GitHub Actions)
"""

SAMPLE_RESUME = """\
John Smith
john.smith@example.com | (555) 987-6543 | Seattle, WA
github.com/johnsmith | linkedin.com/in/johnsmith

EXPERIENCE

Software Engineer, Beta Systems — Seattle, WA
Mar 2021 - Present
- Built REST APIs in Python using Django
- Designed database schemas and wrote queries in PostgreSQL
- Containerized services with Docker for local development

Junior Developer, Webly — Remote
Jul 2019 - Feb 2021
- Maintained internal tooling used by the support team
- Fixed bugs in a Flask-based web application

PROJECTS

Inventory Manager
- A small tool to track warehouse inventory
- Built the backend with Flask and the frontend with Vue.js
- Stored data in SQLite

EDUCATION

University of Washington
Bachelor of Science, Computer Science
2015 - 2019

SKILLS
Python, Django, Flask, PostgreSQL, SQLite, Vue.js, Docker, Git
"""

if __name__ == "__main__":
    keywords_result = extract_keywords_chain.invoke({"jd_text": SAMPLE_JD})

    print("=== Step 1: extracted keywords ===")
    print(keywords_result.keywords)

    tailor_result = tailor_chain.invoke(
        {"resume_text": SAMPLE_RESUME, "keywords": keywords_result.keywords}
    )

    print("\n=== Step 2: tailored resume ===")
    print(json.dumps(tailor_result.model_dump(), indent=2, ensure_ascii=False))
