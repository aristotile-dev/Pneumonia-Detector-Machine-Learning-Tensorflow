FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
ENV TF_CPP_MIN_LOG_LEVEL=2
# Writable on every host (Hugging Face Spaces run as a non-root user)
ENV MODEL_PATH=/tmp/pneumonia_model_94.keras
# Railway injects $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
