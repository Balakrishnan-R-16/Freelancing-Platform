import re
from main import MASTER_SKILLS_LIST, DERIVED_SKILLS, _normalise_skill, final_skill_filter, _get_skill_weight, NORMALIZATION, _extract_implicit_skills, _extract_rule_based_skills

text = """
Name: HEMANTH
Role: Fresher
Skills:
● C, C++
● Basic Java
● HTML
● MS Excel
Experience:
● No professional experience
Projects:
● Simple calculator (C++)
"""

# Simulate parse_resume logic entirely
text = text.strip()
raw_skills = [] # Assume NER failed for these

# Rule-based
seen = set()
normalised = []

print("Extracting rule based...")
rulesk = _extract_rule_based_skills(text)
print("Rule based found:", rulesk)
for r in rulesk:
    n = _normalise_skill(r)
    if n not in seen:
        seen.add(n)
        normalised.append(n)

print("Extracting implicit...")
implicit = _extract_implicit_skills(text)
print("Implicit found:", implicit)
for i in implicit:
    if i not in seen:
        seen.add(i)
        normalised.append(i)

print("Pre-filter normalised:", normalised)

normalised = [NORMALIZATION.get(s.lower(), s.lower()) for s in normalised]
normalised = final_skill_filter(normalised)

print("Post-filter normalised:", normalised)

normalised.sort(key=lambda s: _get_skill_weight(s), reverse=True)
print("Sorted normalised:", normalised)

core_skills = [s for s in normalised if _get_skill_weight(s) >= 2]
print("Core skills:", core_skills)

if len(core_skills) >= 3:
    normalised = core_skills

normalised = normalised[:15]
print("FINAL SKILLS:", normalised)

