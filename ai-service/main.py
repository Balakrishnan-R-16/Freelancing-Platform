"""
AI-Powered Freelancing Platform - AI Microservice
FastAPI application providing ML-based recommendations, skill gap analysis,
employer-freelancer matching, and analytics.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from collections import Counter

app = FastAPI(
    title="AI Freelance Platform - ML Service",
    description="Machine Learning microservice for job recommendations, skill gap analysis, matching, and analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ──────────────────────────────────────────────

class FreelancerData(BaseModel):
    id: int
    name: str
    skills: List[str]
    hourly_rate: float = 0.0
    rating: float = 0.0
    jobs_completed: int = 0
    bio: str = ""


class JobData(BaseModel):
    id: int
    title: str
    description: str
    skills_required: List[str]
    budget: float = 0.0


class RecommendRequest(BaseModel):
    freelancer_skills: List[str]
    freelancer_bio: str = ""
    available_jobs: List[JobData]
    top_n: int = 5


class SkillGapRequest(BaseModel):
    current_skills: List[str]
    target_job_skills: List[str]
    market_trending_skills: Optional[List[str]] = None


class MatchRequest(BaseModel):
    job: JobData
    freelancers: List[FreelancerData]
    top_n: int = 5


class AnalyticsRequest(BaseModel):
    jobs: List[JobData]
    freelancers: List[FreelancerData]


# ── AI Endpoints ─────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-microservice"}


@app.post("/recommend")
def recommend_jobs(request: RecommendRequest):
    """
    Recommend jobs based on freelancer skills using TF-IDF cosine similarity.
    Compares freelancer skill text against job descriptions and skill requirements.
    """
    if not request.available_jobs:
        return {"recommendations": [], "message": "No jobs available"}

    # Build text representations
    freelancer_text = " ".join(request.freelancer_skills) + " " + request.freelancer_bio
    job_texts = [
        f"{job.title} {job.description} {' '.join(job.skills_required)}"
        for job in request.available_jobs
    ]

    all_texts = [freelancer_text] + job_texts
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    # Compute similarity between freelancer and each job
    freelancer_vector = tfidf_matrix[0:1]
    job_vectors = tfidf_matrix[1:]
    similarities = cosine_similarity(freelancer_vector, job_vectors).flatten()

    # Also compute skill overlap score
    freelancer_skills_set = set(s.lower() for s in request.freelancer_skills)
    skill_overlap_scores = []
    for job in request.available_jobs:
        job_skills_set = set(s.lower() for s in job.skills_required)
        if job_skills_set:
            overlap = len(freelancer_skills_set & job_skills_set) / len(job_skills_set)
        else:
            overlap = 0.0
        skill_overlap_scores.append(overlap)

    # Combined score (70% content similarity + 30% skill overlap)
    combined_scores = 0.7 * similarities + 0.3 * np.array(skill_overlap_scores)
    top_indices = combined_scores.argsort()[::-1][:request.top_n]

    recommendations = []
    for idx in top_indices:
        job = request.available_jobs[idx]
        score = float(combined_scores[idx])
        if score > 0.01:  # Filter out near-zero scores
            recommendations.append({
                "job_id": job.id,
                "title": job.title,
                "match_score": round(score * 100, 1),
                "skill_overlap": round(skill_overlap_scores[idx] * 100, 1),
                "content_similarity": round(float(similarities[idx]) * 100, 1),
            })

    return {"recommendations": recommendations}


@app.post("/skill-gap")
def analyze_skill_gap(request: SkillGapRequest):
    """
    Analyze skill gaps between freelancer's current skills and target job requirements.
    Uses NLP-based fuzzy matching for skill comparison.
    """
    current = set(s.lower().strip() for s in request.current_skills)
    target = set(s.lower().strip() for s in request.target_job_skills)
    trending = set(s.lower().strip() for s in (request.market_trending_skills or []))

    # Direct gap analysis
    matching_skills = current & target
    missing_skills = target - current
    extra_skills = current - target

    # Fuzzy match for similar skills (e.g., "javascript" ~ "js")
    skill_aliases = {
        "javascript": ["js", "ecmascript"],
        "typescript": ["ts"],
        "python": ["py"],
        "react": ["reactjs", "react.js"],
        "node": ["nodejs", "node.js"],
        "vue": ["vuejs", "vue.js"],
        "angular": ["angularjs"],
        "machine learning": ["ml"],
        "artificial intelligence": ["ai"],
        "natural language processing": ["nlp"],
        "postgresql": ["postgres"],
        "mongodb": ["mongo"],
    }

    fuzzy_matches = []
    remaining_missing = set()
    for skill in missing_skills:
        matched = False
        for canonical, aliases in skill_aliases.items():
            if skill in aliases and canonical in current:
                fuzzy_matches.append({"required": skill, "you_have": canonical})
                matched = True
                break
            if skill == canonical and any(a in current for a in aliases):
                fuzzy_matches.append({"required": skill, "you_have": next(a for a in aliases if a in current)})
                matched = True
                break
        if not matched:
            remaining_missing.add(skill)

    # Skill gap score: percentage of required skills covered
    coverage = len(matching_skills) + len(fuzzy_matches)
    total_required = len(target)
    gap_score = (coverage / total_required * 100) if total_required > 0 else 100

    # Trending skills the freelancer should learn
    trending_gaps = trending - current if trending else set()

    # Priority ranking: missing skills that are also trending get higher priority
    prioritized_missing = []
    for skill in remaining_missing:
        priority = "HIGH" if skill in trending else "MEDIUM"
        prioritized_missing.append({"skill": skill, "priority": priority})
    prioritized_missing.sort(key=lambda x: 0 if x["priority"] == "HIGH" else 1)

    return {
        "coverage_percentage": round(gap_score, 1),
        "matching_skills": sorted(list(matching_skills)),
        "missing_skills": prioritized_missing,
        "fuzzy_matches": fuzzy_matches,
        "extra_skills": sorted(list(extra_skills)),
        "trending_to_learn": sorted(list(trending_gaps)),
        "recommendation": (
            "Excellent match!" if gap_score >= 80
            else "Good match with some gaps" if gap_score >= 50
            else "Significant skill gaps — consider upskilling"
        ),
    }


@app.post("/match")
def match_freelancers(request: MatchRequest):
    """
    Match freelancers to a job using multi-factor compatibility scoring.
    Factors: skill overlap (40%), experience/rating (25%), rate fit (20%), content match (15%).
    """
    if not request.freelancers:
        return {"matches": [], "message": "No freelancers available"}

    job_skills = set(s.lower() for s in request.job.skills_required)
    job_text = f"{request.job.title} {request.job.description} {' '.join(request.job.skills_required)}"

    # TF-IDF content matching
    freelancer_texts = [
        f"{f.bio} {' '.join(f.skills)}" for f in request.freelancers
    ]
    all_texts = [job_text] + freelancer_texts
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    content_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    matches = []
    for i, freelancer in enumerate(request.freelancers):
        fl_skills = set(s.lower() for s in freelancer.skills)

        # Skill overlap score (0-1)
        skill_score = len(fl_skills & job_skills) / len(job_skills) if job_skills else 0

        # Experience score (normalized rating + completion bonus)
        experience_score = (freelancer.rating / 5.0) * 0.6 + min(freelancer.jobs_completed / 50, 1.0) * 0.4

        # Rate fit score (how well rate fits budget)
        if request.job.budget > 0 and freelancer.hourly_rate > 0:
            rate_ratio = freelancer.hourly_rate / (request.job.budget / 160)  # rough monthly hours
            rate_score = max(0, 1 - abs(1 - rate_ratio))
        else:
            rate_score = 0.5

        # Content similarity
        content_score = float(content_scores[i])

        # Weighted composite score
        composite = (
            skill_score * 0.40 +
            experience_score * 0.25 +
            rate_score * 0.20 +
            content_score * 0.15
        )

        matches.append({
            "freelancer_id": freelancer.id,
            "name": freelancer.name,
            "compatibility_score": round(composite * 100, 1),
            "breakdown": {
                "skill_match": round(skill_score * 100, 1),
                "experience": round(experience_score * 100, 1),
                "rate_fit": round(rate_score * 100, 1),
                "content_relevance": round(content_score * 100, 1),
            },
            "matched_skills": sorted(list(fl_skills & job_skills)),
            "missing_skills": sorted(list(job_skills - fl_skills)),
        })

    matches.sort(key=lambda m: m["compatibility_score"], reverse=True)
    return {"matches": matches[:request.top_n]}


@app.post("/analytics")
def generate_analytics(request: AnalyticsRequest):
    """
    Generate platform analytics: skill demand, budget distribution, marketplace health metrics.
    """
    # Skill demand analysis
    all_job_skills = []
    for job in request.jobs:
        all_job_skills.extend([s.lower() for s in job.skills_required])
    skill_demand = Counter(all_job_skills).most_common(15)

    # Freelancer skill supply
    all_freelancer_skills = []
    for f in request.freelancers:
        all_freelancer_skills.extend([s.lower() for s in f.skills])
    skill_supply = Counter(all_freelancer_skills).most_common(15)

    # Compute supply-demand gap
    demand_dict = dict(skill_demand)
    supply_dict = dict(skill_supply)
    all_skills = set(demand_dict.keys()) | set(supply_dict.keys())
    supply_demand_gap = []
    for skill in all_skills:
        d = demand_dict.get(skill, 0)
        s = supply_dict.get(skill, 0)
        gap = d - s
        supply_demand_gap.append({
            "skill": skill,
            "demand": d,
            "supply": s,
            "gap": gap,
            "status": "shortage" if gap > 0 else "surplus" if gap < 0 else "balanced",
        })
    supply_demand_gap.sort(key=lambda x: x["gap"], reverse=True)

    # Budget analysis
    budgets = [j.budget for j in request.jobs if j.budget > 0]
    budget_stats = {
        "average": round(np.mean(budgets), 2) if budgets else 0,
        "median": round(float(np.median(budgets)), 2) if budgets else 0,
        "min": round(min(budgets), 2) if budgets else 0,
        "max": round(max(budgets), 2) if budgets else 0,
    }

    # Rate analysis
    rates = [f.hourly_rate for f in request.freelancers if f.hourly_rate > 0]
    rate_stats = {
        "average": round(np.mean(rates), 2) if rates else 0,
        "median": round(float(np.median(rates)), 2) if rates else 0,
        "min": round(min(rates), 2) if rates else 0,
        "max": round(max(rates), 2) if rates else 0,
    }

    # Platform summary
    avg_rating = np.mean([f.rating for f in request.freelancers if f.rating > 0]) if request.freelancers else 0

    return {
        "skill_demand": [{"skill": s, "count": c} for s, c in skill_demand],
        "skill_supply": [{"skill": s, "count": c} for s, c in skill_supply],
        "supply_demand_gap": supply_demand_gap[:10],
        "budget_analysis": budget_stats,
        "rate_analysis": rate_stats,
        "platform_summary": {
            "total_jobs": len(request.jobs),
            "total_freelancers": len(request.freelancers),
            "average_freelancer_rating": round(float(avg_rating), 2),
            "most_demanded_skill": skill_demand[0][0] if skill_demand else "N/A",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
