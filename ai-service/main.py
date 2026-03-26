"""
AI-Powered Freelancing Platform - AI Microservice
FastAPI application providing ML-based recommendations, skill gap analysis,
employer-freelancer matching, analytics, and Gemini-powered resume analysis.
"""

import os
import json
import io
import time
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from collections import Counter

# PDF parsing
try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

# Gemini AI
try:
    import google.generativeai as genai
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-flash-lite-latest")
        logging.info("Gemini AI configured successfully")
    else:
        gemini_model = None
        logging.warning("GEMINI_API_KEY not set — resume parsing will be unavailable")
except ImportError:
    gemini_model = None
    logging.warning("google-generativeai not installed")

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Freelance Platform - ML Service",
    description="Machine Learning microservice for job recommendations, skill gap analysis, matching, analytics, and Gemini-powered resume analysis",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


# ── Gemini-Powered Resume & Smart Analysis Endpoints ─────────────

def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    if PdfReader is None:
        raise HTTPException(status_code=500, detail="PyPDF2 not installed")
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()


def _call_gemini(prompt: str) -> str:
    """Call Gemini API and return text response."""
    if gemini_model is None:
        raise HTTPException(
            status_code=503,
            detail="Zyntra AI Core is temporarily unavailable. Check backend configuration."
        )
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error (attempt {attempt + 1}/{max_retries}): {e}")
            if "429" in str(e) and attempt < max_retries - 1:
                time.sleep(4 ** attempt)  # 1s, 4s backoff
                continue
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail=f"Smart Engine temporarily unavailable. Please try again. {str(e)}")


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Upload a PDF resume → Gemini extracts skills, experience, education, and summary.
    Returns structured JSON with extracted profile data.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    resume_text = _extract_pdf_text(file_bytes)
    if not resume_text or len(resume_text) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from the PDF. Make sure it's not a scanned image.")

    prompt = f"""You are an expert resume parser for a freelancing platform. Analyze the following resume text and extract structured information.

RESUME TEXT:
---
{resume_text[:8000]}
---

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{{
  "name": "Full Name",
  "title": "Professional Title (e.g. Full-Stack Developer, AI Engineer)",
  "bio": "A compelling 2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience_years": 0,
  "education": ["Degree - Institution"],
  "certifications": ["cert1", "cert2"],
  "languages": ["English", ...],
  "expertise_level": "Junior/Mid/Senior/Expert"
}}

IMPORTANT:
- Extract ALL technical skills, programming languages, frameworks, tools mentioned
- Include soft skills only if explicitly mentioned
- For the bio, write it in first person as if the freelancer is describing themselves
- Be thorough with skills — extract every technology, tool, framework mentioned
"""

    response_text = _call_gemini(prompt)

    # Parse JSON from response (handle potential markdown wrapping)
    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned.rsplit("```", 1)[0]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        parsed = json.loads(cleaned.strip())
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            raise HTTPException(status_code=500, detail="Failed to parse Zyntra AI Core response as JSON")

    # Ensure required fields exist
    result = {
        "name": parsed.get("name", "Unknown"),
        "title": parsed.get("title", "Freelancer"),
        "bio": parsed.get("bio", ""),
        "skills": parsed.get("skills", []),
        "experience_years": parsed.get("experience_years", 0),
        "education": parsed.get("education", []),
        "certifications": parsed.get("certifications", []),
        "languages": parsed.get("languages", ["English"]),
        "expertise_level": parsed.get("expertise_level", "Mid"),
        "resume_text": resume_text[:5000],  # Store truncated text for future use
    }

    return result


class SmartRecommendRequest(BaseModel):
    resume_skills: List[str]
    resume_bio: str = ""
    jobs: List[JobData]


