from main import _skill_match_score, app, SmartRecommendRequest, SmartJobItem
from fastapi.testclient import TestClient

client = TestClient(app)

# Test 1: Empty skills in _skill_match_score
score, matched, _, missing, breakdown = _skill_match_score(
    set(), ["python", "machine learning"], None, False
)
print("Score with empty skills:", score)
print("Breakdown:", breakdown)

# Test 2: Endpoint call with empty resume skills and empty bio
req = {
    "resume_skills": [],
    "resume_bio": "",
    "jobs": [
        {
            "id": 1,
            "title": "Data Scientist",
            "description": "Looking for data scientist",
            "skills_required": ["python", "machine learning"]
        }
    ]
}
response = client.post("/smart-recommend", json=req)
print("smart-recommend result:", response.json())
