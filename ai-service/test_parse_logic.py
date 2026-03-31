import re

text = """
Name: HEMANTH
Role: Fresher
Skills:
● C, C++
● Basic Java
● HTML
● MS Excel
"""

DERIVED_SKILLS = [
    (r"\bjava\b", ["java", "backend"]),
    (r"(?<!\w)c\+\+(?!\w)", ["c++"]),
    (r"(?<!\w)c(?!\w)", ["c"]),
    (r"\bhtml(?:5)?\b", ["html", "frontend"]),
    (r"\bcss(?:3)?\b", ["css", "frontend"]),
    (r"\bexcel\b", ["excel"]),
]

tl = text.lower()
extracted = []
for pattern, maps in DERIVED_SKILLS:
    if re.search(pattern, tl):
        for m in maps:
            if m not in extracted:
                extracted.append(m)

print("Extracted from raw text:", extracted)
