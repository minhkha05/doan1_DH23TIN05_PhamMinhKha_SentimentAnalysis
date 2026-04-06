# 🌟 Hệ Thống AI Sentiment Analysis - Phân Tích Cảm Xúc Tiếng Việt

Dự án phân tích cảm xúc tiếng Việt theo 3 nhãn: **Tiêu cực**, **Tích cực**, **Trung tính**. Hệ thống gồm Backend API + Frontend Web.

## 🛠️ Công Nghệ Sử Dụng
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, JWT.
- **Frontend**: React, TypeScript, Vite.
- **AI (Deep Learning)**: PhoBERT (Transformers, PyTorch).
- **AI (Traditional ML)**: TF-IDF + LinearSVC + CalibratedClassifierCV.

---

## 🚀 Hướng Dẫn Chạy Dự Án Nhanh

### 1) Chuẩn bị Database
- Tạo DB trống (ví dụ: `sentiment_db`).
- Chạy file `PostgreSQL AI Sentiment_Vietnamese.sql` để tạo bảng.

### 2) Chạy Backend
Lần đầu:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
Mỗi lần demo:
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3) Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```
Web: [http://localhost:5173](http://localhost:5173)

---

## 🧠 Huấn Luyện AI Mô Hình (Phần Dành Cho Nghiên Cứu)

Nếu bạn muốn train lại hoặc xem pipeline huấn luyện, hãy mở các notebook trong thư mục `notebooks/`.

### PhoBERT (Deep Learning)

1. 🟢 **`phobert-v1-1st.ipynb`**: Bản baseline đầu tiên.
2. 🟡 **`phobert-v1-2nd.ipynb`**: Fine-tune tiếp từ bản v1.
3. 🔴 **`phobert-v2.ipynb`**: Phiên bản cải tiến với pipeline mới.
4. 🟣 **`phobert-v2.1.ipynb`**: Phiên bản tối ưu thêm từ v2.

### Traditional ML

5. 🔵 **`TFIDF-SVM-v1.ipynb`**: Mô hình TF-IDF + SVM để làm mốc so sánh với PhoBERT.

**💡 Lưu ý:** PhoBERT nên chạy bằng GPU (khuyên dùng Colab); TF-IDF SVM chạy CPU được.
