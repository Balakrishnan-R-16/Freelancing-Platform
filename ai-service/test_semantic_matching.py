import requests

url = "http://localhost:8000/parse-resume"
url_match = "http://localhost:8000/intelligent-match"

# Test 1: Just the raw function call for scoring
from main import _skill_match_score, _expand_skills, _extract_implicit_skills

bio_text = "I am a frontend developer who has built APIs from scratch."
inferred = _extract_implicit_skills(bio_text)
print("Inferred from bio ('built APIs', 'frontend'):", inferred)

available_skills = ["react"] + inferred
fl_exp = _expand_skills(available_skills)

required = ["rest api", "react", "sql"]
score, matched, _, missing = _skill_match_score(fl_exp, required, None, has_project_exp=True)

print(f"Required: {required}")
print(f"Score: {score}")
print(f"Matched: {matched}")
print(f"Missing (should be SQL): {missing}")

