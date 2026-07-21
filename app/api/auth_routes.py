"""Account system routes: register, login, and 'who am I' (me).

Routing layer only: parse the request, call into services/models, shape the
response. Password hashing and JWT logic live in app/services/auth.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth")

# HTTPBearer：从 Authorization: Bearer <token> 头里取令牌，并让 /docs 出现「Authorize」按钮。
# auto_error=False：头缺失时不由它直接抛 403，而是返回 None，交给我们统一抛 401
# （计划要求「无/错 token 都 401」，若用默认 auto_error=True，缺头会变成 403，不一致）。
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """依赖：从请求头拿 token → 验签解出 user_id → 查库取用户。
    任一环节失败都抛 401。/me 及将来任何「需登录」的接口都可复用它。"""
    # 统一的 401：WWW-Authenticate 头是 Bearer 认证的规范做法，告诉客户端该怎么认证。
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_token(credentials.credentials)
    if user_id is None:  # 令牌无效/过期/被篡改
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:  # 令牌合法但用户已被删（边界情况）
        raise unauthorized
    return user


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """注册：邮箱未被占用则存下加密密码，并直接签发 token（顺带自动登录）。"""
    existing = db.scalar(select(User).where(User.email == req.email))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=req.email, password_hash=hash_password(req.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        # 并发下两个请求可能都通过了上面的查重、随后一个 commit 撞上唯一索引。
        # 数据库的 unique 约束是最后一道防线，这里兜住并回滚，同样返回 400。
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered") from exc
    db.refresh(user)  # 取回数据库生成的 id / created_at

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """登录：核对邮箱+密码，通过则签发 token。"""
    user = db.scalar(select(User).where(User.email == req.email))
    # 「查无此人」和「密码错误」故意返回同一条 401，不告诉攻击者某邮箱是否已注册。
    if user is None or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    """查身份：带合法 token 时返回当前用户信息（response_model=UserOut 保证不含密码）。"""
    return current_user
