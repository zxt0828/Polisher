"""ORM table models. Currently just the User table backing the account system."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    """users 表：一行 = 一个注册用户。SQLAlchemy 2.0 带类型标注的声明式写法。"""

    __tablename__ = "users"

    # 主键，自增（对应 MySQL 的 AUTO_INCREMENT）。
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 邮箱：登录账号。unique=True 让数据库层面拒绝重复注册（多一道保险，
    # 不只靠应用代码查重）；index=True 建索引，让「按邮箱查人」这个高频操作走索引更快。
    # 长度 255 是邮箱地址的通用上限。
    #email: Mapped[str] = mapped_column(String(255), unique=True, ...)
    #  ↑        ↑              ↑
    # 属性名  类型标注      列的详细配置
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # 密码的 bcrypt 加密串，绝不存明文。bcrypt 产出长约 60 字符，给到 255 留足余量。
    # 可空：用 Google 登录的用户从不在本站设密码，这一列对他们为 NULL。
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Google 账号的唯一标识（id_token 里的 sub claim）。仅 Google 登录用户有值，
    # 邮箱密码用户为 NULL。unique 保证一个 Google 账号只绑定一行；index 让按它查人走索引。
    google_sub: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )

    # 注册时间。server_default=func.now() 让数据库在插入时自动填当前时间，
    # 应用侧不用手动传，也保证时间以数据库为准。
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
