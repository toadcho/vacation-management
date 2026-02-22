방법 2 (하이브리드 구조)를 구현하겠습니다!

1. 파일 생성
1️⃣ frontend/Dockerfile.nginx.dev
powershellcd C:\Project\vacation-management\frontend
powershell@"
# 빌드 스테이지
FROM node:18-alpine AS builder

WORKDIR /app

# package.json 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# Nginx 스테이지
FROM nginx:alpine

# Nginx 설정 복사
COPY nginx-dev.conf /etc/nginx/nginx.conf

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 포트 노출
EXPOSE 80

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
"@ | Out-File -FilePath "Dockerfile.nginx.dev" -Encoding UTF8

2️⃣ frontend/nginx-dev.conf
powershell@"
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 헬스체크 엔드포인트
        location /health {
            access_log off;
            return 200 \"healthy\n\";
            add_header Content-Type text/plain;
        }

        # API 프록시
        location /api {
            proxy_pass http://api:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # SPA 라우팅
        location / {
            try_files \$uri \$uri/ /index.html;
        }

        # 정적 파일 캐싱
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
        }
    }
}
"@ | Out-File -FilePath "nginx-dev.conf" -Encoding UTF8

3️⃣ docker-compose.yml (전체 교체)
powershellcd C:\Project\vacation-management
powershell@"
services:
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # Backend API Server
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  api:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile.dev
    container_name: vacation-api-dev
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - .env
    environment:
      NODE_ENV: development
      PORT: 5000
      FRONTEND_URL: http://localhost:3000
      CORS_ORIGIN: http://localhost:3000,http://localhost:8080
    volumes:
      - ./backend:/app
      - ./backend/credentials/serviceAccountKey.json:/app/credentials/serviceAccountKey.json:ro
      - /app/node_modules
    networks:
      - vacation-network
    stdin_open: true
    tty: true

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 개발용 Frontend (Vite + HMR)
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  web-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: vacation-web-dev
    restart: unless-stopped
    ports:
      - "3000:5173"
    env_file:
      - .env
    environment:
      VITE_API_URL: http://localhost:5000/api
      VITE_ENV: development
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - vacation-network
    depends_on:
      - api
    stdin_open: true
    tty: true
    profiles:
      - dev

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # 프로덕션 테스트용 Frontend (Nginx)
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  web-prod:
    build:
      context: ./frontend
      dockerfile: Dockerfile.nginx.dev
    container_name: vacation-web-nginx
    restart: unless-stopped
    ports:
      - "8080:80"
    networks:
      - vacation-network
    depends_on:
      - api
    profiles:
      - prod

networks:
  vacation-network:
    driver: bridge
"@ | Out-File -FilePath "docker-compose.yml" -Encoding UTF8

2. 실행 방법
개발 모드 (Vite - HMR 지원)
bash# 시작
docker-compose --profile dev up -d

# 로그 확인
docker-compose --profile dev logs -f

# 접속
# http://localhost:3000

프로덕션 테스트 모드 (Nginx)
bash# 시작
docker-compose --profile prod up -d --build

# 로그 확인
docker-compose --profile prod logs -f

# 접속
# http://localhost:8080
둘 다 실행
bash# 개발 + 프로덕션 테스트 동시 실행
docker-compose --profile dev --profile prod up -d

# 개발: http://localhost:3000 (Vite)
# 테스트: http://localhost:8080 (Nginx)

3. 유용한 명령어
개발 모드
bash# 시작
docker-compose --profile dev up -d

# 중지
docker-compose --profile dev down

# 재시작
docker-compose --profile dev restart

# 로그
docker-compose --profile dev logs -f web-dev

# 재빌드
docker-compose --profile dev up -d --build
프로덕션 테스트 모드
bash# 시작 (빌드 포함)
docker-compose --profile prod up -d --build

# 중지
docker-compose --profile prod down

# 재시작
docker-compose --profile prod restart

