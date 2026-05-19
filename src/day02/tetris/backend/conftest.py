import os

# 테스트 실행 시 main.py 임포트 전에 설정 — MySQL 없이 SQLite in-memory로 동작
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
