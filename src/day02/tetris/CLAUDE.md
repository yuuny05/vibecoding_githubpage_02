# Tetris — yuuny05 day02

이메일 회원가입/로그인 + FastAPI 백엔드 + SQLite DB를 갖춘 테트리스 게임입니다.

## 파일 구조

```
tetris/
├── backend/
│   ├── main.py          FastAPI 앱 (인증, 점수 기록, 리더보드)
│   ├── requirements.txt 의존 패키지
│   └── tetris.db        SQLite DB (자동 생성)
├── index.html   랜딩 페이지
├── game.html    게임 페이지 (로그인/회원가입 → 플레이)
├── style.css    전체 스타일
├── game.js      게임 로직 + API 연동
└── audio.js     BGM 엔진 (Web Audio API)
```

## 실행 방법

터미널 두 개가 필요합니다.

**① 백엔드 서버 (포트 8000)**
```bash
cd tetris/backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**② 프론트엔드 서버 (포트 8765)**
```bash
cd tetris
python3 -m http.server 8765
```

| URL | 설명 |
|-----|------|
| `http://localhost:8765/` | 랜딩 페이지 |
| `http://localhost:8765/game.html` | 게임 페이지 (로그인 필요) |
| `http://localhost:8000/docs` | FastAPI Swagger UI |

WSL 환경이면 Windows 브라우저에서 동일한 URL로 접속합니다.

## 게임 조작키

| 키 | 동작 |
|----|------|
| `←` `→` | 블록 좌우 이동 |
| `↑` / `Z` | 블록 회전 (시계 방향) |
| `↓` | 빠르게 내리기 |
| `Space` | 즉시 낙하 |
| `P` | 일시정지 / 재개 |
| `M` | 음소거 토글 |

## 점수 계산

| 클리어 줄 수 | 기본 점수 |
|------------|---------|
| 1줄 (Single) | 100점 |
| 2줄 (Double) | 300점 |
| 3줄 (Triple) | 500점 |
| 4줄 (Tetris) | 800점 |

기본 점수 × 현재 레벨이 최종 점수입니다. 10줄마다 레벨 업, 레벨당 낙하 속도 증가.

## 기술 스택

**프론트엔드**
- HTML / CSS / JavaScript — 외부 라이브러리 없음
- Canvas API — 게임 보드 및 블록 렌더링
- Web Audio API — 코로베이니키(Korobeiniki) BGM 합성

**백엔드**
- FastAPI + uvicorn
- SQLAlchemy + SQLite (`tetris.db`)
- passlib[bcrypt] — 비밀번호 해싱
- python-jose — JWT 토큰 (24시간 유효)

## API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/register` | 이메일 회원가입 |
| POST | `/api/auth/login` | 로그인 → JWT 반환 |
| POST | `/api/game/record` | 게임 결과 저장 (인증 필요) |
| GET  | `/api/game/global-best` | 전체 최고 점수 |
| GET  | `/api/game/my-best` | 내 최고 점수 (인증 필요) |
| GET  | `/api/game/leaderboard` | 상위 10명 |

## 주요 구현 메모

- **고스트 블록**: 현재 블록이 떨어질 위치를 투명하게 미리 표시
- **BGM 루프**: 전체 멜로디 길이를 계산해 `setTimeout`으로 루프 스케줄링
- **레벨별 속도**: `max(100, 800 - (level - 1) * 70)` ms 간격으로 낙하
