# ---------- 빌드 ----------
FROM node:20-alpine AS build
WORKDIR /src

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
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