@app.post("/smart-recommend")
def smart_recommend_jobs(request: SmartRecommendRequest):
    """
    Use Gemini to intelligently match a freelancer's resume skills against all available jobs.
    Returns ranked job recommendations with AI-generated reasoning.
    """
    if not request.jobs:
        return {"recommendations": [], "message": "No jobs available"}

    jobs_summary = ""
    for j in request.jobs[:15]:  # Limit to 15 jobs for prompt size
        skills_str = ", ".join(j.skills_required) if j.skills_required else "Not specified"
        jobs_summary += f"- Job ID {j.id}: \"{j.title}\" | Skills: [{skills_str}] | Budget: ₹{j.budget}\n  Description: {j.description[:200]}\n\n"

    prompt = f"""You are an AI career advisor for a freelancing platform. Match this freelancer with the best jobs.

FREELANCER PROFILE:
- Skills: {', '.join(request.resume_skills)}
- Bio: {request.resume_bio[:500]}

AVAILABLE JOBS:
{jobs_summary}

Return ONLY valid JSON (no markdown, no code fences) as an array of matches, ranked from best to worst fit:
[
  {{
    "job_id": 1,
    "match_score": 85,
    "matched_skills": ["React", "Node.js"],
    "missing_skills": ["Docker"],
    "reason": "Short 1-2 sentence explanation of why this is a good match"
  }}
]

Rules:
- Score from 0-100 based on skill overlap, relevance, and potential
- Include ALL jobs, even poor matches (they help the freelancer see gaps)
- Be specific about which skills match and which are missing
- Consider transferable skills (e.g., React experience helps with React Native)
"""

    response_text = _call_gemini(prompt)

    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned.rsplit("```", 1)[0]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        recommendations = json.loads(cleaned.strip())
    except json.JSONDecodeError:
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            recommendations = json.loads(json_match.group())
        else:
            recommendations = []

    # Enrich with job titles
    job_map = {j.id: j.title for j in request.jobs}
    for rec in recommendations:
        rec["title"] = job_map.get(rec.get("job_id"), "Unknown Job")

    recommendations.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return {"recommendations": recommendations}


class SmartSkillGapRequest(BaseModel):
    resume_skills: List[str]
    resume_bio: str = ""
    jobs: List[JobData]


@app.post("/smart-skill-gap")
def smart_skill_gap(request: SmartSkillGapRequest):
    """
    Use Gemini to perform deep skill gap analysis between freelancer resume and ALL job openings.
    Provides personalized learning recommendations.
    """
    if not request.jobs:
        return {"analysis": "No jobs available for comparison"}

    all_required_skills = set()
    jobs_summary = ""
    for j in request.jobs[:15]:
        skills_str = ", ".join(j.skills_required) if j.skills_required else "Not specified"
        all_required_skills.update(s.lower() for s in j.skills_required)
        jobs_summary += f"- \"{j.title}\": [{skills_str}]\n"

    prompt = f"""You are an expert career advisor analyzing skill gaps for a freelancer.

FREELANCER'S CURRENT SKILLS: {', '.join(request.resume_skills)}
FREELANCER BIO: {request.resume_bio[:500]}

JOB OPENINGS ON THE PLATFORM:
{jobs_summary}

Perform a comprehensive skill gap analysis. Return ONLY valid JSON (no markdown, no code fences):
{{
  "overall_readiness": 75,
  "strong_skills": [
    {{{{
      "skill": "React",
      "proficiency": "Advanced",
      "matching_jobs": ["Build DeFi Dashboard", "Mobile App"]
    }}}}
  ],
  "missing_skills": [
    {{{{
      "skill": "Docker",
      "priority": "HIGH",
      "why": "Required by 3 open positions",
      "learning_path": "Start with Docker basics on Docker.com, then learn Docker Compose",
      "time_to_learn": "2-3 weeks"
    }}}}
  ],
  "transferable_skills": [
    {{{{
      "have": "React",
      "can_transfer_to": "React Native",
      "gap_effort": "Low — learn mobile-specific APIs"
    }}}}
  ],
  "career_advice": "2-3 sentences of personalized career advice",
  "recommended_learning_order": ["skill1", "skill2", "skill3"]
}}

Rules:
- overall_readiness is 0-100 showing how ready they are for available jobs
- Prioritize missing skills that appear in MULTIPLE job postings
- HIGH priority = needed for 2+ jobs, MEDIUM = needed for 1 job, LOW = nice to have
- Be practical and specific with learning paths
- Consider the freelancer's existing skills when suggesting learning order
"""

    response_text = _call_gemini(prompt)

    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned.rsplit("```", 1)[0]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        analysis = json.loads(cleaned.strip())
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            raise HTTPException(status_code=500, detail="Failed to parse Zyntra AI Core skill gap response")

    return analysis


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
