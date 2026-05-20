# TRD — 기술 요구사항 정의서

## 1. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 마크업 | HTML5 | 시맨틱 태그 사용 |
| 스타일 | CSS3 | Flexbox 레이아웃, CSS 변수 |
| 동작 | Vanilla JavaScript (ES6+) | 외부 라이브러리 없음 |
| 인증 | Supabase Auth | 이메일/비밀번호, Google OAuth, GitHub OAuth |
| 데이터 | Supabase PostgreSQL | RLS 적용, 사용자별 데이터 격리 |
| 클라이언트 SDK | Supabase JS v2 (CDN) | `@supabase/supabase-js@2` |
| 실행 | 브라우저 + 로컬 HTTP 서버 | `python3 -m http.server 8765` |

---

## 2. 파일 구조

```
kanban/
├── index.html      # 뷰 구조 (인증 오버레이 + 보드)
├── style.css       # 스타일 (인증 UI 포함)
├── app.js          # 비즈니스 로직, 인증, Supabase CRUD
├── PLAN.md
├── PRD.md
├── TRD.md
├── USER_FLOW.md
├── DATABASE_DESIGN.md
├── DESIGN_SYSTEM.md
├── TASKS.md
└── CODING_CONVENTION.md
```

---

## 3. HTML 구조 명세

```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <!-- defer 없이 동기 로드 — app.js(defer)가 실행될 때 window.supabase 준비 완료 -->
</head>
<body>
  <header class="app-header">         <!-- 앱 타이틀 + 사용자 정보/로그아웃 -->
    <h1 class="app-title">...</h1>
    <div class="user-info" id="user-info" hidden>
      <span class="user-email" id="user-email"></span>
      <button class="btn-logout" id="btn-logout">로그아웃</button>
    </div>
  </header>

  <!-- 인증 오버레이: 비로그인 시 표시, 로그인 후 hidden -->
  <div id="auth-overlay" class="auth-overlay" role="dialog" aria-modal="true">
    <div class="auth-card">
      <h2 class="auth-title" id="auth-title">로그인</h2>
      <p class="auth-error" id="auth-error" role="alert" hidden></p>
      <form class="auth-form" id="auth-form" novalidate>
        <input id="input-email" type="email">
        <input id="input-password" type="password">
        <button id="btn-auth-submit" type="submit">로그인</button>
      </form>
      <button id="btn-auth-toggle">회원가입</button>
      <button id="btn-google">Google로 로그인</button>
      <button id="btn-github">GitHub로 로그인</button>
    </div>
  </div>

  <!-- 보드: 로그인 전 hidden, 로그인 후 표시 -->
  <main class="board" id="board" hidden>
    <section class="column" id="todo">
      <div class="column-header">...</div>
      <div class="card-list" role="list"></div>
      <div class="add-card">
        <input type="text" class="card-input">
        <button class="btn-add">추가</button>
      </div>
    </section>
    <!-- #in-progress, #done 동일 구조 -->
  </main>

  <script src="app.js" defer></script>
</body>
```

---

## 4. JavaScript 모듈 설계

### 4.1 데이터 모델

```js
// 카드 객체 (Supabase DB 스키마)
{
  id:         string,   // UUID (Supabase DB 기본키)
  user_id:    string,   // UUID (auth.users FK)
  column_id:  string,   // 'todo' | 'in-progress' | 'done'
  text:       string,   // 카드 텍스트
  order:      number,   // 컬럼 내 순서
  created_at: string    // ISO 8601
}
```

### 4.2 함수 목록

#### 인증 관련

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `signUpWithEmail` | `async (email, password) → {data, error}` | 이메일/비밀번호 회원가입 |
| `signInWithEmail` | `async (email, password) → {data, error}` | 이메일/비밀번호 로그인 |
| `signInWithGoogle` | `async () → void` | Google OAuth 리디렉션 |
| `signInWithGitHub` | `async () → void` | GitHub OAuth 리디렉션 |
| `handleSignOut` | `async () → void` | 로그아웃 |
| `handleAuthSubmit` | `async (e) → void` | 폼 제출 핸들러 (mode에 따라 가입/로그인) |

#### UI 전환

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `showAuthView` | `() → void` | 인증 오버레이 표시, 보드 숨김 |
| `showBoardView` | `(user) → void` | 보드 표시, 오버레이 숨김, loadCards 호출 |
| `setAuthMode` | `(mode: 'login'\|'signup') → void` | 폼 UI를 로그인/회원가입으로 전환 |
| `showError` | `(message) → void` | #auth-error 요소에 에러 표시 |
| `clearError` | `() → void` | 에러 메시지 초기화 |

