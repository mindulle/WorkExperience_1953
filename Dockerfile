FROM python:3.10-slim

WORKDIR /app

# 시스템 라이브러리 설치 (헤드리스 브라우저용)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl ca-certificates unzip xz-utils \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
    fonts-liberation libgtk-3-0 libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 의존성 복사 및 설치
COPY src/pipeline/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 브라우저 엔진 바이너리 페치 (camoufox, scrapling)
RUN python -m camoufox fetch
RUN playwright install --with-deps chromium

# 전체 소스 코드 복사
COPY src/ ./src/

# 포트 노출
RUN pip install --no-cache-dir python-dotenv
EXPOSE 8080

# 프로젝트 루트에서 스크립트 실행 (main.py의 경로 계산 방식을 지원하기 위해)
ENV PYTHONPATH=/app/src
WORKDIR /app/src/pipeline

# 트리거 서버 실행
CMD ["python", "trigger_server.py"]
