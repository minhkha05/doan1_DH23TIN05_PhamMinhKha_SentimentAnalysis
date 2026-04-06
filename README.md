# AI Sentiment Analysis (Vietnamese)

## English

Vietnamese sentiment analysis system with 3 classes: Negative, Neutral, Positive.
The project includes a FastAPI backend and a React + Vite frontend.

### Live Demo
- Frontend (Vercel): https://sentiment-ai-rho.vercel.app/

### Tech Stack
- Backend: FastAPI, SQLAlchemy (async), PostgreSQL, JWT, Google OAuth
- Frontend: React, TypeScript, Vite
- AI: PhoBERT-based model (in models/) and research notebooks (in notebooks/)

### Quick Start

1) Database setup
- Create a PostgreSQL database (example: sentiment_db)
- Run PostgreSQL AI Sentiment_Vietnamese.sql

2) Run backend
First time only:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Every time you start backend:
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API docs: http://localhost:8000/docs

3) Run frontend
```bash
cd frontend
npm install
npm run dev
```
- Local frontend: http://localhost:5173

### Notes
- Update backend and frontend environment variables from .env.example files.
- Ensure model files are available in models/ before running AI inference.

---

## Tiếng Việt

Hệ thống phân tích cảm xúc tiếng Việt với 3 nhãn: Tiêu cực, Trung tính, Tích cực.
Dự án gồm backend FastAPI và frontend React + Vite.

### Bản chạy thực tế
- Frontend (Vercel): https://sentiment-ai-rho.vercel.app/

### Công nghệ chính
- Backend: FastAPI, SQLAlchemy async, PostgreSQL, JWT, Google OAuth
- Frontend: React, TypeScript, Vite
- AI: mô hình PhoBERT (thư mục models/) và notebook nghiên cứu (thư mục notebooks/)

### Chạy nhanh dự án

1) Chuẩn bị cơ sở dữ liệu
- Tạo PostgreSQL database (ví dụ: sentiment_db)
- Chạy file PostgreSQL AI Sentiment_Vietnamese.sql

2) Chạy backend
Lần đầu tiên:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Mỗi lần chạy backend:
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API docs: http://localhost:8000/docs

3) Chạy frontend
```bash
cd frontend
npm install
npm run dev
```
- Frontend local: http://localhost:5173

### Ghi chú
- Cập nhật biến môi trường theo các file .env.example.
- Đảm bảo model trong thư mục models/ sẵn sàng trước khi chạy suy luận AI.
