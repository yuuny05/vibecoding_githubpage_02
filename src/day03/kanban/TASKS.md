# TASKS — 작업 목록

## 진행 상태 범례

- `[ ]` 미완료
- `[x]` 완료
- `[-]` 진행 중

---

## Phase 0 — 문서 작업

- [x] PLAN.md 작성
- [x] PRD.md 작성
- [x] TRD.md 작성
- [x] USER_FLOW.md 작성
- [x] DATABASE_DESIGN.md 작성
- [x] DESIGN_SYSTEM.md 작성
- [x] TASKS.md 작성
- [x] CODING_CONVENTION.md 작성
- [x] Supabase 인증 추가에 따른 PRD.md 업데이트
- [x] Supabase 인증 추가에 따른 TRD.md 업데이트
- [x] Supabase 인증 추가에 따른 DATABASE_DESIGN.md 업데이트
- [x] Supabase 인증 추가에 따른 USER_FLOW.md 업데이트
- [x] Supabase 인증 추가에 따른 PLAN.md 업데이트
- [x] Supabase 인증 추가에 따른 TASKS.md 업데이트

---

## Phase 1 — 마크업 (index.html)

- [x] `<head>` 설정: charset, viewport, title, CSS 링크
- [x] Supabase JS v2 CDN `<script>` 태그 추가 (defer 없이)
- [x] `<header>` — 앱 타이틀 + user-info (user-email, btn-logout)
- [x] `<div id="auth-overlay">` — 인증 오버레이 마크업
  - [x] 이메일/비밀번호 폼 (#auth-form, #input-email, #input-password)
  - [x] 에러 메시지 영역 (#auth-error)
  - [x] 로그인/회원가입 토글 버튼 (#btn-auth-toggle)
  - [x] Google OAuth 버튼 (#btn-google)
  - [x] GitHub OAuth 버튼 (#btn-github)
- [x] `<main id="board" hidden>` — 보드 컨테이너 (초기 숨김)
- [x] `<section class="column" id="todo">` 구조 작성
- [x] `#in-progress` 컬럼 동일 구조
- [x] `#done` 컬럼 동일 구조
- [x] `<script src="app.js" defer>` 연결

---

## Phase 2 — 스타일 (style.css)

- [x] CSS 변수 `:root` 선언 (DESIGN_SYSTEM.md 기반)
- [x] 신규 CSS 변수 추가: `--color-github`, `--shadow-auth-card`, `--z-overlay`
- [x] `.app-header` — `display: flex; justify-content: space-between` 추가
- [x] `.board` Flexbox 레이아웃
- [x] `.column` 스타일 + `.column.drag-over`
- [x] `.card` 스타일 + `.card.dragging`
- [x] `.btn-delete` 스타일
- [x] `.add-card` 입력창 + 버튼
- [x] 인증 오버레이 스타일 (`.auth-overlay`, `.auth-card`)
- [x] 에러 메시지 스타일 (`.auth-error`)
- [x] 인증 폼 스타일 (`.auth-form`, `.auth-input`, `.btn-auth-submit`)
- [x] 토글 버튼 스타일 (`.btn-auth-toggle`)
- [x] 구분선 스타일 (`.auth-divider`)
- [x] OAuth 버튼 스타일 (`.btn-oauth`, `.btn-google`, `.btn-github`)
- [x] 헤더 user-info 스타일 (`.user-info`, `.user-email`, `.btn-logout`)
- [x] 반응형: 화면 너비 < 640px일 때 컬럼 세로 배치

---

## Phase 3 — 동작 (app.js)

- [x] Supabase 설정 상수 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [x] `supabase.createClient()` 초기화
- [x] `currentUser` 상태 변수
- [x] `showError` / `clearError` 유틸 함수
- [x] `setAuthMode` — 로그인/회원가입 폼 전환
- [x] `showAuthView` / `showBoardView` — UI 전환
- [x] `signUpWithEmail` / `signInWithEmail` 구현
- [x] `signInWithGoogle` / `signInWithGitHub` 구현
- [x] `handleSignOut` 구현
- [x] `handleAuthSubmit` — 폼 제출 핸들러
- [x] `loadCards` — DB SELECT → renderCards
- [x] `insertCard` — DB INSERT
- [x] `deleteCardFromDB` — DB DELETE
- [x] `updateCardColumn` — DB UPDATE
- [x] `renderCards` — DB 카드 배열 DOM 렌더링
- [x] `createCard(text, columnId, dbId)` — dbId 파라미터 추가
- [x] `addCard` — async, DB INSERT 연동
- [x] `deleteCard` — async, DB DELETE 연동
- [x] `handleDrop` — async, 컬럼 이동 시 DB UPDATE
- [x] `updateCount` — 카드 수 뱃지 갱신
- [x] 드래그 핸들러 유지 (handleDragStart, handleDragEnd, handleDragOver, handleDragLeave)
- [x] `initColumns` — 컬럼 이벤트 등록
- [x] `initAuthEvents` — 인증 이벤트 등록
- [x] `onAuthStateChange` 리스너 등록
- [x] SAMPLE_CARDS / initSampleCards 제거

---

## Phase 4 — Supabase 대시보드 설정

- [ ] SQL Editor: `public.cards` 테이블 생성
- [ ] SQL Editor: idx_cards_user_column 인덱스 생성
- [ ] SQL Editor: RLS 활성화 + 정책 4개 설정
- [ ] Authentication → Providers: Email 활성화 (Confirm email OFF)
- [ ] Authentication → Providers: Google OAuth 설정 (Client ID/Secret)
- [ ] Authentication → Providers: GitHub OAuth 설정 (Client ID/Secret)
- [ ] Authentication → URL Configuration: localhost:8765 추가
- [ ] app.js에 실제 SUPABASE_URL, SUPABASE_ANON_KEY 입력

---

## Phase 5 — 검증 (브라우저)

- [ ] HTTP 서버 구동 및 index.html 200 응답 확인
- [ ] 앱 로드 시 인증 오버레이 표시 확인
- [ ] 이메일 회원가입 → 보드 표시, 헤더에 이메일 확인
- [ ] 로그아웃 → 오버레이 표시, 보드 hidden 확인
- [ ] 이메일/비밀번호 로그인 → 보드 표시 확인
- [ ] 카드 추가 → Supabase Table Editor에서 row 생성 확인
- [ ] 새로고침 → 카드 유지 확인 (DB 로드)
- [ ] 카드 드래그 이동 → column_id 변경 확인
- [ ] 카드 삭제 → row 삭제 확인
- [ ] 다른 계정 로그인 → 이전 카드 미표시 (RLS 확인)
- [ ] Google OAuth 리디렉션 → 보드 표시 확인
- [ ] GitHub OAuth 리디렉션 → 보드 표시 확인
- [ ] 빈 입력으로 카드 추가 시 동작 없음 확인
- [ ] 브라우저 콘솔 에러 없음

---

## Phase 6 — 커밋

- [ ] `git add src/exercise/yuuny05/day03/kanban/`
- [ ] `git commit -m "feat(kanban): Supabase 인증(이메일/Google/GitHub) 및 DB 카드 저장 추가"`
- [ ] `git pull --no-rebase origin main`
- [ ] `git push origin main`
