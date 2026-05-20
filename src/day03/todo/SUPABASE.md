# Supabase 마이그레이션 가이드

이 문서는 Todo 앱의 데이터 저장소를 `localStorage` → Supabase로 전환하기 위한 설정 절차입니다.

---

## 1. Supabase 가입 및 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에서 **Start your project** 클릭
2. GitHub 계정으로 로그인 (권장) 또는 이메일 가입
3. **New project** 클릭
   - Organization: 개인 계정 선택
   - Name: `todo-app` (임의 지정)
   - Database Password: 안전한 비밀번호 설정 후 **반드시 저장**
   - Region: `Northeast Asia (Seoul)` — `ap-northeast-2`
4. 프로젝트 초기화 완료까지 약 1~2분 대기

---

## 2. API 키 확인

프로젝트 생성 후 **Settings → API** 메뉴에서 아래 두 값을 복사합니다.

| 항목 | 위치 | 용도 |
|---|---|---|
| `Project URL` | API Settings 상단 | fetch 요청 base URL |
| `anon public` key | Project API keys | 클라이언트에서 사용하는 공개 키 |

> **주의**: `service_role` 키는 서버 전용입니다. 브라우저 JS에 절대 넣지 마세요.

---

## 3. 테이블 생성

**Table Editor → New table** 또는 **SQL Editor**에서 아래 SQL을 실행합니다.

```sql
-- todos 테이블
CREATE TABLE todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('high', 'medium', 'low')),
  done        BOOLEAN     NOT NULL DEFAULT false,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sort_order 인덱스 (렌더링 순서 조회 성능)
CREATE INDEX idx_todos_sort_order ON todos (sort_order);
```

### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | 기본 키 — 기존 `Date.now()` 대체 |
| `text` | TEXT | 할일 내용 |
| `priority` | TEXT | `high` / `medium` / `low` |
| `done` | BOOLEAN | 완료 여부 |
| `sort_order` | INTEGER | 드래그앤드롭 정렬 순서 (0-based) |
| `created_at` | TIMESTAMPTZ | 생성 시각 (기존 `id`의 시간 정보 역할 대체) |

> **기존 vs 변경**: 현재 `id`는 `Date.now()` 타임스탬프를 id 겸 생성시간으로 사용 중.
> Supabase 전환 시 UUID로 id를 분리하고, 생성 시각은 `created_at`으로 별도 관리합니다.

---

## 4. Row Level Security (RLS) 설정

Supabase는 기본적으로 RLS가 활성화되어 있어, 정책을 추가하지 않으면 **모든 요청이 차단**됩니다.

### 4-A. 인증 없이 공개 접근 (빠른 프로토타입용)

```sql
-- 읽기, 쓰기, 수정, 삭제 모두 허용 (인증 불필요)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON todos
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

> 개발/테스트 단계에서 사용. 실서비스라면 아래 4-B로 전환해야 합니다.

### 4-B. 로그인 사용자만 본인 데이터 접근 (향후 인증 추가 시)

```sql
-- users 컬럼 추가 후 적용
ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "own_todos_only" ON todos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 5. app.js 변경 포인트 요약

| 현재 (localStorage) | 변경 후 (Supabase) |
|---|---|
| `localStorage.getItem('todos')` | `supabase.from('todos').select('*').order('sort_order')` |
| `localStorage.setItem(...)` | `supabase.from('todos').insert(...)` |
| `todos.map(t => ...)` → save | `supabase.from('todos').update({done}).eq('id', id)` |
| `todos.filter(...)` → save | `supabase.from('todos').delete().eq('id', id)` |
| 배열 재정렬 → save | 영향받은 항목들의 `sort_order`를 `upsert`로 일괄 업데이트 |

### Supabase JS SDK 로드 (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 클라이언트 초기화 예시

```js
const { createClient } = supabase;
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';  // Project URL
const SUPABASE_KEY = 'eyJhb...';                           // anon public key
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
```

---

## 6. 마이그레이션 순서 (권장)

1. Supabase 프로젝트 생성 + 테이블 + RLS 설정 완료
2. `index.html`에 SDK CDN 추가
3. `app.js` 상단에 클라이언트 초기화 코드 추가
4. `save()` 함수를 Supabase 호출로 교체
5. 초기 로드(`render()` 전)를 `localStorage` 대신 `select` 쿼리로 교체
6. `reorder()` / `reorderToGroupStart()` 에서 `sort_order` 일괄 upsert 처리
7. 기존 localStorage 데이터를 Supabase로 일회성 마이그레이션 (선택)
