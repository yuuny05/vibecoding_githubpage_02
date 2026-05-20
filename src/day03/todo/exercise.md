# 소셜 로그인 추가 실행 계획서

Google / GitHub OAuth 로그인을 기존 Supabase 이메일 인증에 통합합니다.

---

## 현재 상태

- Supabase 이메일/비밀번호 인증 완료 (`app.js` — `handleAuthSubmit`)
- `auth-overlay` UI: 로그인 · 회원가입 탭 + 이메일/비밀번호 입력 폼
- RLS: `auth.uid() = user_id` 정책 적용 중

---

## 작업 범위

| # | 대상 | 작업 내용 |
|---|---|---|
| 1 | Supabase 콘솔 | Google / GitHub OAuth 공급자 활성화 |
| 2 | Google Cloud Console | OAuth 2.0 클라이언트 발급 |
| 3 | GitHub Developer Settings | OAuth App 등록 |
| 4 | `index.html` | 소셜 로그인 버튼 2개 추가 |
| 5 | `style.css` | 소셜 버튼 스타일 (브랜드 컬러) |
| 6 | `app.js` | `signInWithOAuth` 호출 함수 추가 |

---

## Step 1 — Supabase 콘솔: OAuth 공급자 설정

경로: **Supabase Dashboard → Authentication → Providers**

### Google

1. `Google` 토글 → **Enable** 클릭
2. `Client ID` / `Client Secret` 입력 (Step 2에서 발급)
3. **Authorized redirect URI** 복사 (형식: `https://<project>.supabase.co/auth/v1/callback`)
4. **Save** 클릭

### GitHub

1. `GitHub` 토글 → **Enable** 클릭
2. `Client ID` / `Client Secret` 입력 (Step 3에서 발급)
3. 동일한 redirect URI 사용
4. **Save** 클릭

---

## Step 2 — Google Cloud Console: OAuth 클라이언트 발급

1. [https://console.cloud.google.com](https://console.cloud.google.com) 접속
2. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 승인된 리디렉션 URI에 Supabase redirect URI 추가
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
5. **클라이언트 ID**와 **클라이언트 보안 비밀** 복사 → Supabase에 입력

> OAuth 동의 화면이 없으면 먼저 **OAuth 동의 화면** 탭에서 앱 이름 / 이메일 등록 필요.

---

## Step 3 — GitHub: OAuth App 등록

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 항목 입력:
   | 필드 | 값 |
   |---|---|
   | Application name | Todo App |
   | Homepage URL | 앱 배포 URL 또는 `http://localhost:8765` |
   | Authorization callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` |
3. **Register application** 클릭
4. **Client ID** 복사, **Generate a new client secret** 클릭 후 **Client Secret** 복사
5. 두 값을 Supabase GitHub 공급자 설정에 입력

---

## Step 4 — `index.html` 수정

`auth-form` 블록 아래에 구분선과 소셜 버튼 2개를 추가합니다.

```html
<!-- 기존 auth-submit 버튼 아래에 추가 -->
<div class="auth-divider"><span>또는</span></div>

<div class="auth-social">
  <button id="google-login" class="auth-social-btn auth-social-btn--google">
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
    Google로 계속하기
  </button>

  <button id="github-login" class="auth-social-btn auth-social-btn--github">
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
    GitHub로 계속하기
  </button>
</div>
```

---

## Step 5 — `style.css` 추가

```css
/* 소셜 로그인 구분선 */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0 0.75rem;
  color: #aaa;
  font-size: 0.75rem;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0d6f5;
}

/* 소셜 버튼 공통 */
.auth-social {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.auth-social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  border: 1.5px solid #e0d6f5;
  background: #fff;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.auth-social-btn:hover {
  background: #f5f0ff;
  border-color: #6750a4;
}

/* GitHub 버튼: 다크 테마 */
.auth-social-btn--github {
  background: #24292e;
  border-color: #24292e;
  color: #fff;
}
.auth-social-btn--github:hover {
  background: #1b1f23;
  border-color: #1b1f23;
}
```

---

## Step 6 — `app.js` 수정

### 6-1. 소셜 로그인 함수 추가

기존 `handleAuthSubmit` 함수 아래에 추가합니다.

```js
async function signInWithProvider(provider) {
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) {
    authError.textContent = authErrMsg(error.message);
  }
}
```

### 6-2. 이벤트 리스너 연결

기존 `authSubmit.addEventListener` 블록 근처에 추가합니다.

```js
document.getElementById('google-login').addEventListener('click', () => signInWithProvider('google'));
document.getElementById('github-login').addEventListener('click', () => signInWithProvider('github'));
```

### 6-3. `showApp` 소셜 계정 표시 처리

소셜 로그인 시 `user.email`이 없을 수 있어 `user_metadata`를 fallback으로 사용합니다.

```js
function showApp(user) {
  currentUser = user;
  authOverlay.classList.add('is-hidden');
  if (userEmailEl) {
    userEmailEl.textContent =
      user.email ||
      user.user_metadata?.full_name ||
      user.user_metadata?.user_name ||
      '사용자';
  }
}
```

---

## 동작 흐름

```
사용자 클릭
  → signInWithProvider('google' | 'github')
  → Supabase가 OAuth URL로 리디렉트
  → 공급자 인증 완료
  → redirectTo URL로 복귀 (토큰 URL fragment 포함)
  → db.auth.onAuthStateChange 발화 (session 수신)
  → showApp(user) → 앱 표시 + todos 로드
```

---

## 로컬 개발 시 주의사항

- OAuth redirect URI에 `http://localhost:8765`를 추가해야 로컬에서 동작합니다.
  - Google Cloud Console → 승인된 리디렉션 URI에 추가
  - GitHub OAuth App → Authorization callback URL에 `http://localhost:8765` 추가
- Supabase 대시보드 → **Authentication → URL Configuration → Redirect URLs** 에도 `http://localhost:8765`를 추가합니다.

---

## 완료 체크리스트

- [ ] Supabase Google 공급자 활성화
- [ ] Supabase GitHub 공급자 활성화
- [ ] Google Cloud Console OAuth 클라이언트 발급 및 redirect URI 등록
- [ ] GitHub OAuth App 등록 및 Client Secret 발급
- [ ] `index.html` — 소셜 버튼 추가
- [ ] `style.css` — 소셜 버튼 스타일 추가
- [ ] `app.js` — `signInWithProvider` 함수 추가 및 이벤트 연결
- [ ] `app.js` — `showApp` 표시명 fallback 처리
- [ ] 로컬 + 배포 환경에서 Google 로그인 테스트
- [ ] 로컬 + 배포 환경에서 GitHub 로그인 테스트
