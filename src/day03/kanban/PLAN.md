# 칸반 보드 구현 계획

## Context

`src/exercise/yuuny05/day03/kanban/` 디렉터리에 드래그 앤 드롭이 가능한 칸반 보드를 HTML/CSS/JS 세 파일로 구현하고, Supabase Auth(이메일, Google, GitHub)와 Supabase PostgreSQL 카드 저장을 추가한다.

---

## 파일 구성

| 파일 | 역할 |
|------|------|
| `index.html` | 인증 오버레이 + 3-컬럼 보드 구조 |
| `style.css` | 레이아웃, 드래그 피드백, 인증 UI 스타일 |
| `app.js` | Supabase 인증, CRUD, 드래그 앤 드롭, 카드 추가/삭제 |

---

## 구현 세부 사항

### index.html
- Supabase JS v2 CDN `<script>` (defer 없이 동기 로드)
- `<header>` — 타이틀 + `.user-info` (user-email, btn-logout)
- `<div id="auth-overlay">` — 이메일 폼, 로그인/회원가입 토글, Google/GitHub 버튼
- `<main id="board" hidden>` — 세 컬럼 (인증 전 숨김)

### style.css
- 기존 CSS 변수에 `--color-github`, `--shadow-auth-card`, `--z-overlay` 추가
- `.app-header` — `display: flex; justify-content: space-between`
- 인증 오버레이 전체 화면 모달 스타일, OAuth 버튼 스타일

### app.js
- Supabase 클라이언트 초기화 (`SUPABASE_URL`, `SUPABASE_ANON_KEY` 상수)
- `onAuthStateChange` — 인증 상태 변화 시 showAuthView / showBoardView 자동 호출
- 이메일 signUp / signIn / Google OAuth / GitHub OAuth / signOut
- `loadCards` → DB SELECT → `renderCards` (DOM 렌더링)
- `insertCard` / `deleteCardFromDB` / `updateCardColumn` — Supabase CRUD
- `createCard(text, columnId, dbId)` — dbId를 `data-id`로 사용
- `addCard` / `deleteCard` / `handleDrop` — async로 전환, DB 연동

---

## Supabase 설정 순서

1. SQL Editor에서 `cards` 테이블 + RLS 4개 정책 실행
2. Authentication → Providers: Email, Google, GitHub 활성화
3. Authentication → URL Configuration: `http://localhost:8765` 추가
4. `app.js` 상단 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 실제 값으로 교체

---

## 실행 방법

```bash
# 1. app.js 상단에 Supabase URL과 ANON_KEY 입력 후
cd src/exercise/yuuny05/day03/kanban
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765/index.html 접속
```

---

## 검증

1. 앱 로드 시 인증 오버레이 표시 확인
2. 이메일 회원가입 → 보드 표시, 헤더에 이메일 확인
3. 새로고침 → 카드 유지 (Supabase DB 로드)
4. 카드 이동 → Supabase Table Editor에서 `column_id` 변경 확인
5. 다른 계정 로그인 → 이전 카드 미표시 (RLS 확인)
6. Google OAuth 흐름 정상 동작 확인
7. GitHub OAuth 흐름 정상 동작 확인
8. 로그아웃 → 오버레이 표시, 보드 숨김
9. 브라우저 콘솔 에러 없음
