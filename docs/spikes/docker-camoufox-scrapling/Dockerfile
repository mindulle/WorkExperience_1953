FROM python:3.10-slim

WORKDIR /app

# camoufox(패치된 Firefox)와 scrapling(Playwright 기반)이 요구하는 헤드리스 브라우저용
# 시스템 라이브러리. `python -m camoufox fetch` / `playwright install --with-deps`가
# 자체적으로 apt까지 설치해주지 않는 slim 베이스 이미지 기준으로, 최소 목록을 직접 명시한다.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl ca-certificates unzip xz-utils \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
    fonts-liberation libgtk-3-0 libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-spike.txt .
RUN pip install --no-cache-dir -r requirements-spike.txt

# camoufox: 패치된 Firefox 바이너리 다운로드 (pip install만으로는 안 받아짐)
RUN python -m camoufox fetch

# scrapling(Playwright)이 쓸 Chromium 바이너리 + 나머지 시스템 의존성 설치
RUN python -m playwright install --with-deps chromium

COPY smoke_test.py .

CMD ["python", "smoke_test.py"]
