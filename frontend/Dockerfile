# ---------- 빌드 ----------
FROM node:22-alpine AS build
WORKDIR /src

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# 목 데이터(MSW)를 켠 채로 빌드한다.
#
# .dockerignore 가 `.env.*` 를 막아 frontend/.env.production 이 이 컨테이너 안에는
# 없다. 그래서 파일이 아니라 빌드 인자로 넘긴다.
#
# ⚠️ 백엔드 auth 가 붙으면 false 로 바꿀 것. 목이 켜져 있으면 실제 API 를 가로챈다.
ARG VITE_USE_MOCK=true
ENV VITE_USE_MOCK=$VITE_USE_MOCK

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
