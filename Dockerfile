# Dockerfile untuk Cloud Deployment Server AI BESTARI 24 Jam
FROM python:3.10-slim

# Install system dependencies untuk OpenCV & PyTorch
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirement files & install dependencies
COPY requirements_ai.txt .
RUN pip install --no-cache-dir gunicorn
RUN pip install --no-cache-dir -r requirements_ai.txt

# Copy source code & model runs
COPY . .

# Environment Variables
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

# Run Flask server dengan Gunicorn (Production Ready 24/7)
CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 server_yolo:app
