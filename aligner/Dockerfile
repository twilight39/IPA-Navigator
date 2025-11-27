FROM python:3.12-slim

# Set working directory
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    espeak-ng \
    libespeak-ng1 \
    libespeak-ng-dev \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*e

RUN pip install --no-cache-dir uv

# Copy requirements and install Python dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync

# Copy application code
COPY app/ ./app

ENV PHONEMIZER_ESPEAK_LIBRARY=/usr/lib/aarch64-linux-gnu/libespeak-ng.so

# Expose port for API
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
