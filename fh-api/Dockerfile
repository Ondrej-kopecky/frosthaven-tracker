FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p data && useradd -r -s /bin/false appuser && chown -R appuser:appuser /app
USER appuser
# --proxy-headers: IP klienta z X-Forwarded-For od Caddy (jediný soused v docker síti)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--proxy-headers", "--forwarded-allow-ips", "*"]
