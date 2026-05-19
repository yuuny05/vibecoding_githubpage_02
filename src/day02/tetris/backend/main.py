from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import os

# ─── Config ──────────────────────────────────────────────────────────────────
SECRET_KEY = "tetris-yuuny05-secret-key-2026"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://tetris:tetrispass@127.0.0.1:3306/tetris?charset=utf8mb4",
)
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nickname = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    records = relationship("GameRecord", back_populates="user")


class GameRecord(Base):
    __tablename__ = "game_records"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    level = Column(Integer, nullable=False)
    lines = Column(Integer, nullable=False)
    played_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="records")


Base.metadata.create_all(bind=engine)

# ─── Auth helpers ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")
    return user


# ─── Pydantic schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    nickname: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GameRecordRequest(BaseModel):
    score: int
    level: int
    lines: int


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Tetris API — yuuny05")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="올바른 이메일 형식이 아닙니다.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 6자 이상이어야 합니다.")
    if not req.nickname.strip():
        raise HTTPException(status_code=400, detail="닉네임을 입력하세요.")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
    user = User(
        email=req.email.lower().strip(),
        nickname=req.nickname.strip()[:12],
        password_hash=pwd_context.hash(req.password),
    )
    db.add(user)
    db.commit()
    return {"message": "회원가입 성공"}


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "nickname": user.nickname,
    }


@app.post("/api/game/record")
def record_game(
    req: GameRecordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.add(GameRecord(
        user_id=current_user.id,
        score=req.score,
        level=req.level,
        lines=req.lines,
    ))
    db.commit()

    personal_best = (
        db.query(func.max(GameRecord.score))
        .filter(GameRecord.user_id == current_user.id)
        .scalar() or 0
    )

    global_row = (
        db.query(GameRecord.score, User.nickname)
        .join(User, GameRecord.user_id == User.id)
        .order_by(GameRecord.score.desc())
        .first()
    )

    return {
        "is_personal_best": req.score >= personal_best,
        "personal_best": personal_best,
        "global_best": global_row.score if global_row else 0,
        "global_best_nickname": global_row.nickname if global_row else None,
    }


@app.get("/api/game/global-best")
def global_best(db: Session = Depends(get_db)):
    row = (
        db.query(GameRecord.score, User.nickname)
        .join(User, GameRecord.user_id == User.id)
        .order_by(GameRecord.score.desc())
        .first()
    )
    return {"score": row.score if row else 0, "nickname": row.nickname if row else None}


@app.get("/api/game/my-best")
def my_best(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    best = (
        db.query(func.max(GameRecord.score))
        .filter(GameRecord.user_id == current_user.id)
        .scalar() or 0
    )
    return {"score": best, "nickname": current_user.nickname}


@app.get("/api/game/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    subq = (
        db.query(GameRecord.user_id, func.max(GameRecord.score).label("best"))
        .group_by(GameRecord.user_id)
        .subquery()
    )
    rows = (
        db.query(User.nickname, subq.c.best)
        .join(subq, User.id == subq.c.user_id)
        .order_by(subq.c.best.desc())
        .limit(10)
        .all()
    )
    return [{"rank": i + 1, "nickname": r.nickname, "score": r.best} for i, r in enumerate(rows)]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
