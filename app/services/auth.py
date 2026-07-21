"""Security core of the account system: password hashing and JWT issue/verify.
Pure logic, no network or database access — easy to reason about and test in isolation."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app import config


def hash_password(plain_password: str) -> str:
    """把明文密码加密成 bcrypt 串（注册时存这个，绝不存明文）。
    bcrypt.gensalt() 每次生成随机盐，所以同一个密码每次 hash 结果都不同，正常。
    bcrypt 只取密码前 72 字节；密码长度上限交给 schema 层（步骤 6）校验。"""
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    # 存进数据库的是字符串，这里把 bytes 解码回 str。
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str | None) -> bool:
    """登录时核对明文密码和数据库里的 hash 是否匹配。
    bcrypt.checkpw 会从 hash 里读出当初的盐，重新算一遍再比对，匹配返回 True。"""
    # 纯 Google 登录的用户 password_hash 为 None：他们没设过密码，
    # 绝不能让密码登录路径通过（也避免 None.encode() 报错）。
    if not password_hash:
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    """给指定用户签发一张 JWT 通行证。
    payload 里：
      - sub（subject）：令牌主体，即用户 id。JWT 惯例存成字符串。
      - exp（expiration）：过期时间点，PyJWT 会在 decode 时自动检查是否过期。
      - iat（issued at）：签发时间，便于排查。
    用 JWT_SECRET + HS256 对称签名，别人没有密钥就伪造不出有效令牌。"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=config.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> int | None:
    """验证令牌签名+是否过期，并解出里面的用户 id。
    验证通过 → 返回 user_id(int)；令牌无效/过期/被篡改/格式不对 → 返回 None。
    这里只返回 None、不抛 HTTP 异常，把「转成 401」的责任留给接口层，保持本模块与网络解耦。"""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    subject = payload.get("sub")
    if subject is None:
        return None
    try:
        return int(subject)
    except (TypeError, ValueError):
        return None