# 로그
docker-compose --profile prod logs -f web-prod

# 재빌드
docker-compose --profile prod up -d --build web-prod

4. 사용 시나리오
시나리오 1: 평소 개발
bash# 아침
docker-compose --profile dev up -d
docker-compose --profile dev logs -f

# 개발 진행
# → http://localhost:3000
# → 코드 수정 시 자동 새로고침 (HMR)

# 저녁
docker-compose --profile dev down
시나리오 2: 배포 전 테스트
bash# 프로덕션 환경 테스트
docker-compose --profile prod up -d --build
docker-compose --profile prod logs -f

# 테스트
# → http://localhost:8080
# → 실제 배포 환경과 동일한 Nginx 구조

# 완료 후
docker-compose --profile prod down
시나리오 3: 동시 비교
bash# 개발 + 프로덕션 동시 실행
docker-compose --profile dev --profile prod up -d

# 개발: http://localhost:3000
# 테스트: http://localhost:8080

# 비교 테스트 후
docker-compose --profile dev --profile prod down
```

---

## 5. 디렉토리 구조
```
C:\Project\vacation-management\
├── backend/
│   ├── docker/
│   │   └── Dockerfile.dev
│   └── ...
├── frontend/
│   ├── Dockerfile.dev          ← Vite 개발 서버
│   ├── Dockerfile.nginx.dev    ← Nginx (새로 생성)
│   ├── nginx-dev.conf          ← Nginx 설정 (새로 생성)
│   └── ...
├── docker-compose.yml          ← 수정됨
└── .env

6. 접속 URL 정리
모드URL서버용도개발http://localhost:3000Vite일반 개발 (HMR)테스트http://localhost:8080Nginx배포 전 테스트APIhttp://localhost:5000/apiExpressBackend API

7. 포트 충돌 해결
3000 포트 사용 중
bash# 포트 변경 (docker-compose.yml)
web-dev:
  ports:
    - "3001:5173"  # 3001로 변경
8080 포트 사용 중
bash# 포트 변경 (docker-compose.yml)
web-prod:
  ports:
    - "8888:80"  # 8888로 변경

8. 문제 해결
빌드 실패
bash# 캐시 없이 재빌드
docker-compose --profile prod build --no-cache web-prod
docker-compose --profile prod up -d
Nginx 404 에러
bash# 빌드 파일 확인
docker-compose --profile prod exec web-prod ls -la /usr/share/nginx/html

# 재빌드
docker-compose --profile prod up -d --build
HMR 안 됨 (개발 모드)
bash# vite.config.js 확인
# watch: { usePolling: true } 있는지 확인

docker-compose --profile dev restart web-dev

9. 빠른 시작 스크립트
dev.bat (개발 시작)
batch@echo off
echo 🚀 개발 환경 시작...
docker-compose --profile dev up -d
echo ✅ 완료! http://localhost:3000
docker-compose --profile dev logs -f
prod-test.bat (프로덕션 테스트)
batch@echo off
echo 🏗️ 프로덕션 테스트 환경 빌드 중...
docker-compose --profile prod up -d --build
echo ✅ 완료! http://localhost:8080
docker-compose --profile prod logs -f
stop.bat (중지)
batch@echo off
echo 🛑 전체 중지...
docker-compose --profile dev --profile prod down
echo ✅ 중지 완료!

10. 실행 테스트
bash# 1. 개발 모드 시작
docker-compose --profile dev up -d

# 2. 로그 확인
docker-compose --profile dev logs -f

# 3. 브라우저 접속
# http://localhost:3000

# 4. 코드 수정 테스트
# frontend/src/App.vue 수정
# → 브라우저 자동 새로고침 확인

# 5. 중지
docker-compose --profile dev down

✅ 하이브리드 구조 설정 완료!
이제 다음 명령어로 시작하세요:
bash# 개발 시작 (권장)
docker-compose --profile dev up -d

# 또는 프로덕션 테스트
docker-compose --profile prod up -d --build