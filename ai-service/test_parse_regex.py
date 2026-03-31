import re
from main import _extract_rule_based_skills

text = """
Name: HEMANTH
Role: Fresher
Skills:
●
C, C++
●
Basic Java
●
HTML
●
MS Excel
Experience:
●
No professional experience
Projects:
●
Simple calculator (C++)
"""

print(_extract_rule_based_skills(text))
