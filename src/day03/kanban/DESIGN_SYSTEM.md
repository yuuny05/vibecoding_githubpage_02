# Design System — 기초 디자인 시스템

## 1. 색상 (Color Palette)

### 브랜드 / 기본 색상

| 토큰 | 변수명 | Hex | 용도 |
|------|--------|-----|------|
| Primary | `--color-primary` | `#4A90D9` | 주요 버튼, 포커스 링 |
| Background | `--color-bg` | `#F4F6F8` | 페이지 배경 |
| Surface | `--color-surface` | `#FFFFFF` | 카드, 컬럼 배경 |
| Text Primary | `--color-text` | `#2D3748` | 본문 텍스트 |
| Text Muted | `--color-muted` | `#718096` | 보조 텍스트, placeholder |
| Border | `--color-border` | `#E2E8F0` | 구분선, 카드 테두리 |
| Danger | `--color-danger` | `#E53E3E` | 삭제 버튼 hover |

### 컬럼 헤더 색상

| 컬럼 | 변수명 | Hex | 의미 |
|------|--------|-----|------|
| To-do | `--color-todo` | `#4299E1` | 대기 (파랑) |
| In-Progress | `--color-inprogress` | `#ECC94B` | 진행 중 (노랑) |
| Done | `--color-done` | `#48BB78` | 완료 (초록) |

### 상태 색상

| 상태 | Hex | 용도 |
|------|-----|------|
| `dragging` 배경 | `rgba(74,144,217,0.15)` | 드래그 중 카드 배경 |
| `drag-over` 배경 | `rgba(74,144,217,0.08)` | 드롭 대상 컬럼 배경 |
| `drag-over` 테두리 | `#4A90D9` (dashed) | 드롭 가능 영역 강조 |

---

## 2. 타이포그래피 (Typography)

| 토큰 | 변수명 | 값 | 용도 |
|------|--------|-----|------|
| Font Family | `--font-sans` | `'Pretendard', 'Segoe UI', sans-serif` | 전체 |
| Size Base | `--text-base` | `14px` | 카드 텍스트, 버튼 |
| Size SM | `--text-sm` | `12px` | 보조 텍스트, placeholder |
| Size LG | `--text-lg` | `18px` | 컬럼 헤더 |
| Size XL | `--text-xl` | `24px` | 앱 타이틀 |
| Weight Normal | `--font-normal` | `400` | 카드 본문 |
| Weight Bold | `--font-bold` | `700` | 헤더, 버튼 |
| Line Height | `--leading` | `1.5` | 전체 기본값 |

---

## 3. 간격 (Spacing)

| 토큰 | 값 | 용도 |
|------|----|------|
| `--space-1` | `4px` | 미세 간격 |
| `--space-2` | `8px` | 아이콘 패딩, 버튼 내부 |
| `--space-3` | `12px` | 카드 내부 패딩 |
| `--space-4` | `16px` | 컬럼 내부 패딩 |
| `--space-6` | `24px` | 컬럼 간격 (gap) |
| `--space-8` | `32px` | 페이지 여백 |

---

## 4. 테두리 반경 (Border Radius)

| 토큰 | 값 | 용도 |
|------|----|------|
| `--radius-sm` | `4px` | 버튼, 입력창 |
| `--radius-md` | `8px` | 카드 |
| `--radius-lg` | `12px` | 컬럼 |

---

## 5. 그림자 (Shadow)

| 토큰 | 값 | 용도 |
|------|----|------|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.12)` | 카드 기본 |
| `--shadow-card-drag` | `0 8px 24px rgba(0,0,0,0.18)` | 드래그 중 카드 |
| `--shadow-column` | `0 2px 8px rgba(0,0,0,0.08)` | 컬럼 |

---

## 6. 컴포넌트 명세

### 6.1 Card

```
┌──────────────────────────────── 카드 ──┐
│  카드 텍스트 내용                    [×] │
└─────────────────────────────────────────┘
```

| 속성 | 값 |
|------|----|
| 배경 | `--color-surface` |
| 테두리 | `1px solid --color-border` |
| 반경 | `--radius-md` |
| 패딩 | `--space-3` |
| 그림자 | `--shadow-card` |
| 커서 | `grab` |
| 드래그 중 opacity | `0.45` |
| 드래그 중 그림자 | `--shadow-card-drag` |

#### × 버튼
| 속성 | 값 |
|------|----|
| 색상 | `--color-muted` |
| hover 색상 | `--color-danger` |
| 크기 | `20px × 20px` |

---

### 6.2 Column

```
┌─────────────────── 컬럼 ───────────────────┐
│ ■ To-do                              (n) │
├───────────────────────────────────────────┤
│  [카드 1]                                 │
│  [카드 2]                                 │
│                                           │
├───────────────────────────────────────────┤
│ [새 카드 입력창................] [추가]    │
└───────────────────────────────────────────┘
```

| 속성 | 값 |
|------|----|
| 너비 | `flex: 1`, `min-width: 240px` |
| 배경 | `#F7FAFC` |
| 반경 | `--radius-lg` |
| 패딩 | `--space-4` |
| 그림자 | `--shadow-column` |
| drag-over 배경 | `rgba(74,144,217,0.08)` |
| drag-over 테두리 | `2px dashed --color-primary` |

---

### 6.3 Add Card 입력 영역

| 속성 | 값 |
|------|----|
| Input 배경 | `--color-surface` |
| Input 테두리 | `1px solid --color-border` |
| Input 반경 | `--radius-sm` |
| Input 패딩 | `--space-2 --space-3` |
| 버튼 배경 | `--color-primary` |
| 버튼 색상 | `#FFFFFF` |
| 버튼 hover | `brightness(1.1)` |

---

## 7. CSS 변수 선언 예시

```css
:root {
  /* Colors */
  --color-primary:    #4A90D9;
  --color-bg:         #F4F6F8;
  --color-surface:    #FFFFFF;
  --color-text:       #2D3748;
  --color-muted:      #718096;
  --color-border:     #E2E8F0;
  --color-danger:     #E53E3E;
  --color-todo:       #4299E1;
  --color-inprogress: #ECC94B;
  --color-done:       #48BB78;

  /* Typography */
  --font-sans:   'Pretendard', 'Segoe UI', sans-serif;
  --text-sm:     12px;
  --text-base:   14px;
  --text-lg:     18px;
  --text-xl:     24px;
  --font-normal: 400;
  --font-bold:   700;
  --leading:     1.5;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadow */
  --shadow-card:      0 1px 3px rgba(0,0,0,0.12);
  --shadow-card-drag: 0 8px 24px rgba(0,0,0,0.18);
  --shadow-column:    0 2px 8px rgba(0,0,0,0.08);
}
```
