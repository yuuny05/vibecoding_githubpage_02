import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt

from main import app, get_db, Base, SECRET_KEY, ALGORITHM, create_token

# ─── 인메모리 DB 픽스처 ───────────────────────────────────────────────────────

@pytest.fixture()
def client():
    # StaticPool: 인메모리 SQLite는 연결마다 별도 DB가 생성되므로
    # 단일 연결을 공유하는 StaticPool로 고정해야 세션 간 데이터가 유지됨
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


# ─── 헬퍼 ────────────────────────────────────────────────────────────────────

def register_and_login(client, email="test@example.com", password="pass123", nickname="tester"):
    client.post("/api/auth/register", json={"email": email, "password": password, "nickname": nickname})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ─── create_token ─────────────────────────────────────────────────────────────

def test_create_token_contains_user_id():
    token = create_token(42)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "42"


def test_create_token_has_expiry():
    token = create_token(1)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert "exp" in payload


# ─── POST /api/auth/register ──────────────────────────────────────────────────

def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@example.com", "password": "pass123", "nickname": "newuser"
    })
    assert resp.status_code == 201
    assert resp.json()["message"] == "회원가입 성공"


def test_register_invalid_email(client):
    resp = client.post("/api/auth/register", json={
        "email": "invalidemail", "password": "pass123", "nickname": "user"
    })
    assert resp.status_code == 400
    assert "이메일" in resp.json()["detail"]


def test_register_short_password(client):
    resp = client.post("/api/auth/register", json={
        "email": "a@b.com", "password": "123", "nickname": "user"
    })
    assert resp.status_code == 400
    assert "비밀번호" in resp.json()["detail"]


def test_register_empty_nickname(client):
    resp = client.post("/api/auth/register", json={
        "email": "a@b.com", "password": "pass123", "nickname": "   "
    })
    assert resp.status_code == 400
    assert "닉네임" in resp.json()["detail"]


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass123", "nickname": "user"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "이메일" in resp.json()["detail"]


# ─── POST /api/auth/login ─────────────────────────────────────────────────────

def test_login_success(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com", "password": "pass123", "nickname": "loginuser"
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "pass123"
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["nickname"] == "loginuser"


def test_login_wrong_email(client):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@example.com", "password": "pass123"
    })
    assert resp.status_code == 401


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wp@example.com", "password": "pass123", "nickname": "user"
    })
    resp = client.post("/api/auth/login", json={
        "email": "wp@example.com", "password": "wrongpass"
    })
    assert resp.status_code == 401


# ─── POST /api/game/record ────────────────────────────────────────────────────

def test_record_game_unauthenticated(client):
    resp = client.post("/api/game/record", json={"score": 100, "level": 1, "lines": 2})
    assert resp.status_code == 401


def test_record_game_success(client):
    token = register_and_login(client)
    resp = client.post(
        "/api/game/record",
        json={"score": 500, "level": 2, "lines": 5},
        headers=auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["personal_best"] == 500
    assert body["global_best"] == 500
    assert body["global_best_nickname"] == "tester"


def test_record_game_personal_best_flag(client):
    token = register_and_login(client)
    headers = auth_header(token)

    client.post("/api/game/record", json={"score": 300, "level": 1, "lines": 3}, headers=headers)
    resp = client.post("/api/game/record", json={"score": 1000, "level": 3, "lines": 10}, headers=headers)

    body = resp.json()
    assert body["is_personal_best"] is True
    assert body["personal_best"] == 1000


def test_record_game_not_personal_best(client):
    token = register_and_login(client)
    headers = auth_header(token)

    client.post("/api/game/record", json={"score": 1000, "level": 3, "lines": 10}, headers=headers)
    resp = client.post("/api/game/record", json={"score": 200, "level": 1, "lines": 2}, headers=headers)

    body = resp.json()
    assert body["is_personal_best"] is False
    assert body["personal_best"] == 1000


def test_record_game_global_best_across_users(client):
    token_a = register_and_login(client, "a@example.com", "pass123", "Alice")
    token_b = register_and_login(client, "b@example.com", "pass123", "Bob")

    client.post("/api/game/record", json={"score": 500, "level": 1, "lines": 5}, headers=auth_header(token_a))
    resp = client.post("/api/game/record", json={"score": 9999, "level": 5, "lines": 40}, headers=auth_header(token_b))

    body = resp.json()
    assert body["global_best"] == 9999
    assert body["global_best_nickname"] == "Bob"


# ─── GET /api/game/global-best ────────────────────────────────────────────────

def test_global_best_empty_db(client):
    resp = client.get("/api/game/global-best")
    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] == 0
    assert body["nickname"] is None


