"""Database connectivity: the SQLAlchemy engine, session factory, model base, and
a FastAPI dependency that hands out (and cleans up) a session per request."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app import config

# engine：整个应用共用的数据库连接引擎，内部维护一个连接池。
# pool_pre_ping=True：每次从池里取连接前先 ping 一下，自动丢弃已被 MySQL
# 断掉的空闲连接（MySQL 默认 8 小时会踢掉闲置连接），避免报 "server has gone away"。
engine = create_engine(config.DATABASE_URL, pool_pre_ping=True)

# SessionLocal：会话工厂，调用 SessionLocal() 就得到一个新会话（一次数据库对话）。
# autoflush=False：不在查询前自动 flush，改动何时落库由我们显式 commit 控制，行为更可预期。
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """所有 ORM 表模型的基类（SQLAlchemy 2.0 声明式风格）。
    步骤 4 的 User 会继承它；步骤 8 靠 Base.metadata.create_all 自动建表。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：为单个请求开一个会话，请求结束后必定关闭。
    用法：接口函数参数写 `db: Session = Depends(get_db)`。
    try/finally 保证即使接口抛异常，会话也会被归还给连接池、不泄漏。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
