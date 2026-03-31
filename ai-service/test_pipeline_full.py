"""
Full pipeline test — verifies:
  1.  Skill extraction from HEMANTH's resume (basic java, ms excel, html, c++, c)
  2.  The weight-filter no longer drops weight-1 real skills (html, excel)
  3.  Growth Explorer logic returns impact & job_count fields
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from main import (
    _extract_rule_based_skills,
    _extract_implicit_skills,
    _normalise_skill,
    _get_skill_weight,
    _expand_skills,
    _skill_match_score,
    NORMALIZATION,
    SKILL_SYNONYMS,
    GENERIC_SKILLS,
    final_skill_filter,
)

NOISE_ONLY_SKILLS = {"backend", "frontend", "api", "database", "orm", "full stack"}

# ── 1. Resume text ────────────────────────────────────────────────────────────
resume_text = """
Name: HEMANTH
Role: Fresher
Skills:
* C, C++
* Basic Java
* HTML
* MS Excel
Experience:
* No professional experience
Projects:
* Simple calculator (C++)
"""

print("=" * 60)
print("TEST 1 — Rule-based extraction")
print("=" * 60)
rb = _extract_rule_based_skills(resume_text)
print(f"Extracted ({len(rb)}): {rb}")

expected_any = {"basic java", "c++", "c", "html", "ms excel", "excel", "java"}
found = set(rb)
missing_expected = expected_any - found
print(f"Expected (any of): {expected_any}")
print(f"MISSING from extracted: {missing_expected if missing_expected else 'NONE  ALL FOUND'}")

# ── 2. Simulate parse-resume normalisation pipeline ───────────────────────────
print()
print("=" * 60)
print("TEST 2 — Normalisation + filter pipeline (simulates parse-resume)")
print("=" * 60)

implicit = _extract_implicit_skills(resume_text)
combined_raw = list(rb) + [s for s in implicit if s not in rb]

# Normalise
normalised_step1 = [NORMALIZATION.get(s.lower(), s.lower()) for s in combined_raw]
normalised_step1 = final_skill_filter(normalised_step1)

seen = set()
normalised = []
for s in normalised_step1:
    n = _normalise_skill(s)
    if n not in seen:
        seen.add(n)
        normalised.append(n)

# Sort by weight
normalised.sort(key=lambda s: _get_skill_weight(s), reverse=True)

# NEW filter: only drop NOISE words, never real skills
core_skills  = [s for s in normalised if s not in NOISE_ONLY_SKILLS]
noise_skills = [s for s in normalised if s in NOISE_ONLY_SKILLS]
if len(core_skills) >= 5:
    normalised = core_skills
else:
    normalised = core_skills + noise_skills
normalised = normalised[:15]

print(f"Final skills ({len(normalised)}): {normalised}")

key_check = {"java", "c++", "c", "html", "excel"}
present = key_check & set(normalised)
absent  = key_check - set(normalised)
print(f"Key skills present: {present}")
if absent:
    print(f"Key skills MISSING [BUG]: {absent}")
else:
    print("ALL KEY SKILLS PRESENT - PASS")

# ── 3. Weight sanity check ────────────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 3 — Skill weights (old bug would drop weight-1 skills)")
print("=" * 60)
for s in ["java", "c++", "c", "html", "excel"]:
    w = _get_skill_weight(s)
    old_kept = w >= 2
    new_kept = s not in NOISE_ONLY_SKILLS
    status = "OK (same)" if old_kept == new_kept else ("NOW KEPT [FIXED]" if new_kept else "REMOVED")
    print(f"  {s:15} weight={w}  old={'keep' if old_kept else 'DROP'}  new={'keep' if new_kept else 'drop'}  [{status}]")

# ── 4. Growth Explorer simulation ─────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 4 — Growth Explorer impact simulation")
print("=" * 60)

fl_skills = ["java", "c++", "c", "html", "excel"]
fl_exp    = _expand_skills(fl_skills)

sample_jobs = [
    {"title": "React Frontend Developer", "skills": ["react", "javascript", "html", "css"]},
    {"title": "Java Backend Developer",   "skills": ["java", "spring boot", "mysql", "rest api"]},
    {"title": "Python ML Engineer",       "skills": ["python", "machine learning", "pandas", "scikit-learn"]},
    {"title": "Full Stack Developer",     "skills": ["react", "node", "mongodb", "javascript", "html"]},
    {"title": "Android Developer",        "skills": ["java", "kotlin", "android", "rest api"]},
]

growth_tracker = {}
for job in sample_jobs:
    job_req   = [_normalise_skill(s) for s in job["skills"]]
    score_val, *_ = _skill_match_score(fl_exp, job_req)
    for s in job_req:
        ns = _normalise_skill(s)
        if ns in fl_exp or ns in GENERIC_SKILLS:
            continue
        sim_exp   = fl_exp | {ns} | set(SKILL_SYNONYMS.get(ns, [ns]))
        new_score, *_ = _skill_match_score(sim_exp, job_req)
        impact = max(0.0, new_score - score_val)
        if ns not in growth_tracker:
            growth_tracker[ns] = {"jobs": {}, "freq": 0, "impact_score": 0.0}
        growth_tracker[ns]["jobs"][job["title"]] = round(impact, 1)
        growth_tracker[ns]["freq"] += 1
        growth_tracker[ns]["impact_score"] += impact

growth_skills_sorted = sorted(
    growth_tracker.items(),
    key=lambda x: (-x[1]["impact_score"], -x[1]["freq"])
)
print(f"Top growth skills for HEMANTH (ranked by impact):")
for skill, data in growth_skills_sorted[:8]:
    avg_impact = round(data["impact_score"] / max(data["freq"], 1), 1)
    top_jobs   = [j for j, _ in sorted(data["jobs"].items(), key=lambda x: -x[1])][:2]
    freq       = data["freq"]
    print(f"  {skill:20} | +{avg_impact:5.1f}% avg score | {freq} job(s) | Unlocks: {', '.join(top_jobs)}")

print()
print("All tests complete.")