def test_global_best_with_records(client):
    token = register_and_login(client)
    client.post("/api/game/record", json={"score": 750, "level": 2, "lines": 8}, headers=auth_header(token))

    resp = client.get("/api/game/global-best")
    assert resp.status_code == 200
    assert resp.json()["score"] == 750
    assert resp.json()["nickname"] == "tester"


# ─── GET /api/game/my-best ────────────────────────────────────────────────────

def test_my_best_unauthenticated(client):
    resp = client.get("/api/game/my-best")
    assert resp.status_code == 401


def test_my_best_no_records(client):
    token = register_and_login(client)
    resp = client.get("/api/game/my-best", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["score"] == 0


def test_my_best_returns_max_score(client):
    token = register_and_login(client)
    headers = auth_header(token)

    client.post("/api/game/record", json={"score": 100, "level": 1, "lines": 1}, headers=headers)
    client.post("/api/game/record", json={"score": 800, "level": 3, "lines": 8}, headers=headers)
    client.post("/api/game/record", json={"score": 400, "level": 2, "lines": 4}, headers=headers)

    resp = client.get("/api/game/my-best", headers=headers)
    assert resp.json()["score"] == 800
    assert resp.json()["nickname"] == "tester"


def test_my_best_isolated_per_user(client):
    token_a = register_and_login(client, "a@example.com", "pass123", "Alice")
    token_b = register_and_login(client, "b@example.com", "pass123", "Bob")

    client.post("/api/game/record", json={"score": 9999, "level": 5, "lines": 40}, headers=auth_header(token_a))

    resp = client.get("/api/game/my-best", headers=auth_header(token_b))
    assert resp.json()["score"] == 0


# ─── GET /api/game/leaderboard ────────────────────────────────────────────────

def test_leaderboard_empty_db(client):
    resp = client.get("/api/game/leaderboard")
    assert resp.status_code == 200
    assert resp.json() == []


def test_leaderboard_rank_order(client):
    for i, (email, nick, score) in enumerate([
        ("c@e.com", "Charlie", 300),
        ("a@e.com", "Alice", 1000),
        ("b@e.com", "Bob", 600),
    ]):
        token = register_and_login(client, email, "pass123", nick)
        client.post("/api/game/record", json={"score": score, "level": 1, "lines": 1}, headers=auth_header(token))

    resp = client.get("/api/game/leaderboard")
    board = resp.json()

    assert board[0]["rank"] == 1
    assert board[0]["nickname"] == "Alice"
    assert board[0]["score"] == 1000

    assert board[1]["nickname"] == "Bob"
    assert board[2]["nickname"] == "Charlie"


def test_leaderboard_uses_personal_best_per_user(client):
    token = register_and_login(client)
    headers = auth_header(token)

    client.post("/api/game/record", json={"score": 100, "level": 1, "lines": 1}, headers=headers)
    client.post("/api/game/record", json={"score": 500, "level": 2, "lines": 5}, headers=headers)
    client.post("/api/game/record", json={"score": 200, "level": 1, "lines": 2}, headers=headers)

    resp = client.get("/api/game/leaderboard")
    board = resp.json()

    assert len(board) == 1
    assert board[0]["score"] == 500


def test_leaderboard_max_10_entries(client):
    for i in range(12):
        token = register_and_login(client, f"user{i}@e.com", "pass123", f"User{i}")
        client.post(
            "/api/game/record",
            json={"score": i * 100, "level": 1, "lines": 1},
            headers=auth_header(token),
        )

    resp = client.get("/api/game/leaderboard")
    assert len(resp.json()) == 10
