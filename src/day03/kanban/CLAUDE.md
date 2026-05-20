# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

드래그 앤 드롭이 가능한 3-컬럼(To-do / In-Progress / Done) 칸반 보드.  
**외부 라이브러리 없음 — Vanilla HTML5 / CSS3 / ES6+ JS 전용.**

---

## 파일 구조

```
kanban/
├── index.html        ← 마크업 (세 컬럼 구조 + 카드 추가 UI)
├── style.css         ← 스타일 (Flexbox, CSS 변수, 드래그 시각 효과)
└── app.js            ← 동작 (Drag & Drop API, 카드 추가/삭제)
```

> 이 세 파일 외에 빌드 결과물, 번들, 패키지 매니저 파일을 생성하지 않는다.

---

## 로컬 실행

```bash
cd src/exercise/yuuny05/day03/kanban
python3 -m http.server 8765
# 브라우저 → http://localhost:8765/index.html
```

`file://`로 직접 열면 외부 CSS/JS 로드가 불안정하다 — 반드시 HTTP 서버를 사용한다.

---

## 코딩 규칙 (핵심만)

- **CSS 변수**: 색상·크기·간격·그림자는 모두 `:root` CSS 변수로 선언 (매직 넘버 금지)
- **JS**: `var` 금지 → `const` / `let` 사용. 함수명 `camelCase`, 상수 `UPPER_SNAKE_CASE`
- **이벤트**: 카드마다 등록하지 않고 컬럼 단위 **이벤트 위임** 패턴 사용
- **접근성**: `<button>` 요소 사용, × 버튼에 `aria-label="카드 삭제"` 추가
- HTML 들여쓰기 2칸, CSS 속성 선언 순서: 레이아웃 → 박스 → 타이포 → 시각 → 트랜지션

> 전체 규칙: [@CODING_CONVENTION.md](./CODING_CONVENTION.md)

---

## Git 정책 (하드 룰)

```bash
# pull은 반드시 merge로
git pull --no-rebase origin main

# 스테이징은 명시적 경로
git add src/exercise/yuuny05/day03/kanban/
```

- `git rebase`, `git pull --rebase` **절대 사용 금지**
- 커밋 메시지 형식: `feat(kanban): 한국어 설명`

---

## 설계 문서 참조

| 문서 | 내용 |
|------|------|
| [@PLAN.md](./PLAN.md) | 구현 계획 및 검증 체크리스트 |
| [@PRD.md](./PRD.md) | 기능 요구사항, 사용자 스토리, 범위 외 항목 |
| [@TRD.md](./TRD.md) | 기술 스택, HTML 구조, JS 함수 목록, 이벤트 흐름 |
| [@USER_FLOW.md](./USER_FLOW.md) | 사용자 흐름도 (Mermaid 차트) |
| [@DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | 논리 데이터 모델 ERD + localStorage 스키마 |
| [@DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 색상 토큰, 타이포그래피, 컴포넌트 명세, CSS 변수 선언 |
| [@TASKS.md](./TASKS.md) | Phase별 구현 체크리스트 |
| [@CODING_CONVENTION.md](./CODING_CONVENTION.md) | HTML/CSS/JS 컨벤션, Git 규칙, 코드 리뷰 체크리스트 |

> 스타일링 작업 시 DESIGN_SYSTEM.md의 CSS 변수 목록을 먼저 확인한다.  
> 구현 전 TRD.md의 함수 목록과 이벤트 흐름을 참고한다.

---

## 완료 기준 (검증)

1. 세 컬럼이 나란히 표시된다
2. 카드 드래그 → 다른 컬럼에 드롭 → 이동 확인
3. 드래그 중 카드 반투명 + 대상 컬럼 하이라이트
4. 입력창 → 추가 버튼(또는 Enter) → 새 카드 생성
5. × 버튼 → 카드 삭제
6. 빈 입력으로는 카드가 생성되지 않음
7. 브라우저 콘솔 에러 없음
