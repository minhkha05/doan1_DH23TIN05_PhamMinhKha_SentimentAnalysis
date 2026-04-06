# Sử dụng Python 3.12 (slim siêu nhẹ)
FROM python:3.12-slim

# Thiết lập thư mục làm việc ban đầu
WORKDIR /app

# Khắc phục lỗi cài đặt thư viện một số hệ thống
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt file requirements của Backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install pydantic-settings gunicorn

# YÊU CẦU BẮT BUỘC CỦA HUGGING FACE SPACES: Chạy bằng User cấp thấp (ID: 1000)
# Không được phép chạy bằng tài khoản Root để đảm bảo bảo mật.
RUN useradd -m -u 1000 user
USER user

# Biến môi trường hệ thống
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/home/user/app/backend

# Chuyển thư mục làm việc về không gian của User 1000
WORKDIR $HOME/app/backend

# Copy toàn bộ file code (backend) và thư mục (models) vào trong Container
COPY --chown=user backend/ $HOME/app/backend/
COPY --chown=user models/ $HOME/app/models/

# Mở cổng 7860 (Hugging Face CHỈ nhận diện Web API trên PORT 7860)
EXPOSE 7860

# Khởi chạy Backend FastAPI thông qua Gunicorn (để chịu tải Production cực tốt)
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:7860", "--timeout", "120", "--graceful-timeout", "30", "--keep-alive", "10"]
