# Todo List 앱

`src/exercise/yuuny05/day03/todo/` — HTML/CSS/JS로 구현한 우선순위 기반 Todo 앱.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 마크업 — 앱바, 입력 영역, 리스트 컨테이너 |
| `style.css` | Material Design 3 스타일 + 모바일 반응형 |
| `app.js` | 전체 로직 — 렌더링, CRUD, 드래그앤드롭, localStorage |

## 실행 방법

```bash
python3 -m http.server 8765
# 브라우저: http://localhost:8765/index.html
```

## 기능

- **할일 추가** — 텍스트 입력 후 추가 버튼 또는 Enter
- **완료 체크** — 체크박스 클릭 (취소선 + 흐림 처리)
- **할일 삭제** — ✕ 버튼
- **우선순위 설정** — 추가 시 높음 / 중간 / 낮음 선택
- **드래그앤드롭 정렬** — `⠿` 핸들로 아이템 순서 변경
  - 같은 그룹 내 이동: 순서만 변경
  - 다른 그룹 아이템 위에 드롭: 해당 우선순위로 변경
  - 그룹 헤더(높음/중간/낮음)에 드롭: 해당 그룹 맨 앞으로 이동
- **localStorage 저장** — 새로고침 후에도 데이터 유지

## 데이터 구조

```js
// localStorage 키: "todos"
[{ id: 1716192000000, text: "할일 내용", priority: "high", done: false }, ...]
// priority: "high" | "medium" | "low"
```

## 주요 함수 (app.js)

| 함수 | 역할 |
|---|---|
| `render()` | 우선순위 그룹별 전체 재렌더링 |
| `addTodo()` | 새 항목 추가 |
| `toggleTodo(id)` | 완료 상태 토글 |
| `deleteTodo(id)` | 항목 삭제 |
| `reorder(dragId, targetId, position, priority)` | 아이템 간 드롭 처리 |
| `reorderToGroupStart(dragId, priority)` | 그룹 헤더로 드롭 처리 |
| `save()` | localStorage 저장 |

## 디자인

- **Material Design 3** (Purple 팔레트 `#6750A4`)
- **폰트**: Roboto (Google Fonts)
- **반응형**: 480px 이하에서 입력 영역 2행 그리드로 전환
