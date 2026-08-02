FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download and unpack the NER model from GitHub Releases if not present locally
RUN apt-get update && apt-get install -y curl && \
    if [ ! -d "ner_model" ] || [ -z "$(ls -A ner_model 2>/dev/null)" ]; then \
        echo "Downloading NER model from GitHub Releases..." && \
        curl -f -L -o ner_model.tar.gz "https://github.com/Balakrishnan-R-16/Freelancing-Platform/releases/download/v1.0-model/ner_model.tar.gz" && \
        tar -xzf ner_model.tar.gz && \
        rm -f ner_model.tar.gz; \
    fi && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

