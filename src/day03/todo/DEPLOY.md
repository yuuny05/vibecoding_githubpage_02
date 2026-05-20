# 배포 및 실행 가이드

이 앱은 **순수 정적 파일(HTML/CSS/JS)** + **Supabase 백엔드** 조합입니다.  
서버 사이드 코드가 없으므로 정적 호스팅이면 어디든 배포할 수 있습니다.

---

## 아키텍처 요약

```
브라우저 (index.html + style.css + app.js)
    │
    │  Supabase JS SDK (CDN)
    ▼
Supabase (beahwishizeovioqezad.supabase.co)
    ├── Auth  — 이메일/비밀번호 회원가입·로그인
    └── todos 테이블  — 할일 데이터 (RLS: 본인 데이터만 접근)
```

---

## Supabase 설정 상태

### 테이블 스키마 (`todos`)

```sql
CREATE TABLE todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('high', 'medium', 'low')),
  done        BOOLEAN     NOT NULL DEFAULT false,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID        REFERENCES auth.users(id)
);
```

### RLS 정책

```sql
-- 로그인한 사용자가 본인 데이터만 읽기/쓰기/삭제
CREATE POLICY "own_todos" ON todos
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 인증 설정 (Supabase 대시보드)

| 항목 | 설정값 | 위치 |
|---|---|---|
| Email 로그인 | **활성화** | Authentication → Providers → Email |
| 이메일 확인 필수 | ON / OFF 선택 | Authentication → Settings → Enable email confirmations |

> **이메일 확인을 OFF**로 설정하면 회원가입 즉시 로그인됩니다 (개발/테스트 편의).  
> 실서비스 배포 시에는 ON으로 유지하는 것을 권장합니다.

---

## 로컬 개발 서버 실행

`index.html`이 외부 CSS/JS 파일을 참조하므로 반드시 HTTP 서버로 열어야 합니다.

```bash
# todo 디렉터리에서 실행
cd src/exercise/yuuny05/day03/todo
python3 -m http.server 8765
```

브라우저에서 접속:
```
http://localhost:8765/index.html
```

WSL 환경이면 Windows 브라우저에서 동일한 URL로 접속 가능합니다.

---

## 정적 호스팅 배포 (외부 공개)

`index.html`, `style.css`, `app.js` 세 파일만 있으면 됩니다.

### 옵션 A — Netlify Drop (가장 빠름, 무료)

1. [https://app.netlify.com/drop](https://app.netlify.com/drop) 접속
2. `todo/` 폴더를 드래그앤드롭
3. 자동 생성된 URL 복사 (예: `https://xxx.netlify.app`)
4. Supabase → **Authentication → URL Configuration** 에서 아래 항목 추가:
   - **Site URL**: `https://xxx.netlify.app`
   - **Redirect URLs**: `https://xxx.netlify.app`

### 옵션 B — GitHub Pages

1. `todo/` 안의 파일을 GitHub 레포지토리에 push
2. 레포 Settings → Pages → Branch: `main` / 폴더: `/root` 또는 `/docs`
3. 배포 URL을 Supabase URL Configuration에 등록 (위 옵션 A와 동일)

### 옵션 C — Vercel

```bash
npm i -g vercel
cd src/exercise/yuuny05/day03/todo
vercel --prod
```

---

## Supabase URL 설정 (외부 배포 시 필수)

외부 도메인으로 배포하면 Supabase의 이메일 인증 리다이렉트가 깨질 수 있습니다.

> Supabase 대시보드 → **Authentication → URL Configuration**

| 항목 | 값 |
|---|---|
| Site URL | 배포된 앱 URL |
| Redirect URLs | 배포된 앱 URL |

---

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 마크업 — 로그인 오버레이 + 앱 본체 |
| `style.css` | 전체 스타일 (Boudoir 테마 + 인증 화면) |
| `app.js` | 전체 로직 — Supabase 인증, CRUD, 드래그앤드롭 |
| `SUPABASE.md` | Supabase 초기 설정 기록 |
| `DEPLOY.md` | 이 문서 |

---

## 캐시 문제 발생 시

CSS나 JS 변경 후 브라우저에 반영이 안 될 때:

- **강제 새로고침**: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- 또는 `index.html`의 쿼리스트링 버전 번호를 올립니다:
  ```html
  <link rel="stylesheet" href="style.css?v=3" />
  <script src="app.js?v=3"></script>
  ```
