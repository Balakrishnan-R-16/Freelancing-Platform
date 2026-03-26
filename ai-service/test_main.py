"""
Test suite for AI Microservice endpoints.
Run with: python -m pytest test_main.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Health Check ─────────────────────────────────────────────────

def test_health_check():
    response = client.get("/health")
    assert response.status_code = = 200
    data = response.json()
    assert data["status"] == "healthy"


# ── Job Recommendations ─────────────────────────────────────────

def test_recommend_jobs():
    payload = {
        "freelancer_skills": ["Python", "React", "Machine Learning"],
        "freelancer_bio": "Full-stack developer with ML experience",
        "available_jobs": [
            {
                "id": 1,
                "title": "Build ML Pipeline",
                "description": "Create a machine learning pipeline with Python and TensorFlow",
                "skills_required": ["Python", "TensorFlow", "Machine Learning"],
                "budget": 5000,
            },
            {
                "id": 2,
                "title": "React Dashboard",
                "description": "Build a modern React dashboard with charts",
                "skills_required": ["React", "TypeScript", "Chart.js"],
                "budget": 3000,
            },
            {
                "id": 3,
                "title": "iOS Mobile App",
                "description": "Create a native iOS application using Swift",
                "skills_required": ["Swift", "iOS", "Xcode"],
                "budget": 8000,
            },
        ],
        "top_n": 3,
    }

    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    # ML Pipeline job should rank highest for this freelancer
    assert data["recommendations"][0]["job_id"] == 1


def test_recommend_empty_jobs():
    payload = {
        "freelancer_skills": ["Python"],
        "available_jobs": [],
    }
    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    assert len(response.json()["recommendations"]) == 0


# ── Skill Gap Analysis ──────────────────────────────────────────

def test_skill_gap_analysis():
    payload = {
        "current_skills": ["Python", "React", "SQL"],
        "target_job_skills": ["Python", "TensorFlow", "Docker", "React"],
        "market_trending_skills": ["TensorFlow", "Kubernetes", "Rust"],
    }

    response = client.post("/skill-gap", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "coverage_percentage" in data
    assert data["coverage_percentage"] == 50.0  # 2 out of 4 skills match
    assert "python" in data["matching_skills"]
    assert "react" in data["matching_skills"]
    assert any(s["skill"] == "tensorflow" for s in data["missing_skills"])
    assert any(s["skill"] == "docker" for s in data["missing_skills"])


def test_skill_gap_full_match():
    payload = {
        "current_skills": ["Python", "React"],
        "target_job_skills": ["Python", "React"],
    }
    response = client.post("/skill-gap", json=payload)
    data = response.json()
    assert data["coverage_percentage"] == 100.0
    assert data["recommendation"] == "Excellent match!"


# ── Freelancer Matching ─────────────────────────────────────────

def test_match_freelancers():
    payload = {
        "job": {
            "id": 1,
            "title": "Python Backend Developer",
            "description": "Build REST APIs with Python and FastAPI",
            "skills_required": ["Python", "FastAPI", "PostgreSQL"],
            "budget": 4000,
        },
        "freelancers": [
            {
                "id": 1,
                "name": "Alice",
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
                "hourly_rate": 50,
                "rating": 4.9,
                "jobs_completed": 30,
                "bio": "Python backend specialist with FastAPI expertise",
            },
            {
                "id": 2,
                "name": "Bob",
                "skills": ["Java", "Spring Boot", "MySQL"],
                "hourly_rate": 45,
                "rating": 4.5,
                "jobs_completed": 20,
                "bio": "Java enterprise developer",
            },
            {
                "id": 3,
                "name": "Carol",
                "skills": ["Python", "Django", "PostgreSQL"],
                "hourly_rate": 55,
                "rating": 4.7,
                "jobs_completed": 25,
                "bio": "Python web developer with database expertise",
            },
        ],
        "top_n": 3,
    }

    response = client.post("/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["matches"]) == 3
    # Alice should rank first (perfect skill match + high rating)
    assert data["matches"][0]["freelancer_id"] == 1
    assert data["matches"][0]["compatibility_score"] > 50


def test_match_empty_freelancers():
    payload = {
        "job": {
            "id": 1,
            "title": "Test Job",
            "description": "Test description",
            "skills_required": ["Python"],
            "budget": 1000,
        },
        "freelancers": [],
    }
    response = client.post("/match", json=payload)
    assert response.status_code == 200
    assert len(response.json()["matches"]) == 0


# ── Analytics ────────────────────────────────────────────────────

def test_analytics():
    payload = {
        "jobs": [
            {"id": 1, "title": "J1", "description": "D1", "skills_required": ["Python", "React"], "budget": 3000},
            {"id": 2, "title": "J2", "description": "D2", "skills_required": ["Python", "Docker"], "budget": 5000},
            {"id": 3, "title": "J3", "description": "D3", "skills_required": ["React", "TypeScript"], "budget": 4000},
        ],
        "freelancers": [
            {"id": 1, "name": "A", "skills": ["Python", "React"], "hourly_rate": 50, "rating": 4.5, "jobs_completed": 10},
            {"id": 2, "name": "B", "skills": ["Python", "Docker", "AWS"], "hourly_rate": 60, "rating": 4.8, "jobs_completed": 20},
        ],
    }

    response = client.post("/analytics", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "skill_demand" in data
    assert "budget_analysis" in data
    assert "platform_summary" in data
    assert data["platform_summary"]["total_jobs"] == 3
    assert data["platform_summary"]["total_freelancers"] == 2
    assert data["budget_analysis"]["average"] == 4000.0
