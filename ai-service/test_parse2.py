import re
from main import _extract_implicit_skills, _extract_rule_based_skills, _normalise_skill

text = """
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

print("Rule-based:", _extract_rule_based_skills(text))
print("Implicit:", _extract_implicit_skills(text))
