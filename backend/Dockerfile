# ---------- 빌드 ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /src

# 의존성 정의부터 먼저 복사 → 소스만 바뀌면 의존성 다운로드를 건너뜁니다
COPY gradlew ./
COPY gradle ./gradle
COPY settings.gradle* build.gradle* ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ---------- 실행 ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
ENV TZ=Asia/Seoul
COPY --from=build /src/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "app.jar"]
