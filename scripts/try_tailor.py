"""Debug script to run the tailor chain directly, without going through the API."""

from app.chains.tailor import tailor_chain

SAMPLE_RESUME = """\
Jane Doe
jane.doe@example.com | (555) 123-4567 | Boston, MA
github.com/janedoe | linkedin.com/in/janedoe

EXPERIENCE

Backend Engineer, Acme Corp — Boston, MA
Jan 2022 - Present
- Built and maintained REST APIs in Python using FastAPI
- Wrote SQL queries and managed schemas in PostgreSQL
- Deployed services to AWS using Docker

Software Engineer Intern, Startup Inc — Remote
Jun 2021 - Aug 2021
- Implemented backend features for an internal admin tool
- Fixed bugs in a Django-based web application

PROJECTS

Task Tracker
- A personal project to manage daily tasks
- Built the frontend with React and the backend with Node.js
- Stored data in MongoDB

EDUCATION

Northeastern University
Bachelor of Science, Computer Science
2018 - 2022

SKILLS
Python, FastAPI, Django, PostgreSQL, React, Node.js, MongoDB, Docker, AWS, Git
"""

SAMPLE_KEYWORDS = [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Kubernetes",
    "CI/CD",
]

if __name__ == "__main__":
    result = tailor_chain.invoke(
        {"resume_text": SAMPLE_RESUME, "keywords": SAMPLE_KEYWORDS}
    )
    print(result)
