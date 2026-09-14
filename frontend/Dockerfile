# ---------- 빌드 ----------
FROM node:22-alpine AS build
WORKDIR /src

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# 배포 빌드는 목을 끈다.
#
# .dockerignore 가 `.env.*` 를 막아 frontend/.env.* 가 이 컨테이너 안에는 없다.
# 그래서 파일이 아니라 빌드 인자로 넘긴다.
#
# ⚠️ true 로 켜면 목 코드와 mockServiceWorker.js 가 번들에 실려 배포된다.
#    가짜 사업자번호·계좌번호가 그대로 나가고, 서비스워커가 요청을 가로채는
#    표면이 생긴다. 시연 목적으로 켤 때만 빌드 인자로 덮어쓸 것.
#
#    docker build --build-arg VITE_USE_MOCK=true --build-arg VITE_MOCK_DOMAINS=loan,support .
ARG VITE_USE_MOCK=false
ENV VITE_USE_MOCK=$VITE_USE_MOCK

ARG VITE_MOCK_DOMAINS=
ENV VITE_MOCK_DOMAINS=$VITE_MOCK_DOMAINS

# 구글 OAuth. 클라이언트 ID 는 공개값이다 (비밀은 clientSecret, 서버만 보유).
# 리디렉션 URI 는 배포 도메인 기준으로 넘기고 구글 콘솔에도 같이 등록해야 한다.
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

ARG VITE_GOOGLE_REDIRECT_URI=
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI

RUN npm run build

# Vite(dist) / CRA(build) 어느 쪽이든 /out 으로 모음
RUN mkdir -p /out && \
    if [ -d dist ]; then cp -r dist/. /out; \
    elif [ -d build ]; then cp -r build/. /out; \
    else echo "빌드 결과 폴더를 찾을 수 없습니다"; exit 1; fi

# ---------- 실행 ----------
FROM nginx:1.27-alpine
COPY --from=build /out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