#### Supabase CRUD

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `loadCards` | `async (userId) → void` | DB에서 사용자 카드 조회 → renderCards |
| `insertCard` | `async (text, columnId, userId, order) → {id}\|null` | 카드 DB INSERT |
| `deleteCardFromDB` | `async (id) → void` | 카드 DB DELETE |
| `updateCardColumn` | `async (id, newColumnId) → void` | 카드 column_id UPDATE |
| `renderCards` | `(cards) → void` | DB 카드 배열을 DOM으로 렌더링 |

#### 카드 / 드래그 (기존 유지·수정)

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `createCard` | `(text, columnId, dbId) → HTMLElement` | 카드 DOM 요소 생성 |
| `addCard` | `async (columnId) → void` | DB INSERT 후 DOM 반영 |
| `deleteCard` | `async (cardEl) → void` | DB DELETE 후 DOM 제거 |
| `updateCount` | `(columnId) → void` | 컬럼 카드 수 뱃지 갱신 |
| `handleDragStart` | `(e) → void` | dataTransfer 설정, .dragging 추가 |
| `handleDragEnd` | `(e) → void` | .dragging 제거, drag-over 정리 |
| `handleDragOver` | `(e) → void` | preventDefault, .drag-over 추가 |
| `handleDragLeave` | `(e) → void` | .drag-over 제거 |
| `handleDrop` | `async (e) → void` | 카드 이동, 컬럼 변경 시 DB UPDATE |

#### 이벤트 등록

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `initColumns` | `() → void` | 컬럼별 drag/drop/add/Enter 이벤트 등록 |
| `initAuthEvents` | `() → void` | 인증 UI 이벤트 일괄 등록 |

### 4.3 인증 상태 리스너

```js
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showBoardView(session.user);
  else               showAuthView();
});
```

OAuth 리디렉션 복귀 시에도 자동으로 세션이 감지되어 보드가 표시된다.

### 4.4 이벤트 흐름 (드래그 앤 드롭, 기존 동일)

```
[카드 dragstart]
  → dataTransfer.setData('cardId', card.dataset.id)  ← DB UUID
  → card.classList.add('dragging')

[컬럼 dragover]
  → e.preventDefault()
  → column.classList.add('drag-over')

[컬럼 dragleave]
  → column.classList.remove('drag-over')

[컬럼 drop]
  → cardId = dataTransfer.getData('text/plain')
  → await updateCardColumn(cardId, column.id)  ← DB UPDATE
  → column.querySelector('.card-list').appendChild(cardEl)
  → 양쪽 컬럼 updateCount
```

---

## 5. CSS 설계

### 5.1 레이아웃

```css
.board   { display: flex; gap: 1.5rem; align-items: flex-start; }
.column  { flex: 1; min-width: 260px; }
.app-header { display: flex; align-items: center; justify-content: space-between; }
```

### 5.2 상태 클래스

| 클래스 | 적용 대상 | 효과 |
|--------|----------|------|
| `.dragging` | `.card` | `opacity: 0.45`, `box-shadow` 강조 |
| `.drag-over` | `.column` | 배경색 밝아짐, `border` 점선 강조 |
| `[hidden]` | `#auth-overlay`, `#board`, `.user-info` | `display: none` |

### 5.3 인증 컴포넌트

| 클래스 | 역할 |
|--------|------|
| `.auth-overlay` | 전체 화면 모달 배경 |
| `.auth-card` | 로그인 폼 카드 |
| `.btn-oauth.btn-google` | Google 버튼 (흰 배경) |
| `.btn-oauth.btn-github` | GitHub 버튼 (#24292F 배경) |
| `.auth-error` | 에러 메시지 (빨간 배경) |

---

## 6. 브라우저 API

| API | 용도 |
|-----|------|
| `HTMLElement.draggable = true` | 카드 드래그 활성화 |
| `DataTransfer.setData / getData` | 드래그 중 카드 ID 전달 |
| `Event.preventDefault()` | dragover 기본 동작 차단 |
| `supabase.createClient()` | Supabase 클라이언트 초기화 |
| `supabaseClient.auth.*` | 인증 (signUp, signIn, signOut, onAuthStateChange) |
| `supabaseClient.from('cards').*` | 카드 CRUD |

---

## 7. 성능 / 접근성 고려사항

- 이벤트 리스너는 컬럼 단위 이벤트 위임으로 등록하여 메모리 절약.
- `<button>` 사용으로 키보드 포커스 접근 가능.
- 인증 오버레이에 `role="dialog"`, `aria-modal="true"` 추가.
- 에러 메시지 영역에 `role="alert"` 추가로 스크린 리더 지원.

---

## 8. 실행 환경

```bash
# 1. Supabase URL과 ANON_KEY를 app.js 상단에 입력
# 2. 로컬 서버 실행
cd src/exercise/yuuny05/day03/kanban
python3 -m http.server 8765

# 접속
http://localhost:8765/index.html
```
