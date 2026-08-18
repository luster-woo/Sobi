# Git 컨벤션

## 도구 역할

- **Jira** → 무엇을 할지 (작업 계획·추적)
- **GitLab** → 어떻게 했는지 (코드·리뷰)
- 이슈 키(`S15P11D104-12`)로 서로 연결

## 전체 작업 흐름

1. **Jira 이슈 생성** (작업 전에 가장 먼저!) → 이슈 키 확인
2. **브랜치 생성** — `feature(fe)/S15P11D104-12-login-page`
3. **커밋** — 아래 커밋 컨벤션 준수
4. **MR 생성** — target은 `develop`, 템플릿 사용
5. **리뷰 → develop 병합**
6. 배포 시점에 **develop → main** (자동 배포)

> 👉 **작업 전에 Jira 이슈(작업)부터 만든다**
> 

---

## 브랜치 전략

```
main ← develop ← feature 브랜치
```

- **main** : 배포용, 직접 push 금지 (MR로만 병합)
- **develop** : 개발 통합 브랜치 (기본 브랜치), 평소 작업은 여기로 MR
- **feature/fix/docs/...** : 개인 작업 브랜치

*(main·develop은 MR로만 병합 가능하게 보호돼 있음)*

### 브랜치 네이밍

형식: `{prefix}({scope})/{이슈키}-{작업명}`

예)

- `feature(fe)/S15P11D104-58-login-page`
- `fix(be)/S15P11D104-72-socket-reconnect`
- `docs(docs)/S15P11D104-12-add-convention`

### Scope

- fe / be / ai / infra / docs

**Prefix (커밋 type과 동일)**

| Prefix | 용도 |
| --- | --- |
| feature | 새로운 기능 개발 |
| fix | 버그 수정 |
| refactor | 리팩토링 |
| docs | 문서 작업 |
| chore | 설정·빌드·패키지 작업 |
| hotfix | main 긴급 수정 (main에서 분기) |

**규칙**

- 이슈키는 Jira 키 전체를 그대로 사용 (예: `S15P11D104-58`)
- 작업명은 영어 소문자 + 하이픈(kebab-case), 2~4단어 이내
    - ⭕ `feature(fe)/S15P11D104-58-login-page`
    - ❌ `feature(fe)/S15P11D104-58-로그인페이지`
    - ❌ `feature(fe)/S15P11D104-58-login_page`
    - ❌ `feature(fe)/S15P11D104-58-implement-the-login-page-ui`
    - ❌ `feature/S15P11D104-58-login-page` (scope 누락)
- 브랜치명에 공백·대문자·특수문자 사용 금지
- 하나의 브랜치는 하나의 이슈만 담당 (여러 작업 섞지 않기)

### 브랜치 생성 시 필수 절차

반드시 develop 최신 상태에서 분기할 것. 현재 있는 브랜치 기준으로 따지 않도록 주의!

```bash
git checkout develop
git pull origin develop
git checkout -b feature(fe)/S15P11D104-58-login-page
```

### 브랜치 삭제

- MR 병합 시 "Delete source branch" 체크 → 자동 정리
- 원격에서 삭제된 브랜치가 로컬에 남아있으면: `git fetch --prune`

### 병합 규칙

- 작업 브랜치 → develop : MR로 별도의 승인 없이 병합 가능
- develop → main : 배포 시점에 팀 합의 후 MR (병합 시 자동 배포)
- main hotfix 후에는 반드시 main → develop 재병합

---

## 커밋 컨벤션

형식: `{type}({scope}): {subject}`

예)

- `feat(fe): 로그인 페이지 UI 구현`
- `fix(be): WebSocket 세션 종료 시 NPE 수정`
- `fix(be): 세션 종료 NPE 수정`

### Scope

- fe / be / ai / infra / docs

### Type 매핑

| Type | 설명 |
| --- | --- |
| feat | 새로운 기능 |
| fix | 버그 수정 |
| refactor | 리팩토링 (기능 변화 없음) |
| style | 코드 포맷팅, 세미콜론 등 (동작 변화 없음) |
| docs | 문서 수정 |
| test | 테스트 코드 |
| chore | 빌드, 설정, 패키지 매니저 수정 |
| hotfix | 긴급 수정 |

### 규칙

- subject는 50자 이내, 마침표 없이
- 본문이 필요하면 한 줄 띄우고 "무엇을, 왜" 위주로 작성
- 이슈 연결 시 푸터에: `Closes S15P11D104-58`

---

## MR 컨벤션

- MR target: `develop`, 템플릿 사용
- MR 제목: `[S15P11D104] 로그인 페이지 구현`
- 리뷰 후 Approve 확인 → develop 병합
- main은 직접 건드리지 않기

---

## 한 줄 요약

**이슈부터 → 이슈키 넣기 → 브랜치/커밋 모두 `{type}({scope})` 형식 준수 → develop MR → 리뷰(Approve 확인) 병합 / main은 건드리지 않기**