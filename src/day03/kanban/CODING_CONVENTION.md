# Coding Convention & Collaboration Guide

## 1. 파일 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| HTML 파일 | 소문자, 하이픈 | `index.html` |
| CSS 파일 | 소문자, 하이픈 | `style.css` |
| JS 파일 | 소문자, 하이픈 | `app.js` |
| 문서 파일 | 대문자, 언더스코어 | `PLAN.md`, `TASKS.md` |

---

## 2. HTML 컨벤션

### 기본 규칙
- 들여쓰기: **스페이스 2칸**
- 속성 순서: `id` → `class` → `data-*` → 기타
- 모든 태그는 소문자
- 불리언 속성은 값 생략 (`<input disabled>`)
- 자기 닫힘 태그는 `/` 없이 (`<input>`, `<br>`)

### 클래스 / ID 명명
- **클래스**: `kebab-case` (`card-list`, `btn-delete`)
- **ID**: `kebab-case`, 고유 식별자에만 사용 (`todo`, `in-progress`, `done`)
- `data-*` 속성: `data-id`, `data-column`

```html
<!-- Good -->
<div class="card" id="card-001" data-id="card-001" draggable="true">
  <span class="card-text">할 일 내용</span>
  <button class="btn-delete" aria-label="카드 삭제">×</button>
</div>

<!-- Bad -->
<div class="Card" id="Card001" DRAGGABLE="true">
```

---

## 3. CSS 컨벤션

### 기본 규칙
- 들여쓰기: **스페이스 2칸**
- 선택자와 `{` 사이 공백 1칸
- 속성 끝 세미콜론 필수
- 색상·크기는 반드시 **CSS 변수** 사용
- 매직 넘버 금지 (`padding: 13px` → CSS 변수로 대체)

### 속성 선언 순서

```css
.element {
  /* 1. 레이아웃 / 위치 */
  display: flex;
  position: relative;
  
  /* 2. 박스 모델 */
  width: 100%;
  padding: var(--space-3);
  margin: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  
  /* 3. 타이포그래피 */
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  color: var(--color-text);
  
  /* 4. 시각 효과 */
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  opacity: 1;
  
  /* 5. 트랜지션 / 애니메이션 */
  transition: box-shadow 0.2s ease;
  cursor: grab;
}
```

### 상태 클래스 명명

```css
/* 드래그 상태 */
.card.dragging { }

/* 드롭 대상 */
.column.drag-over { }

/* 버튼 hover */
.btn-delete:hover { }
```

---

## 4. JavaScript 컨벤션

### 기본 규칙
- 들여쓰기: **스페이스 2칸**
- 문장 끝 세미콜론 필수
- 문자열: **작은따옴표** (`'hello'`)
- `var` 금지 — `const` 우선, 재할당 필요 시 `let`
- 화살표 함수 사용 (`() => {}`)

### 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수 / 함수 | `camelCase` | `cardText`, `addCard` |
| 상수 | `UPPER_SNAKE_CASE` | `COLUMN_IDS` |
| DOM 요소 변수 | `El` 접미사 | `cardEl`, `inputEl` |
| 이벤트 핸들러 | `handle` 접두사 | `handleDragStart` |

### 함수 작성 원칙

```js
// Good: 단일 책임, 명확한 이름
const createCard = (text, columnId) => {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.id = `card-${Date.now()}`;
  cardEl.draggable = true;
  // ...
  return cardEl;
};

// Bad: 너무 많은 역할을 하나의 함수에
const doEverything = (text, col, event) => { /* ... */ };
```

### DOM 조작

```js
// Good: 구체적인 선택자
const cardListEl = document.querySelector(`#${columnId} .card-list`);

// Bad: 너무 광범위
const el = document.querySelector('div');
```

### 이벤트 위임 패턴

```js
// 컬럼에 단일 이벤트 등록 (카드 개별 등록 지양)
columnEl.addEventListener('drop', handleDrop);
columnEl.addEventListener('dragover', handleDragOver);
columnEl.addEventListener('dragleave', handleDragLeave);
```

---

## 5. Git 컨벤션

### 커밋 메시지

```
<type>(<scope>): <subject>

type: feat | fix | style | refactor | docs | chore
scope: kanban (이 프로젝트의 scope)
subject: 한국어 또는 영어, 명령형
```

#### 예시

```
feat(kanban): 칸반 보드 초기 구현 (HTML/CSS/JS)
style(kanban): 드래그 피드백 시각 효과 개선
fix(kanban): 빈 입력으로 카드 추가 방지 버그 수정
docs(kanban): PLAN.md 및 PRD.md 문서 추가
```

### 브랜치 / 스테이징 규칙

```bash
# 스테이징: 명시적 경로 사용 (git add . 금지)
git add src/exercise/yuuny05/day03/kanban/

# pull: 반드시 --no-rebase
git pull --no-rebase origin main

# rebase 절대 금지
# git rebase origin/main  ← 사용하지 않음
```

---

## 6. 코드 리뷰 체크리스트

- [ ] CSS 변수를 사용했는가? (매직 넘버 없음)
- [ ] `var` 키워드를 사용하지 않았는가?
- [ ] 이벤트 리스너 등록이 카드 개별이 아닌 컬럼 단위인가?
- [ ] 빈 입력 값 유효성 검사가 있는가?
- [ ] `aria-label` 등 접근성 속성이 추가되었는가?
- [ ] 브라우저 콘솔에 에러/경고가 없는가?
- [ ] 드래그 중 및 드롭 후 상태 클래스가 올바르게 정리되는가?
