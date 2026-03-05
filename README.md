# 🌟 Hệ Thống AI Sentiment Analysis - Phân Tích Cảm Xúc Tiếng Việt

Dự án AI phân tích văn bản thành 3 cảm xúc: **Tiêu cực (Negative)**, **Tích cực (Positive)**, và **Trung tính (Neutral)** dựa trên mô hình PhoBERT. Bao gồm cả Backend và Frontend tích hợp đầy đủ.

## 🛠️ Công Nghệ Sử Dụng
- **Backend**: FastAPI, PostgreSQL (Async), SQLAlchemy, JWT Auth.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS (Glassmorphism).
- **Core AI**: Hugging Face (Transformers), PyTorch, PhoBERT (vinai/phobert-base-v2).

---

## 🚀 Hướng Dẫn Chạy Dự Án Nhanh

### Bước 1: Khởi tạo Cơ sở dữ liệu (PostgreSQL)
1. Tạo một cơ sở dữ liệu trống trên máy (ví dụ: `sentiment_db`).
2. Mở PostgreSQL và chạy file `PostgreSQL AI Sentiment_Vietnamese.sql` (nằm ở thư mục gốc) để nạp cấu trúc bảng.

### Bước 2: Chạy Backend (API Server)
Mở một cửa sổ Terminal mới và thực hiện theo 2 trường hợp:

**A. Lần chạy đầu tiên (Cài đặt):**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # (Trên Windows)
pip install -r requirements.txt

# Tạo file biến môi trường và nhớ mở file .env để sửa thông tin Database
cp .env.example .env  
```

**B. Khởi động Server (Dùng cho mọi lần chạy):**
Đảm bảo bạn đang ở thư mục `backend` và đã chạy lệnh `.venv\Scripts\activate`:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

👉 **Tài liệu API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Bước 3: Chạy Frontend (Giao diện Web)
Mở thêm một cửa sổ Terminal khác, chạy lần lượt:
```bash
cd frontend
npm install
npm run dev
```
👉 **Truy cập Giao diện Web:** [http://localhost:5173](http://localhost:5173)

---

## 🧠 Huấn Luyện AI Mô Hình (Phần Dành Cho Nghiên Cứu)

Nếu bạn muốn tự train lại hoặc hiểu cách mô hình AI được tạo ra, hãy xem các file trong thư mục `notebooks/`. **Khuyên dùng Google Colab** để có GPU chạy các file này theo thứ tự sau:

1. 🟢 **`phobert-v3-1st.ipynb`**: Tạo model **Baseline**.
   - Dùng dữ liệu cơ bản (Hugging face) kết hợp dữ liệu do mình bổ trợ.
   - Các kỹ thuật: Focal Loss, Class Weights.

2. 🟡 **`phobert-v3-2nd.ipynb`**: Tối ưu hóa trên **Dữ liệu riêng (Internal)**.
   - Load lại model từ bước 1.
   - Dùng thêm dữ liệu Sarcasm (câu mỉa mai, nói ngược) sinh ra tự động.
   - Các kỹ thuật nâng cao: FGM Adversarial, Label Smoothing. Mục tiêu đạt độ chính xác >95%.

3. 🔴 **`phobert-v4.ipynb`**: Phiên bản **Cao cấp nhất (Advanced)** (Độc lập/Tùy chọn).
   - Fine-tune trên tập dữ liệu hoàn toàn mới được crawl và làm sạch (30,000 dòng cân bằng).
   - Dùng mọi kỹ thuật tối ưu kiến trúc (CLS + Mean Pooling, MLP Heaad, AWP, Gradient Checkpointing, R-Drop).
