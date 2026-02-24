# 🧠 AI Sentiment Analysis API (Tiếng Việt)

Backend API cho hệ thống phân tích cảm xúc tiếng Việt, xây dựng với **FastAPI**, **PostgreSQL** (SQLAlchemy Async) và **Pydantic v2**.

## 📁 Cấu trúc dự án

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── dependencies.py      # DI: get_current_user, require_admin
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (.env)
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   ├── security.py      # JWT + bcrypt
│   │   └── exceptions.py    # Centralized error handling
│   ├── models/
│   │   └── models.py        # SQLAlchemy ORM (Enum support)
│   ├── schemas/
│   │   └── schemas.py       # Pydantic v2 schemas
│   ├── services/
│   │   ├── ai_service.py    # Mock AI prediction
│   │   ├── auth_service.py  # Auth business logic
│   │   ├── analysis_service.py  # Analysis pipeline
│   │   └── admin_service.py # Admin operations
│   └── routers/
│       ├── auth.py          # /api/v1/auth/*
│       ├── user.py          # /api/v1/user/*
│       └── admin.py         # /api/v1/admin/*
├── .env.example
├── requirements.txt
└── README.md
```

## 🚀 Cài đặt & Chạy

### 1. Tạo môi trường ảo
```bash
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Linux/Mac
```

### 2. Cài đặt dependencies
```bash
pip install -r requirements.txt
```

### 3. Cấu hình Database
- Tạo database PostgreSQL (ví dụ: `sentiment_db`)
- Chạy file SQL để tạo bảng:
  ```sql
  psql -U postgres -d sentiment_db -f "../PostgreSQL AI Sentiment_Vietnamese.sql"
  ```
- Copy `.env.example` → `.env` và cập nhật thông tin:
  ```bash
  cp .env.example .env
  ```

### 4. Chạy server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Truy cập API docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 API Endpoints

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint    | Mô tả                        |
|--------|-------------|-------------------------------|
| POST   | `/register` | Đăng ký (email hoặc SĐT)     |
| POST   | `/login`    | Đăng nhập → JWT token        |
| GET    | `/profile`  | Thông tin tài khoản (JWT)     |

### 👤 User (`/api/v1/user`)
| Method | Endpoint    | Mô tả                              |
|--------|-------------|-------------------------------------|
| POST   | `/analyze`  | Phân tích cảm xúc văn bản          |
| GET    | `/history`  | Lịch sử phân tích cá nhân (phân trang) |

### 🛡️ Admin (`/api/v1/admin`)
| Method | Endpoint     | Mô tả                                      |
|--------|--------------|---------------------------------------------|
| GET    | `/dashboard` | Thống kê tổng quan (aggregation queries)    |
| GET    | `/labels`    | Danh sách nhãn (phân trang)                 |
| PUT    | `/labels`    | Sửa nhãn cảm xúc (→ bảng suanhan)          |
| GET    | `/export`    | Xuất dữ liệu: COALESCE(suanhan, ketqua)    |

## 🏗️ Design Patterns

- **Service Pattern**: Tách biệt business logic khỏi routers
- **Dependency Injection**: FastAPI `Depends()` cho DB session & auth
- **Soft Delete**: Tất cả bảng dùng `_xoa` + `_xoaluc`
- **Centralized Error Handling**: Custom exceptions + global handlers
- **Pagination**: Generic `PaginatedResponse[T]` cho tất cả danh sách
- **Async/Await**: Toàn bộ I/O bound operations

## 🔑 Ví dụ sử dụng

### Đăng ký
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "matkhau": "Test123456"}'
```

### Đăng nhập
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "matkhau": "Test123456"}'
```

### Phân tích cảm xúc
```bash
curl -X POST http://localhost:8000/api/v1/user/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"noidung": "Sản phẩm tuyệt vời, tôi rất hài lòng!"}'
```
