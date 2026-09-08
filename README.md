# 소비 — 소상공인 정책자금 플랫폼

## 개발 환경 준비 (처음 한 번)

### 1. 환경변수 파일

### 2. DB · Redis 띄우기 (Docker Desktop 필요)
서버와 같은 버전(PostgreSQL 16 + pgvector, Redis 7)이 각자 노트북에 뜹니다.
`docker compose -f deploy/docker-compose.local.yml ps` 로 둘 다 healthy 확인.

| 항목 | 값 |
|---|---|
| Host | localhost |
| Port | 5432 (Redis 6379) |
| Database | sobi |
| User | sobi |
| Password | localdev |

**서버 DB에 직접 붙어서 작업하지 마세요.** 서로 데이터를 깨뜨립니다.

---

## 폴더 규칙

작업 폴더에 소스를 넣으면 CI가 자동으로 잡습니다.
`Dockerfile` 과 소스가 **둘 다** 있어야 그 파트 빌드가 켜집니다.

| 폴더 | 담당 | 필요한 파일 |
|---|---|---|
| `backend/` | 백엔드 | `Dockerfile`, `build.gradle` 또는 `pom.xml` |
| `frontend/` | 프론트 | `Dockerfile`, `package.json` (+ `package-lock.json`) |
| `ai/` | AI | `Dockerfile`, `requirements.txt` |
| `deploy/` | 인프라 | compose 파일 |

---

## 배포

`master` 에 머지되면 자동으로 빌드·배포됩니다.

- 서비스 : https://j15d101.p.ssafy.io
- Jenkins : https://j15d101.p.ssafy.io/jenkins/ (계정은 인프라 담당에게)

---

## 주의

- `.env`, `*.pem`, DB 백업(`*.dump`) 은 **절대 커밋 금지**
- `master` 직접 push 불가 — 브랜치 파서 MR
- API 호출은 절대 주소 대신 `/api/...` 상대 경로로
- 운영 DB/Redis 비밀번호는 코드에 넣지 말고 환경변수로

