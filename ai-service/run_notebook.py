import sys
import subprocess
subprocess.check_call([sys.executable, "-m", "pip", "install", "nbformat", "nbconvert", "ipykernel", "jupyter"])
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor

with open('train_ner_model.ipynb') as f:
    nb = nbformat.read(f, as_version=4)

ep = ExecutePreprocessor(timeout=600, kernel_name='python3')
print("Executing notebook...")
ep.preprocess(nb, {'metadata': {'path': '.'}})

with open('train_ner_model.ipynb', 'w', encoding='utf-8') as f:
    nbformat.write(nb, f)
print("Notebook executed and saved.")
