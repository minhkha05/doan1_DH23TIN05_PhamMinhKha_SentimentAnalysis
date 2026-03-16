# 1. Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Build frontend ra thu muc dist
RUN npm run build

# 2. Setup Backend & Chay Server
FROM python:3.10-slim
WORKDIR /app

# Cai dat cac thu vien he thong
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy thu vien Python và cai dat
COPY backend/requirements.txt ./
# Toi uu: Cai dat ban CPU cua PyTorch de giam dung luong
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy thu muc backend, models
COPY backend/ ./backend/
COPY models/ ./models/

# Copy file tinh sau khi build frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Phan quyen cho user mac dinh cua Hugging Face
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app/backend

# M? c?ng 7860 theo yêu c?u HF Spaces
EXPOSE 7860

# Khoi chay FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
