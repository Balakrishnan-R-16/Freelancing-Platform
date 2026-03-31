"""
Zyntra AI Microservice
FastAPI ML service: job matching, skill gap analysis, resume parsing, analytics.
"""

import io
import json
import logging
import os
import re
import time
from collections import Counter, defaultdict
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ── Optional dependencies ─────────────────────────────────────────

try:
    import spacy
except ImportError:
    spacy = None

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────

app = FastAPI(
    title="Zyntra AI Service",
    description="ML microservice for job matching, skill gap analysis, and resume parsing",
    version="3.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Skill Synonyms (normalisation + alias expansion) ─────────────

SKILL_SYNONYMS: dict[str, list[str]] = {
    # AI / ML
    "ml":                          ["machine learning", "ml"],
    "machine learning":            ["machine learning", "ml"],
    "ai":                          ["artificial intelligence", "ai"],
    "artificial intelligence":     ["artificial intelligence", "ai"],
    "nlp":                         ["natural language processing", "nlp"],
    "natural language processing": ["natural language processing", "nlp"],
    "dl":                          ["deep learning", "dl"],
    "deep learning":               ["deep learning", "dl"],
    "cv":                          ["computer vision", "cv"],
    "computer vision":             ["computer vision", "cv"],
    # Languages
    "js":                          ["javascript", "js", "ecmascript"],
    "javascript":                  ["javascript", "js", "ecmascript"],
    "ecmascript":                  ["javascript", "js", "ecmascript"],
    "html":                        ["html", "html5"],
    "html5":                       ["html", "html5"],
    "css":                         ["css", "css3"],
    "css3":                        ["css", "css3"],
    "ts":                          ["typescript", "ts"],
    "typescript":                  ["typescript", "ts"],
    "py":                          ["python", "py"],
    "python":                      ["python", "py"],
    "c":                           ["c", "c programming"],
    "cpp":                         ["c++", "cpp"],
    "c++":                         ["c++", "cpp"],
    "java":                        ["java", "core java", "advanced java", "basic java", "j2ee"],
    "excel":                       ["excel", "ms excel", "microsoft excel"],
    "csharp":                      ["c#", "csharp", ".net"],
    "c#":                          ["c#", "csharp", ".net"],
    ".net":                        ["c#", "csharp", ".net"],
    # Frontend frameworks
    "react":                       ["react", "reactjs", "react.js"],
    "reactjs":                     ["react", "reactjs", "react.js"],
    "react.js":                    ["react", "reactjs", "react.js"],
    "vue":                         ["vue", "vuejs", "vue.js"],
    "vuejs":                       ["vue", "vuejs", "vue.js"],
    "vue.js":                      ["vue", "vuejs", "vue.js"],
    "angular":                     ["angular", "angularjs"],
    "angularjs":                   ["angular", "angularjs"],
    "next":                        ["next.js", "nextjs", "next"],
    "nextjs":                      ["next.js", "nextjs", "next"],
    "next.js":                     ["next.js", "nextjs", "next"],
    "svelte":                      ["svelte", "sveltekit"],
    "sveltekit":                   ["svelte", "sveltekit"],
    # Backend frameworks
    "node":                        ["node", "nodejs", "node.js"],
    "nodejs":                      ["node", "nodejs", "node.js"],
    "node.js":                     ["node", "nodejs", "node.js"],
    "express":                     ["express", "expressjs", "express.js"],
    "expressjs":                   ["express", "expressjs", "express.js"],
    "express.js":                  ["express", "expressjs", "express.js"],
    "fastapi":                     ["fastapi", "fast api"],
    "fast api":                    ["fastapi", "fast api"],
    "django":                      ["django", "django rest framework", "drf"],
    "drf":                         ["django", "django rest framework", "drf"],
    "flask":                       ["flask"],
    "spring":                      ["spring", "spring boot", "springboot"],
    "spring boot":                 ["spring", "spring boot", "springboot"],
    "springboot":                  ["spring", "spring boot", "springboot"],
    # Databases
    "postgres":                    ["postgresql", "postgres", "psql"],
    "postgresql":                  ["postgresql", "postgres", "psql"],
    "psql":                        ["postgresql", "postgres", "psql"],
    "mongo":                       ["mongodb", "mongo"],
    "mongodb":                     ["mongodb", "mongo"],
    "mysql":                       ["mysql", "mariadb"],
    "mariadb":                     ["mysql", "mariadb"],
    "sql":                         ["sql", "mysql", "postgresql", "sqlite"],
    "sqlite":                      ["sql", "sqlite"],
    "redis":                       ["redis", "redis cache"],
    # Cloud / DevOps
    "aws":                         ["amazon web services", "aws"],
    "amazon web services":         ["amazon web services", "aws"],
    "gcp":                         ["google cloud", "gcp", "google cloud platform"],
    "google cloud":                ["google cloud", "gcp", "google cloud platform"],
    "azure":                       ["azure", "microsoft azure"],
    "k8s":                         ["kubernetes", "k8s"],
    "kubernetes":                  ["kubernetes", "k8s"],
    "docker":                      ["docker", "docker-compose", "dockerfile"],
    "docker-compose":              ["docker", "docker-compose", "dockerfile"],
    "ci/cd":                       ["ci/cd", "github actions", "jenkins", "devops"],
    "github actions":              ["ci/cd", "github actions", "devops"],
    "jenkins":                     ["ci/cd", "jenkins", "devops"],
    "devops":                      ["devops", "ci/cd"],
    # Concepts / patterns
    "rest api":                    ["rest api", "restful", "rest", "api development"],
    "restful":                     ["rest api", "restful", "rest", "api development"],
    "api development":             ["rest api", "restful", "api development"],
    "graphql":                     ["graphql"],
    "authentication":              ["authentication", "jwt", "oauth", "security"],
    "jwt":                         ["jwt", "authentication", "security"],
    "oauth":                       ["oauth", "authentication", "security"],
    "microservices":               ["microservices", "system design"],
    "system design":               ["system design", "microservices"],
    "orm":                         ["orm", "sqlalchemy", "hibernate", "prisma"],
    "sqlalchemy":                  ["orm", "sqlalchemy"],
    "hibernate":                   ["orm", "hibernate"],
    "prisma":                      ["orm", "prisma"],
    "websocket":                   ["websocket", "real-time", "socket.io"],
    "socket.io":                   ["websocket", "real-time", "socket.io"],
    "real-time":                   ["websocket", "real-time"],
    "crud":                        ["crud", "backend", "database"],
    "backend":                     ["backend"],
    "frontend":                    ["frontend"],
    "full stack":                  ["full stack", "fullstack"],
    "fullstack":                   ["full stack", "fullstack"],
    # Testing
    "unit testing":                ["unit testing", "pytest", "jest", "testing"],
    "pytest":                      ["unit testing", "pytest", "testing"],
    "jest":                        ["unit testing", "jest", "testing"],
    # Version control
    "git":                         ["git", "github", "gitlab"],
    "github":                      ["git", "github"],
    "gitlab":                      ["git", "gitlab"],
}

# ── Normalization Mapping ─────────────────────────────────────────
NORMALIZATION = {
    "react.js": "react",
    "node.js": "node",
    "js": "javascript",
    "rest api": "api",
    "api development": "api",
    "scikit-learn": "scikit-learn",
    "mongoose": "mongoose",
    "web3.js": "web3",
    "ethers.js": "ethers",
    "postman": "postman",
    "tailwind css": "tailwind",
    "jwt authentication": "jwt",
    "natural language processing": "nlp",
    "basic java": "java",
    "core java": "java",
    "ms excel": "excel"
}

GENERIC_SKILLS = {"backend", "frontend", "api", "database", "orm", "full stack", "css", "html"}

# Domain classifier — maps skill clusters to readable domain labels for UI domain bars
DOMAIN_SKILLS: dict[str, list[str]] = {
    "🌐 Web Dev":    ["react", "node", "express", "fastapi", "javascript", "typescript", "html", "css", "next", "tailwind", "graphql", "django", "flask", "spring boot"],
    "🤖 AI/ML":      ["python", "scikit-learn", "nlp", "machine learning", "tensorflow", "pandas", "numpy", "pytorch", "keras"],
    "🔗 Blockchain": ["solidity", "web3", "ethers", "blockchain", "smart contract"],
    "☁️ DevOps":     ["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "github actions", "jenkins"],
    "🗄️ Database":   ["mongodb", "postgresql", "mysql", "redis", "mongoose", "sql", "sqlite"],
    "📱 Mobile":     ["react native", "flutter", "swift", "kotlin", "android", "ios"],
}

MASTER_SKILLS_LIST = [
    "react", "fastapi", "node.js", "mongodb", "python", "typescript", 
    "scikit-learn", "mongoose", "web3.js", "ethers.js", "postman",
    "basic java", "core java", "advanced java", "java", "c++", "c",
    "ms excel", "microsoft excel", "excel",
    "machine learning", "natural language processing", "nlp",
    "express", "express.js", "spring boot", "blockchain", "solidity",
    "backend", "frontend", "database", "api", "orm", "mysql", "postgresql",
    "docker", "kubernetes", "aws", "gcp", "azure", "graphql", "tailwind css",
    "django", "flask", "html", "html5", "css", "css3"
]

def _extract_rule_based_skills(text: str) -> list[str]:
    """Scan raw text for specific exact matches from the MASTER_SKILLS_LIST."""
    found = []
    tl = text.lower()
    for skill in MASTER_SKILLS_LIST:
        if re.search(r'(?<!\w)' + re.escape(skill) + r'(?!\w)', tl) and skill not in found:
            found.append(skill)
    return found

def final_skill_filter(skills):
    cleaned = []
    for s in skills:
        s = s.lower().strip()
        if ":" in s:
            s = s.split(":")[-1]
        if len(s.split()) > 3:
            continue
        if any(word in s for word in ["reducing", "implemented", "optimized"]):
            continue
        cleaned.append(s)
    return list(set(cleaned))

# ── Skill Weights ─────────────────────────────────────────────────

SKILL_WEIGHTS: dict[str, int] = {
    # HIGH (3 points)
    "react": 3, "node": 3, "java": 3, "python": 3, "javascript": 3,
    "typescript": 3, "angular": 3, "vue": 3, "c++": 3, "c#": 3, "go": 3,
    "rust": 3, "machine learning": 3, "deep learning": 3, "spring boot": 3,
    "django": 3, "fastapi": 3, "mongodb": 3, "scikit-learn": 3, "mongoose": 3,
    "web3.js": 3, "ethers.js": 3, "blockchain": 3, "solidity": 3, "express": 3,
    # MEDIUM (2 points)
    "sql": 2, "postgresql": 2, "mysql": 2, "flask": 2, "docker": 2,
    "kubernetes": 2, "redis": 2, "git": 2, "postman": 2, "graphql": 2,
    # LOW (1 point)
    "api": 1, "backend": 1, "frontend": 1, "database": 1, "orm": 1,
    "css": 1, "html": 1, "rest api": 1, "api development": 1, "full stack": 1,
    "tailwind css": 1, "aws": 1, "gcp": 1, "azure": 1, "ci/cd": 1,
    "github actions": 1, "jenkins": 1, "sass": 1, "linux": 1,
    "agile": 1, "scrum": 1, "unit testing": 1
}

def _get_skill_weight(skill: str) -> int:
    """Return the configured weight for a skill, defaulting to MEDIUM (2)."""
    return SKILL_WEIGHTS.get(_normalise_skill(skill), 2)


# ── Derived / Implicit Skills ─────────────────────────────────────
# If these keywords appear anywhere in resume/bio text, add the mapped skills.

DERIVED_SKILLS: list[tuple[str, list[str]]] = [
    # Patterns ordered longest-first to avoid substring false matches
    (r"rest(?:ful)?\s*api|built\s*apis?", ["api", "backend"]),
    (r"rest(?:ful)?",               ["rest api"]),
    (r"trained\s*models?",          ["machine learning"]),
    (r"jwt|json\s*web\s*token",     ["jwt", "authentication"]),
    (r"oauth",                      ["oauth", "authentication"]),
    (r"database\s*queries|sql\s*query", ["sql", "database"]),
    (r"frontend\s*components?",     ["react", "frontend"]),
    (r"crud",                       ["crud", "backend"]),
    (r"middleware",                 ["backend"]),
    (r"routing",                    ["backend"]),
    (r"websocket|socket\.io",       ["websocket", "real-time"]),
    (r"graphql",                    ["graphql"]),
    (r"microservice",               ["microservices", "system design"]),
    (r"docker(?:-compose|file)?",   ["docker"]),
    (r"github\s*action|ci[/\-]cd",  ["ci/cd", "devops"]),
    (r"jenkins",                    ["ci/cd", "jenkins"]),
    (r"orm|sqlalchemy|hibernate|prisma", ["orm"]),
    (r"unit\s*test|pytest|jest|mocha",   ["unit testing"]),
    (r"redux",                      ["redux", "react"]),
    (r"tailwind",                   ["tailwind css", "css"]),
    (r"sass|scss",                  ["sass", "css"]),
    (r"responsive\s*design",        ["css", "frontend"]),
    (r"mvc",                        ["mvc", "backend"]),
    (r"agile|scrum",                ["agile", "scrum"]),
    (r"linux|bash|shell\s*script",  ["linux", "bash"]),
    (r"pandas|numpy",               ["data analysis", "python"]),
    (r"tensorflow|pytorch|keras",   ["deep learning", "machine learning"]),
    (r"spring\s*boot",              ["spring boot", "java"]),
    
    # ── Failsafe Tech Stack Keywords (In case NER completely misses a section) ──
    (r"\breact(?:\.js)?\b",         ["react", "frontend", "javascript"]),
    (r"\bnode(?:\.js)?\b",         ["node", "backend", "javascript"]),
    (r"\bexpress(?:\.js)?\b",      ["express", "backend"]),
    (r"\bmongodb\b",                ["mongodb", "database"]),
    (r"\bfastapi\b",                ["fastapi", "backend", "python"]),
    (r"\bpython\b",                 ["python"]),
    (r"\btypescript\b",             ["typescript", "frontend"]),
    (r"\bjava\b",                   ["java", "backend"]),
    (r"(?<!\w)c\+\+(?!\w)",         ["c++"]),
    (r"(?<!\w)c(?!\w)",             ["c"]),
    (r"\bhtml(?:5)?\b",             ["html", "frontend"]),
    (r"\bcss(?:3)?\b",              ["css", "frontend"]),
    (r"\bexcel\b|ms\s+excel|microsoft\s+excel", ["excel"]),
    (r"basic\s+java|core\s+java",   ["java"]),
    (r"\bmachine\s*learning\b",     ["machine learning", "ai"]),
    (r"\bnatural\s*language\s*processing|\bnlp\b", ["natural language processing", "ai"]),
    (r"\bblockchain\b",             ["blockchain", "web3"]),
    (r"\bweb3(?:\.js)?\b",          ["web3", "blockchain"]),
]

# ── Skill Categories ──────────────────────────────────────────────

SKILL_CATEGORIES: dict[str, str] = {
    # Languages
    "python": "language", "java": "language", "javascript": "language",
    "typescript": "language", "c++": "language", "c#": "language",
    "go": "language", "rust": "language", "php": "language",
    "ruby": "language", "swift": "language", "kotlin": "language",
    "c": "language", "excel": "tool",
    # Frontend
    "react": "framework", "vue": "framework", "angular": "framework",
    "next.js": "framework", "svelte": "framework", "redux": "library",
    "tailwind css": "tool", "css": "language", "html": "language",
    # Backend
    "django": "framework", "fastapi": "framework", "flask": "framework",
    "express": "framework", "spring boot": "framework", "node": "runtime",
    # Databases
    "mysql": "database", "postgresql": "database", "mongodb": "database",
    "sqlite": "database", "redis": "database", "sql": "concept",
    # Cloud
    "aws": "cloud", "gcp": "cloud", "azure": "cloud",
    # DevOps
    "docker": "tool", "kubernetes": "tool", "ci/cd": "concept",
    "github actions": "tool", "jenkins": "tool", "linux": "tool",
    "git": "tool", "bash": "tool",
    # AI/ML
    "machine learning": "concept", "deep learning": "concept",
    "natural language processing": "concept", "computer vision": "concept",
    # Concepts
    "rest api": "concept", "graphql": "concept", "orm": "concept",
    "authentication": "concept", "jwt": "concept", "oauth": "concept",
    "microservices": "concept", "system design": "concept",
    "crud": "concept", "backend": "concept", "frontend": "concept",
    "websocket": "concept", "real-time": "concept",
    "unit testing": "concept", "agile": "concept", "scrum": "concept",
}

# ── Pydantic Models ───────────────────────────────────────────────

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

class NerParseRequest(BaseModel):
    text: str

class IntelligentJobData(BaseModel):
    id: int
    title: str
    description: str
    skills_required: List[str]
    skills_preferred: Optional[List[str]] = None
    experience_required: Optional[int] = 0

class IntelligentFreelancerData(BaseModel):
    id: int
    name: str
    resume_text: Optional[str] = ""
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = 0
    education: Optional[List[str]] = None
    certifications: Optional[List[str]] = None

class IntelligentMatchRequest(BaseModel):
    freelancer: Optional[IntelligentFreelancerData] = None
    freelancers: Optional[List[IntelligentFreelancerData]] = None
    jobs: List[IntelligentJobData]
    top_n: int = 5

# ── Shared Helpers ────────────────────────────────────────────────

def _tfidf_similarity(query: str, docs: list[str]) -> np.ndarray:
    if not any((query + "".join(docs)).strip()):
        return np.zeros(len(docs))
    vect = TfidfVectorizer(stop_words="english", max_features=5000)
    m = vect.fit_transform([query] + docs)
    return cosine_similarity(m[0:1], m[1:]).flatten()

def _stats(vals: list[float]) -> dict:
    if not vals:
        return {"average": 0, "median": 0, "min": 0, "max": 0}
    return {
        "average": round(float(np.mean(vals)), 2),
        "median":  round(float(np.median(vals)), 2),
        "min":     round(float(min(vals)), 2),
        "max":     round(float(max(vals)), 2),
    }

def _normalise_skill(raw: str) -> str:
    """Lower-case, strip whitespace, unify common suffix variants."""
    s = raw.lower().strip()
    s = NORMALIZATION.get(s, s)
    # Strip trailing '.js' only when what remains is a known framework
    _js_strip = {"react", "vue", "next", "svelte", "express", "node"}
    if s.endswith(".js") and s[:-3] in _js_strip:
        s = s[:-3]
    # Handle numbers for html and css
    if s == "html5": return "html"
    if s == "css3": return "css"
    if s == "js": return "javascript"
    return NORMALIZATION.get(s, s)

def _expand_skills(skills: list[str]) -> set[str]:
    # Apply inference
    if "react" in skills or any(s.lower() == "react" for s in skills):
        skills += ["javascript", "html", "css"]

    out: set[str] = set()
    for s in skills:
        k = _normalise_skill(s)
        out.add(k)
        for canonical, aliases in SKILL_SYNONYMS.items():
            if k == canonical or k in aliases:
                out.add(canonical)
                out.update(aliases)
    return out

def _extract_implicit_skills(text: str) -> list[str]:
    """Scan raw text for keyword patterns and return implied skill strings."""
    found: set[str] = set()
    tl = text.lower()
    for pattern, mapped in DERIVED_SKILLS:
        if re.search(pattern, tl):
            found.update(mapped)
    return sorted(found)

def _score_skill_weights(text: str, skills: list[str]) -> dict[str, int]:
    """
    Count how many times each skill (or its aliases) appears in *text*.
    Returns {skill: weight} where weight ∈ {1, 2, 3}.
    """
    tl = text.lower()
    weights: dict[str, int] = {}
    for skill in skills:
        k = _normalise_skill(skill)
        aliases = SKILL_SYNONYMS.get(k, [k])
        count = sum(len(re.findall(r'\b' + re.escape(a) + r'\b', tl)) for a in aliases)
        weights[skill] = 3 if count >= 4 else 2 if count >= 2 else 1
    return weights

def _get_skill_domain(skill: str) -> str:
    """Helper to find which domain a normalized skill belongs to."""
    sn = _normalise_skill(skill)
    for dom, sks in DOMAIN_SKILLS.items():
        if sn in sks:
            return dom
    return "Unknown"

def _skill_match_score(
    fl_exp: set[str], required: list[str], preferred: Optional[list[str]] = None, has_project_exp: bool = False
) -> tuple[float, list[str], list[str], list[str], dict[str, float]]:
    """Calculates weighted skill match score using 4-factor V2 AI Engine."""
    matched_req = []
    missing_req = []
    
    total_req_weight = 0.0
    matched_req_weight = 0.0
    
    # 1. Direct Skill Match (0.5) & Skill Weight Score (0.15)
    for req in required:
        req_norm = NORMALIZATION.get(req.lower(), req.lower())
        w = _get_skill_weight(req)
        total_req_weight += w
        
        is_matched = any(a in fl_exp for a in SKILL_SYNONYMS.get(req_norm, [req_norm]))
        if is_matched:
            matched_req.append(req)
            matched_req_weight += w
        else:
            missing_req.append(req)

    # 2. Domain Similarity (0.20)
    # Scales proportionally based on how many skills the FL has in the required domains vs how many are required
    req_domains_skills = {}
    for r in required:
        dom = _get_skill_domain(r)
        if dom != "Unknown":
            req_domains_skills.setdefault(dom, []).append(r)
            
    if req_domains_skills:
        d_scores = []
        for dom, r_skills in req_domains_skills.items():
            fl_in_dom = sum(1 for s in fl_exp if _get_skill_domain(s) == dom)
            d_scores.append(min(fl_in_dom / len(r_skills), 1.0))
        domain_sim = sum(d_scores) / len(d_scores)
    else:
        # If no domains are strictly defined for this job, baseline it via direct match
        domain_sim = (len(matched_req) / len(required)) if required else 1.0

    # 3. Transferable Skills (0.15)
    # How many missing required skills does the freelancer have a domain-equivalent for?
    # Ensure a skill cannot act as BOTH a direct match and a transferable substitute.
    transferable_count = 0
    if missing_req:
        # Available skills are those not already consumed as a direct match
        matched_canonical = set()
        for mr in matched_req:
            mr_norm = NORMALIZATION.get(mr.lower(), mr.lower())
            matched_canonical.update(SKILL_SYNONYMS.get(mr_norm, [mr_norm]))
        
        available_transferable = [s for s in fl_exp if s not in matched_canonical]
        
        for miss in missing_req:
            m_dom = _get_skill_domain(miss)
            if m_dom != "Unknown":
                # Find an available skill in the matching domain to act as substitute
                for av in available_transferable:
                    if _get_skill_domain(av) == m_dom:
                        transferable_count += 1
                        available_transferable.remove(av)  # Consume the substitute
                        break
        transferable_score = transferable_count / len(missing_req)
    else:
        transferable_score = 1.0

    # Base Metrics
    direct_match_ratio = (len(matched_req) / len(required)) if required else 1.0
    skill_weight_ratio = (matched_req_weight / total_req_weight) if total_req_weight > 0 else 1.0

    # 4-Factor Formula
    raw_score = (
        (0.50 * direct_match_ratio) + 
        (0.20 * domain_sim) + 
        (0.15 * transferable_score) + 
        (0.15 * skill_weight_ratio)
    )

    # STRICT ZERO LOGIC & REMOVE FAKE SCORE FLOOR
    if direct_match_ratio == 0 and domain_sim == 0 and transferable_score == 0:
        final_score = 0.0
    else:
        final_score = raw_score * 100.0 if required else 100.0

    # Generic Job Penalty (if job has very few skills, reduce score slightly so it doesn't dominate)
    if len(required) <= 2:
        final_score *= 0.85
        
    final_score = max(0.0, min(final_score, 100.0))

    matched_pref = []
    for pref in (preferred or []):
        pref_norm = NORMALIZATION.get(pref.lower(), pref.lower())
        if any(a in fl_exp for a in SKILL_SYNONYMS.get(pref_norm, [pref_norm])):
            matched_pref.append(pref)

    missing_display = [r for r in missing_req if NORMALIZATION.get(r.lower(), r.lower()) not in GENERIC_SKILLS]

    breakdown = {
        "direct": round(direct_match_ratio * 100),
        "domain": round(domain_sim * 100),
        "transferable": round(transferable_score * 100),
        "weight": round(skill_weight_ratio * 100)
    }

    return round(final_score, 1), matched_req, matched_pref, missing_display, breakdown

# ── NER Model (lazy singleton) ────────────────────────────────────

_ner_model = None
_NER_MAP: dict[str, str] = {
    "Name": "name", "Skills": "skills", "Designation": "designations",
    "Companies worked at": "companies", "College Name": "colleges",
    "Degree": "degrees", "Graduation Year": "graduation_years",
    "Location": "locations", "Email Address": "emails",
    "Years of Experience": "experience",
}

def get_ner_model():
    global _ner_model
    if _ner_model is None and spacy is not None:
        path = os.path.join(os.path.dirname(__file__), "ner_model")
        if os.path.exists(path):
            try:
                _ner_model = spacy.load(path)
                logger.info("NER model loaded from %s", path)
            except Exception as e:
                logger.error("NER load failed: %s", e)
        else:
            logger.warning("NER model not found at %s", path)
    return _ner_model

# ═══════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "healthy", "service": "zyntra-ai", "version": "3.0.0"}


@app.post("/recommend")
def recommend_jobs(req: RecommendRequest):
    """Job recommendations via TF-IDF (70%) + skill overlap (30%)."""
    if not req.available_jobs:
        return {"recommendations": []}

    # Extract additional skills from bio using NER if available
    freelancer_skills = list(req.freelancer_skills)
    nlp = get_ner_model()
    if nlp and req.freelancer_bio:
        for ent in nlp(req.freelancer_bio).ents:
            if ent.label_.lower() in ["skills", "skill"] and (t := ent.text.strip()) and t not in freelancer_skills:
                freelancer_skills.append(t)

    freelancer_text = " ".join(freelancer_skills) + " " + req.freelancer_bio
    job_texts = [f"{j.title} {j.description} {' '.join(j.skills_required)}" for j in req.available_jobs]
    sim = _tfidf_similarity(freelancer_text, job_texts)
    
    # Calculate implicit skills
    inferred_skills = _extract_implicit_skills(freelancer_text)
    for imp in inferred_skills:
        if imp not in freelancer_skills:
            freelancer_skills.append(imp)
            
    fl_exp = _expand_skills(freelancer_skills)
    has_project_exp = bool(req.freelancer_bio and len(req.freelancer_bio) > 50)

    recommendations = []
    for i, job in enumerate(req.available_jobs):
        score, matched, _, missing, breakdown = _skill_match_score(
            fl_exp, job.skills_required, None, has_project_exp=has_project_exp
        )
        # Blend semantic similarity into the weighted skill score
        final_score = min(100.0, score * 0.8 + float(sim[i]) * 100 * 0.2)
        
        if final_score >= 10.0:
            recommendations.append({
                "job_id":              job.id,
                "title":               job.title,
                "match_score":         round(final_score, 1),
                "matched_skills":      matched,
                "missing_skills":      missing,
                "inferred_skills":     inferred_skills,
                "content_similarity":  round(float(sim[i]) * 100, 1),
                "reason":              f"Matched {len(matched)} required skills.",
                "breakdown":           breakdown
            })

    recommendations.sort(key=lambda x: x["match_score"], reverse=True)
    return {"recommendations": recommendations[: req.top_n]}


@app.post("/skill-gap")
def skill_gap(req: SkillGapRequest):
    """Synonym-aware skill gap analysis with trending prioritisation."""
    current  = {s.lower().strip() for s in req.current_skills}
    target   = {s.lower().strip() for s in req.target_job_skills}
    trending = {s.lower().strip() for s in (req.market_trending_skills or [])}

    matching = current & target
    missing  = target - current
    extra    = current - target

    fuzzy, remaining = [], set()
    for skill in missing:
        found = False
        for canonical, aliases in SKILL_SYNONYMS.items():
            if skill in aliases and canonical in current:
                fuzzy.append({"required": skill, "you_have": canonical}); found = True; break
            if skill == canonical and any(a in current for a in aliases):
                fuzzy.append({"required": skill, "you_have": next(a for a in aliases if a in current)})
                found = True; break
        if not found:
            remaining.add(skill)

    coverage  = (len(matching) + len(fuzzy)) / max(len(target), 1) * 100
    # Filter generic/noise skills from the missing list — they inflate gaps artificially
    gap_items = sorted(
        [{"skill": s, "priority": "HIGH" if s in trending else "LOW" if s in GENERIC_SKILLS else "MEDIUM"}
         for s in remaining if s not in GENERIC_SKILLS],
        key=lambda x: x["priority"],
    )
    return {
        "coverage_percentage": round(coverage, 1),
        "matching_skills":     sorted(matching),
        "missing_skills":      gap_items,
        "fuzzy_matches":       fuzzy,
        "extra_skills":        sorted(extra),
        "trending_to_learn":   sorted(trending - current),
        "recommendation": (
            "Excellent match!" if coverage >= 80
            else "Good match with some gaps" if coverage >= 50
            else "Significant skill gaps — consider upskilling"
        ),
    }


@app.post("/match")
def match_freelancers(req: MatchRequest):
    """Match freelancers to a job. Scoring: skills 40%, experience 25%, rate 20%, TF-IDF 15%."""
    if not req.freelancers:
        return {"matches": []}

    job_skills = {s.lower() for s in req.job.skills_required}
    job_text   = f"{req.job.title} {req.job.description} {' '.join(req.job.skills_required)}"
    
    nlp = get_ner_model()
    
    # Pre-process freelancers to extract additional skills from bio
    fl_processed_skills = []
    fl_texts = []
    for f in req.freelancers:
        skills = list(f.skills)
        if nlp and f.bio:
            for ent in nlp(f.bio).ents:
                if ent.label_.lower() in ["skills", "skill"] and (t := ent.text.strip()) and t not in skills:
                    skills.append(t)
        fl_processed_skills.append(skills)
        fl_texts.append(f"{f.bio} {' '.join(skills)}")

    content = _tfidf_similarity(job_text, fl_texts)

    matches = []
    for i, fl in enumerate(req.freelancers):
        # Extract implicit skills from bio
        inferred = _extract_implicit_skills(fl.bio)
        combined_skills = list(fl_processed_skills[i])
        for imp in inferred:
            if imp not in combined_skills:
                combined_skills.append(imp)
                
        fl_exp = _expand_skills(combined_skills)
        has_project_exp = fl.jobs_completed > 0 or (fl.bio and len(fl.bio) > 50)
        
        # Calculate weighted skill score
        sk_score, matched, _, missing, breakdown = _skill_match_score(
            fl_exp, req.job.skills_required, None, has_project_exp=bool(has_project_exp)
        )
        
        exp    = (fl.rating / 5.0) * 0.6 + min(fl.jobs_completed / 50, 1.0) * 0.4
        rate   = max(0.0, 1 - abs(1 - fl.hourly_rate / max(req.job.budget / 160, 1))) if req.job.budget > 0 and fl.hourly_rate > 0 else 0.5
        
        # ── V2 AI Engine Implementation (Rank primarily on Skill + Semantic Context)
        # Drop legacy rate/exp dilution to prevent false positives and suppressed scores
        score  = round((sk_score * 0.85) + (float(content[i]) * 100 * 0.15), 1)
        
        if score >= 10.0:
            matches.append({
                "freelancer_id":       fl.id,
                "name":                fl.name,
                "compatibility_score": score,
                "breakdown": {
                    "skill_match":       sk_score,
                    "semantic_context":  round(float(content[i]) * 100, 1),
                    **breakdown # Merge the 4-factor V2 skill breakdown (Match, Domain, Transferable, Weight)
                },
                "matched_skills": matched,
                "missing_skills": missing,
                "inferred_skills": inferred,
            })

    matches.sort(key=lambda m: m["compatibility_score"], reverse=True)
    return {"matches": matches[: req.top_n]}


@app.post("/analytics")
def analytics(req: AnalyticsRequest):
    """Platform analytics: skill demand/supply, budget, rate, and summary."""
    demand = Counter(s.lower() for j in req.jobs for s in j.skills_required)
    supply = Counter(s.lower() for f in req.freelancers for s in f.skills)
    top_demand = demand.most_common(15)
    top_supply = supply.most_common(15)

    gap = sorted([
        {"skill": s, "demand": demand.get(s, 0), "supply": supply.get(s, 0),
         "gap": demand.get(s, 0) - supply.get(s, 0),
         "status": "shortage" if demand.get(s, 0) > supply.get(s, 0)
                   else "surplus" if supply.get(s, 0) > demand.get(s, 0) else "balanced"}
        for s in set(demand) | set(supply)
    ], key=lambda x: x["gap"], reverse=True)

    ratings = [f.rating for f in req.freelancers if f.rating > 0]
    return {
        "skill_demand":      [{"skill": s, "count": c} for s, c in top_demand],
        "skill_supply":      [{"skill": s, "count": c} for s, c in top_supply],
        "supply_demand_gap": gap[:10],
        "budget_analysis":   _stats([j.budget for j in req.jobs if j.budget > 0]),
        "rate_analysis":     _stats([f.hourly_rate for f in req.freelancers if f.hourly_rate > 0]),
        "platform_summary": {
            "total_jobs":                len(req.jobs),
            "total_freelancers":         len(req.freelancers),
            "average_freelancer_rating": round(float(np.mean(ratings)), 2) if ratings else 0,
            "most_demanded_skill":       top_demand[0][0] if top_demand else "N/A",
        },
    }


@app.post("/ner-parse")
def ner_parse(req: NerParseRequest):
    """Extract structured entities from raw resume text using the trained NER model."""
    nlp = get_ner_model()
    if nlp is None:
        raise HTTPException(503, "NER model unavailable — ensure ner_model/ exists")
    result: dict[str, list] = defaultdict(list)
    for ent in nlp(req.text).ents:
        key = _NER_MAP.get(ent.label_, ent.label_.lower().replace(" ", "_"))
        t   = ent.text.strip()
        if t and t not in result[key]:
            result[key].append(t)
    return dict(result)


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """Upload a PDF → NER extracts structured profile data."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")
    if PdfReader is None:
        raise HTTPException(500, "PyPDF2 not installed")

    reader = PdfReader(io.BytesIO(data))
    text   = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
    text   = text.replace("test- ing", "testing")
    if len(text) < 50:
        raise HTTPException(400, "Could not extract text — ensure PDF is not a scanned image")

    nlp = get_ner_model()
    if nlp is None:
        raise HTTPException(503, "NER model unavailable — cannot parse resume")

    # Extract entities from NER
    entities: dict[str, list[str]] = defaultdict(list)
    for ent in nlp(text).ents:
        key = _NER_MAP.get(ent.label_, ent.label_.lower().replace(" ", "_"))
        t   = ent.text.strip()
        if not t: continue
        
        # Aggressive split: NER often groups comma-separated skills into one entity
        if key == "skills" and any(c in t for c in [",", "•", ";", "|", "\n"]):
            for part in re.split(r'[,;•\n\|]', t):
                part = part.strip()
                # Clean up leading/trailing characters like * or -
                part = re.sub(r'^[\*\-\s]+|[\*\-\s]+$', '', part)
                if len(part) >= 2 and len(part.split()) <= 4 and part not in entities[key]:
                    entities[key].append(part)
        elif t not in entities[key]:
            t = re.sub(r'^[\*\-\s]+|[\*\-\s]+$', '', t)
            entities[key].append(t)

    # Normalise NER skills and add implicit skills from the full resume text.
    # CRITICAL FIX: Validate NER extractions by demanding they literally exist in the raw text to block Spacy hallucinations!
    raw_skills: list[str] = [s for s in entities.get("skills", []) if s.lower() in text.lower()]
    normalised: list[str] = []
    seen: set[str] = set()
    for s in raw_skills:
        # Ignore giant blob strings that slipped through (over 40 chars are rarely single skills)
        if len(s) > 40: continue
        n = _normalise_skill(s)
        if n not in seen:
            seen.add(n)
            normalised.append(n)

    # Supplement with implicit (semantic) skills derived from text patterns
    for imp in _extract_implicit_skills(text):
        if imp not in seen:
            seen.add(imp)
            normalised.append(imp)

    # Supplement with rule-based absolute matches (failsafe extraction strategy)
    for rulesk in _extract_rule_based_skills(text):
        n = _normalise_skill(rulesk)
        if n not in seen:
            seen.add(n)
            normalised.append(n)
            
    # Apply normalization and final filter
    normalised = [NORMALIZATION.get(s.lower(), s.lower()) for s in normalised]
    normalised = final_skill_filter(normalised)
    
    # Apply inference
    if "react" in normalised:
        for extra in ["javascript", "html", "css"]:
            if extra not in normalised:
                normalised.append(extra)
                
    # Sort Core Skills first (by weight decreasing)
    normalised.sort(key=lambda s: _get_skill_weight(s), reverse=True)
    
    # Smart skill pruning: only drop pure GENERIC/NOISE words (backend, frontend, api, orm)
    # when we already have 5+ solid concrete skills. Never drop real skills like html/excel/java.
    NOISE_ONLY_SKILLS = {"backend", "frontend", "api", "database", "orm", "full stack"}
    core_skills = [s for s in normalised if s not in NOISE_ONLY_SKILLS]
    noise_skills = [s for s in normalised if s in NOISE_ONLY_SKILLS]
    
    # Re-assemble: concrete skills first, then noise only if we don't have many skills
    if len(core_skills) >= 5:
        normalised = core_skills  # Drop noise-only generic terms, keep everything concrete
    else:
        normalised = core_skills + noise_skills  # Keep noise too for sparse resumes
        
    # Limit to 15 maximum to strictly prevent UI/Profile bloat
    normalised = normalised[:15]

    # Compute skill weights (frequency in resume text)
    weights = _score_skill_weights(text, normalised)

    # Build skill_categories map for the response
    skill_categories = {
        s: SKILL_CATEGORIES.get(s, SKILL_CATEGORIES.get(_normalise_skill(s), "other"))
        for s in normalised
    }

    # Build response
    name  = entities.get("name", ["Unknown"])[0] if entities.get("name") else "Unknown"
    
    # Fallback: Top-of-resume regex for unknown names (stripping markdown)
    # Handles Title Case ("Balakrishnan R"), ALL CAPS ("BALAKRISHNAN R"), and single-initial surnames
    if name == "Unknown":
        for line in text.split('\n')[:10]:
            line = line.replace('*', '').replace('#', '').replace('_', '').strip()
            words = line.split()
            if 2 <= len(words) <= 3:
                # Match all-caps names (e.g. BALAKRISHNAN R) or title-case names (e.g. John Doe)
                if re.match(r"^[A-Z][A-Z\.\-']+(?:\s+[A-Z][A-Z\.\-']*)+$", line) or \
                   re.match(r"^[A-Z][a-zA-Z\.\-']+(?:\s+[A-Z][a-zA-Z\.\-']*)+$", line):
                    name = line.title()
                    break
    title = entities.get("designations", ["Freelancer"])[0] if entities.get("designations") else "Freelancer"

    # Generate a simple bio from extracted data
    bio_parts = []
    if title != "Freelancer":
        bio_parts.append(f"Experienced {title}")
    if entities.get("experience"):
        bio_parts.append(f"with {entities['experience'][0]} of experience")
    top3 = [s for s in normalised if skill_categories.get(s) in ("language", "framework")][:3]
    if top3:
        bio_parts.append(f"specialising in {', '.join(top3)}")
    bio = " ".join(bio_parts) + "." if bio_parts else ""

    # Parse experience years heuristically
    exp_years = 0
    if entities.get("experience"):
        m = re.search(r"(\d+)", entities["experience"][0])
        if m:
            exp_years = int(m.group(1))

    # Combine college and degree for education
    education = []
    colleges = entities.get("colleges", [])
    degrees  = entities.get("degrees", [])
    for i in range(max(len(colleges), len(degrees))):
        c = colleges[i] if i < len(colleges) else ""
        d = degrees[i]  if i < len(degrees)  else ""
        if c and d:   education.append(f"{d} from {c}")
        elif c:       education.append(c)
        elif d:       education.append(d)

    return {
        "name":             name,
        "title":            title,
        "bio":              bio,
        "skills":           normalised,
        "skill_categories": skill_categories,
        "skill_weights":    weights,
        "experience_years": exp_years,
        "education":        education,
        "certifications":   [],
        "languages":        ["English"],
        "expertise_level":  "Senior" if exp_years >= 5 else "Mid" if exp_years >= 2 else "Junior",
        "resume_text":      text[:5000],
    }


@app.post("/intelligent-match")
def intelligent_match(req: IntelligentMatchRequest):
    """
    Unified matching endpoint:
    - Job recommendations for freelancer  (NER + TF-IDF + synonym matching)
    - Skill gap analysis                  (aggregated across all jobs)
    - Freelancer rankings for recruiter   (per-job ranked candidates)
    Scoring: 60% skill match + 30% semantic + 10% experience.
    """
    nlp = get_ner_model()

    def _extract(fl: IntelligentFreelancerData) -> list[str]:
        skills = list(fl.skills or [])
        if fl.resume_text:
            if nlp:
                for ent in nlp(fl.resume_text).ents:
                    if ent.label_.lower() in ["skills", "skill"] and (t := ent.text.strip()) and t not in skills:
                        skills.append(t)
            for rulesk in _extract_rule_based_skills(fl.resume_text):
                if rulesk not in skills:
                    skills.append(rulesk)
            for impsk in _extract_implicit_skills(fl.resume_text):
                if impsk not in skills:
                    skills.append(impsk)
        return skills

    def _score(fl: IntelligentFreelancerData, job: IntelligentJobData, job_text: str):
        fl_skills   = _extract(fl)
        fl_exp      = _expand_skills(fl_skills)
        resume_text = fl.resume_text or " ".join(fl_skills)
        
        has_project_exp = bool(fl.experience_years and fl.experience_years > 0)
        sk_score, m_req, m_pref, missing, breakdown = _skill_match_score(
            fl_exp, job.skills_required, job.skills_preferred, has_project_exp=has_project_exp
        )
        
        # tf-idf is usually 0.05-0.2 for short vs long texts, multiply by 3 to scale it
        sem   = min(float(_tfidf_similarity(resume_text, [job_text])[0]) * 3.0, 1.0) * 100
        exp_f = min((fl.experience_years or 0) / max(job.experience_required or 1, 1), 1.5) * 10
        
        # sk_score is out of 100, sem is out of 100, exp_f is out of 15. scale to total 100 max
        final = max(0.0, min(100.0, round(sk_score * 0.70 + sem * 0.20 + exp_f, 1)))
        return final, sorted(set(m_req + m_pref)), sorted(set(missing)), breakdown

    result: dict = {
        "job_recommendations":        [],
        "skill_gap_analysis":         {"missing_skills": [], "recommended_skills_to_learn": []},
        "freelancer_recommendations": [],
    }

    if req.freelancer:
        fl        = req.freelancer
        fl_exp    = _expand_skills(_extract(fl))
        recs, all_missing = [], []
        for job in req.jobs:
            jt = f"{job.title} {job.description} {' '.join(job.skills_required)}"
            score, matched, missing, breakdown = _score(fl, job, jt)
            
            if score >= 10.0:
                all_missing.extend(missing)
                recs.append({"job_title": job.title, "job_id": job.id,
                             "match_score": f"{score}%", "matched_skills": matched, "missing_skills": missing, "breakdown": breakdown})
        recs.sort(key=lambda x: float(x["match_score"].rstrip("%")), reverse=True)
        result["job_recommendations"] = recs[: req.top_n]
        counts  = Counter(all_missing)
        top_m   = sorted(counts, key=counts.__getitem__, reverse=True)
        result["skill_gap_analysis"] = {
            "missing_skills":              top_m[:15],
            "recommended_skills_to_learn": [s for s in top_m if s.lower() not in fl_exp][:10],
        }

    if req.freelancers:
        per_job = []
        for job in req.jobs:
            jt = f"{job.title} {job.description} {' '.join(job.skills_required)}"
            ranked = []
            for fl in req.freelancers:
                score, matched, missing, breakdown = _score(fl, job, jt)
                ranked.append({"freelancer_id": fl.id, "name": fl.name,
                               "match_score": f"{score}%", "matched_skills": matched, "missing_skills": missing, "breakdown": breakdown})
            ranked.sort(key=lambda x: float(x["match_score"].rstrip("%")), reverse=True)
            per_job.append({"job_id": job.id, "job_title": job.title, "top_candidates": ranked[: req.top_n]})
        result["freelancer_recommendations"] = per_job

    return result


# ── Smart-AI replacement models ───────────────────────────────────

class SmartJobItem(BaseModel):
    id: int
    title: str
    description: str
    skills_required: List[str]
    budget: float = 0.0

class SmartRecommendRequest(BaseModel):
    resume_skills: List[str]
    resume_bio: str = ""
    jobs: List[SmartJobItem]
    top_n: int = 50

class SmartSkillGapRequest(BaseModel):
    resume_skills: List[str]
    resume_bio: str = ""
    jobs: List[SmartJobItem]


@app.post("/smart-recommend")
def smart_recommend(req: SmartRecommendRequest):
    """
    Replaces the legacy Gemini /smart-recommend endpoint.
    Uses TF-IDF + skill-overlap, returns the shape FreelancerDashboard.jsx expects.
    """
    if not req.jobs:
        return {"recommendations": []}

    nlp = get_ner_model()

    # Fix 1: normalise AND expand canonicals into skills list
    skills: list[str] = []
    seen_s: set[str] = set()
    
    # Apply filtering and normalization mapped strictly per user specs
    raw_skills = final_skill_filter(req.resume_skills)
    normalized_skills = [NORMALIZATION.get(s.lower(), s.lower()) for s in raw_skills]
    
    for s in normalized_skills:
        n = _normalise_skill(s)
        if n not in seen_s:
            seen_s.add(n)
            skills.append(n)
        # also add every canonical that n belongs to
        for canonical, aliases in SKILL_SYNONYMS.items():
            if n == canonical or n in aliases:
                if canonical not in seen_s:
                    seen_s.add(canonical)
                    skills.append(canonical)

    if nlp and req.resume_bio:
        for ent in nlp(req.resume_bio).ents:
            if ent.label_.lower() in ["skills", "skill"] and (t := ent.text.strip()):
                n = _normalise_skill(t)
                if n not in seen_s:
                    seen_s.add(n)
                    skills.append(n)

    # Also pull implicit skills from bio text
    inferred = _extract_implicit_skills(req.resume_bio)
    for imp in inferred:
        if imp not in seen_s:
            seen_s.add(imp)
            skills.append(imp)

    fl_exp  = _expand_skills(skills)
    fl_text = " ".join(skills) + " " + req.resume_bio
    job_texts = [f"{j.title} {j.description} {' '.join(j.skills_required)}" for j in req.jobs]
    sim = _tfidf_similarity(fl_text, job_texts)

    logger.info("smart-recommend | normalised skills: %s", skills[:20])
    logger.info("smart-recommend | expanded set size: %d", len(fl_exp))
    
    has_project_exp = bool(req.resume_bio and len(req.resume_bio) > 50)

    results = []
    for i, job in enumerate(req.jobs):
        # Normalise job skills the same way
        req_skills = [_normalise_skill(s) for s in job.skills_required]
        
        sk_score, matched, _, missing, breakdown = _skill_match_score(
            fl_exp, req_skills, None, has_project_exp=has_project_exp
        )
        
        # tf-idf is usually 0.05-0.2 for short vs long texts, multiply by 3 to scale it
        scaled_sim = min(float(sim[i]) * 3.0, 1.0)
        score   = round(sk_score * 0.8 + (scaled_sim * 100) * 0.2, 1)
        
        logger.info("  job=%s matched=%s missing=%s score=%.1f", job.title, matched, missing, score)
        
        if score < 10.0:
            continue
            
        reason_parts = []
        if matched:
            reason_parts.append(f"You have {len(matched)} of {len(req_skills)} required skills")
        if missing:
            reason_parts.append(f"missing: {', '.join(missing[:3])}")
        reason = ". ".join(reason_parts) or "Good semantic match based on your background."
        
        # Also derive domain tags for the UI (User UX request #13)
        tags = set()
        for s in req_skills:
            d = _get_skill_domain(s)
            if d != "Unknown": tags.add(d)

        results.append({
            "job_id":         job.id,
            "title":          job.title,
            "match_score":    score,
            "reason":         reason,
            "matched_skills": matched,
            "missing_skills": missing,
            "inferred_skills": inferred,
            "breakdown":      breakdown,
            "domain_tags":    list(tags)
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"recommendations": results[: req.top_n]}


@app.post("/smart-skill-gap")
def smart_skill_gap(req: SmartSkillGapRequest):
    """
    Replaces the legacy Gemini /smart-skill-gap endpoint.
    Derives readiness, strong/missing skills, and a learning plan — no external API.
    """
    nlp = get_ner_model()

    # Same normalisation & canonical expansion as smart_recommend
    skills: list[str] = []
    seen_s: set[str] = set()
    
    # Apply filtering and normalization mapped strictly per user specs
    raw_skills = final_skill_filter(req.resume_skills)
    normalized_skills = [NORMALIZATION.get(s.lower(), s.lower()) for s in raw_skills]

    for s in normalized_skills:
        n = _normalise_skill(s)
        if n not in seen_s:
            seen_s.add(n)
            skills.append(n)
        for canonical, aliases in SKILL_SYNONYMS.items():
            if n == canonical or n in aliases:
                if canonical not in seen_s:
                    seen_s.add(canonical)
                    skills.append(canonical)

    if req.resume_bio:
        if nlp:
            for ent in nlp(req.resume_bio).ents:
                if ent.label_.lower() in ["skills", "skill"] and (t := ent.text.strip()):
                    n = _normalise_skill(t)
                    if n not in seen_s:
                        seen_s.add(n)
                        skills.append(n)

        # Rule-based and implicit
        for rulesk in _extract_rule_based_skills(req.resume_bio):
            n = _normalise_skill(rulesk)
            if n not in seen_s:
                seen_s.add(n)
                skills.append(n)
                
        # Supplement with implicit skills from bio text
        for imp in _extract_implicit_skills(req.resume_bio):
            if imp not in seen_s:
                seen_s.add(imp)
                skills.append(imp)

    fl_exp = _expand_skills(skills)
    # Frequency weights based on bio text
    weights = _score_skill_weights(req.resume_bio, skills)

    # Aggregate all required skills across jobs
    all_required: Counter = Counter()
    skill_to_jobs: dict = defaultdict(list)
    for job in req.jobs:
        for s in job.skills_required:
            sl = _normalise_skill(s)
            all_required[sl] += 1
            skill_to_jobs[sl].append(job.title)

    total_req_weight = 0
    matched_req_weight = 0
    core_matched = False

    matched_skills, missing_skills = [], []
    for skill, freq in all_required.items():
        w = _get_skill_weight(skill)
        total_req_weight += w * freq
        
        is_matched = any(a in fl_exp for a in SKILL_SYNONYMS.get(skill, [skill]))
        if is_matched:
            matched_skills.append(skill)
            matched_req_weight += w * freq
            if skill not in GENERIC_SKILLS:
                core_matched = True
        else:
            missing_skills.append((skill, freq))

    if total_req_weight == 0:
        base_readiness = 100.0 if not all_required else 0.0
    else:
        base_readiness = (matched_req_weight / total_req_weight) * 100.0

    if matched_req_weight > 0 and not core_matched:
        base_readiness = min(base_readiness, 40.0)

    readiness = round(min(100.0, base_readiness), 1)

    def _proficiency(skill: str) -> str:
        w = weights.get(skill, weights.get(_normalise_skill(skill), 1))
        return "Strong" if w >= 3 else "Intermediate" if w >= 2 else "Beginner"

    strong_skills = [
        {
            "skill":         s,
            "proficiency":   _proficiency(s),
            "matching_jobs": skill_to_jobs.get(s, [])[:3],
        }
        for s in matched_skills
    ]

    missing_out = []
    for skill, freq in sorted(missing_skills, key=lambda x: -x[1]):
        priority = "HIGH" if freq >= 3 else "MEDIUM" if freq >= 2 else "LOW"
        missing_out.append({
            "skill":         skill,
            "priority":      priority,
            "why":           f"Required in {freq} job(s): {', '.join(skill_to_jobs[skill][:2])}",
            "learning_path": f"Take an online course in {skill}",
            "time_to_learn": "1–4 weeks" if priority == "LOW" else "1–3 months",
        })

    # Transferable skills: user has a synonym/alias for something required
    transferable = []
    for skill in [s for s, _ in missing_skills]:
        for canonical, aliases in SKILL_SYNONYMS.items():
            if skill in aliases and canonical in fl_exp and canonical != skill:
                transferable.append({
                    "have":           canonical,
                    "can_transfer_to": skill,
                    "gap_effort":     "Low — close synonym",
                })
                break

    learning_order = [m["skill"] for m in missing_out if m["priority"] == "HIGH"] + \
                     [m["skill"] for m in missing_out if m["priority"] == "MEDIUM"] + \
                     [m["skill"] for m in missing_out if m["priority"] == "LOW"]

    if readiness >= 80:
        advice = "You're highly job-ready! Focus on deepening expertise and building a strong portfolio."
    elif readiness >= 50:
        advice = "Good foundation. Filling the HIGH-priority gaps will significantly increase your match rate."
    else:
        advice = "Consider targeted upskilling on the HIGH-priority skills below to unlock many more opportunities."

    # ── Domain Readiness (matched_domain_skills / total_domain_skills) ────────────
    domain_readiness: dict[str, int] = {}
    for domain, domain_skill_list in DOMAIN_SKILLS.items():
        domain_skill_set = set(domain_skill_list)
        # 1. Gather all unique skills requested by jobs that belong to this domain
        required_in_domain = set()
        for job in req.jobs:
            for s in job.skills_required:
                norm = _normalise_skill(s)
                if norm in domain_skill_set:
                    required_in_domain.add(norm)
        
        if not required_in_domain:
            continue
            
        # 2. See how many of these required domain skills the user has (weighted)
        matched_weight = 0.0
        total_weight = 0.0
        
        for req_skill in required_in_domain:
            w = _get_skill_weight(req_skill)
            total_weight += w
            if any(a in fl_exp for a in SKILL_SYNONYMS.get(req_skill, [req_skill])):
                matched_weight += w
                
        if total_weight > 0:
            score = (matched_weight / total_weight) * 100.0
            if score > 0:  # Avoid cluttering UI with 0% domains they don't operate in
                domain_readiness[domain] = int(round(score))

    # Filter to only domains the freelancer has some skill presence in, OR domains they score > 0 in
    domain_readiness = {k: v for k, v in sorted(domain_readiness.items(), key=lambda x: -x[1]) 
                        if v > 0 or any(_normalise_skill(s) in DOMAIN_SKILLS[k] for s in fl_exp)}

    # ── Best Fit Job (with "WHY" explanation) ─────────────────────────────────
    best_fit: dict = {}
    if req.jobs:
        job_details = []
        for job in req.jobs:
            job_req = [s.lower() for s in job.skills_required]
            score_val, matched_r, _, missing_r, brkd = _skill_match_score(fl_exp, job_req)
            job_details.append({
                "title": job.title, 
                "score": score_val,
                "matched": matched_r,
                "missing": missing_r,
                "breakdown": brkd
            })
        if job_details:
            best = max(job_details, key=lambda x: x["score"])
            best_fit = best

    # ── Growth Explorer ──────────────────────────────────────────────────────
    # Shows skills the user is MISSING that appear in jobs. Calculates the real 
    # score boost (impact) the user would get if they learned that single skill.
    growth_tracker: dict[str, dict] = {}  # skill -> {"jobs": set(), "impact_score": float, "freq": int}

    for job in req.jobs:
        job_req = list(dict.fromkeys([_normalise_skill(s) for s in job.skills_required]))
        score_val, _, _, _, _ = _skill_match_score(fl_exp, job_req)

        # Skip jobs they are already fully qualified for
        if score_val >= 75:
            continue

        for ns in job_req:
            if ns in fl_exp or ns in GENERIC_SKILLS:
                continue

            # Perfectly simulate gaining the skill (including its entire inferred skill tree and synonyms)
            sim_exp = set(fl_exp) | _expand_skills([ns])
            new_score, _, _, _, _ = _skill_match_score(sim_exp, job_req)
            impact = max(0.0, new_score - score_val)

            if impact > 0:
                if ns not in growth_tracker:
                    growth_tracker[ns] = {"jobs": set(), "freq": 0, "impact_score": 0.0}
                growth_tracker[ns]["jobs"].add(job.title)
                growth_tracker[ns]["freq"] += 1
                growth_tracker[ns]["impact_score"] += impact

    growth_skills = []
    for s, data in growth_tracker.items():
        freq = data["freq"]
        if freq > 0:
            avg_impact = round(data["impact_score"] / freq, 1)
            growth_skills.append({
                "skill": s,
                "unlocks_jobs": sorted(list(data["jobs"]))[:3],
                "job_count": freq,
                "impact": avg_impact
            })

    # Sort by highest average impact, then frequency
    growth_skills.sort(key=lambda x: (-x["impact"], -x["job_count"]))
    growth_skills = growth_skills[:12]

    return {
        "overall_readiness":          readiness,
        "domain_readiness":           domain_readiness,
        "best_fit":                   best_fit,
        "growth_skills":              growth_skills,
        "career_advice":              advice,
        "strong_skills":              strong_skills,
        "missing_skills":             missing_out,
        "transferable_skills":        transferable,
        "recommended_learning_order": learning_order[:10],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
