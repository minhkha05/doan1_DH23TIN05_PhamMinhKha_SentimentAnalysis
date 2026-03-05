# 🌟 Hệ Thống AI Sentiment Analysis - Phân Tích Cảm Xúc Tiếng Việt

Dự án AI phân tích văn bản thành 3 cảm xúc: **Tiêu cực (Negative)**, **Tích cực (Positive)**, và **Trung tính (Neutral)** dựa trên mô hình PhoBERT. Bao gồm cả Backend và Frontend tích hợp đầy đủ.

## 🛠️ Công Nghệ Sử Dụng
- **Backend**: FastAPI, PostgreSQL (Async), SQLAlchemy, JWT Auth.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS (Glassmorphism).
- **Core AI**: 
  - **Deep Learning**: Hugging Face (Transformers), PyTorch, PhoBERT (vinai/phobert-base-v2)
  - **Traditional ML**: TF-IDF + LinearSVC (Scikit-learn), CalibratedClassifierCV

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

Nếu bạn muốn tự train lại hoặc hiểu cách mô hình AI được tạo ra, hãy xem các file trong thư mục `notebooks/`. **Khuyên dùng Google Colab** để có GPU chạy các file này:

### PhoBERT Models (Deep Learning)

1. 🟢 **`phobert-v3-1st.ipynb`**: Tạo model **Baseline**.
   - Dữ liệu: Hugging Face datasets + dữ liệu bổ trợ
   - Kỹ thuật: Focal Loss, Class Weights
   - Mục tiêu: Tạo nền tảng model ban đầu

2. 🟡 **`phobert-v3-2nd.ipynb`**: Tối ưu hóa trên **Dữ liệu riêng (Internal)**.
   - Load model từ bước 1 và tiếp tục fine-tune
   - Thêm dữ liệu Sarcasm (câu mỉa mai, nói ngược) sinh tự động
   - Kỹ thuật: FGM Adversarial Training, Label Smoothing
   - Mục tiêu: Đạt độ chính xác >95%

3. 🔴 **`phobert-v4.ipynb`**: Phiên bản **Cao cấp (Advanced)** - Độc lập.
   - Dữ liệu: 30,000 mẫu crawl mới, cân bằng hoàn toàn
   - Kỹ thuật: CLS + Mean Pooling, MLP Head, AWP, Gradient Checkpointing, R-Drop
   - Architecture: Custom classification head
   - Kết quả: Model production-ready với performance cao nhất

4. 🟣 **`phobert-v5.ipynb`**: Phiên bản **mới nhất**.
   - Base: Fine-tune từ PhoBERT v3
   - Tối ưu: Hyperparameter tuning, Temperature Scaling
   - Kết quả: Accuracy 77.9%, F1 77.7%

### Traditional ML Approach

5. 🔵 **`TF_IDF-SVM-v1.ipynb`**: Model **Baseline truyền thống**.
   - Phương pháp: TF-IDF + LinearSVC + CalibratedClassifierCV
   - Kỹ thuật: Grid Search CV cho hyperparameter tuning
   - Features: Ngram (1,2), max_features=90,000
   - Kết quả: Accuracy 75.6%, F1 75.4%
   - Mục đích: So sánh với Deep Learning models

**💡 Lưu ý:** Notebooks PhoBERT cần GPU mạnh (khuyến nghị Google Colab Pro). TF-IDF SVM có thể chạy trên CPU.
