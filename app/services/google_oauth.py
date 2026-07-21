"""Google 登录：验证前端传来的 id_token，取出可信的用户身份（email + sub）。
与 services/auth.py 一样是纯逻辑层——只用 Google 的公钥离线验签，不碰数据库。"""

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app import config


class InvalidGoogleToken(Exception):
    """id_token 验签失败、或邮箱未验证时抛出。接口层据此返回 401。"""


def verify_google_id_token(token: str) -> dict:
    """验证 Google 的 id_token，成功则返回 {"sub", "email"}。

    verify_oauth2_token 会用 Google 的公钥校验签名，并检查：
      - aud（受众）必须等于我们的 GOOGLE_CLIENT_ID —— 确认令牌是签发给本应用的，
        而不是别的应用的令牌被拿来冒用；
      - iss（签发者）必须是 Google；
      - exp（过期时间）未过期。
    任一不符都会抛 ValueError。另外要求 email_verified 为真，防止拿未验证的邮箱冒名。
    """
    if not config.GOOGLE_CLIENT_ID:
        # 服务端没配 Client ID：无法验签，视为不可信。
        raise InvalidGoogleToken("GOOGLE_CLIENT_ID is not configured")

    try:
        claims = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            config.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        # 签名错误 / aud 不符 / 已过期 / 格式非法等都会走到这里。
        raise InvalidGoogleToken("Invalid Google id_token") from exc

    if not claims.get("email_verified"):
        raise InvalidGoogleToken("Google email is not verified")

    email = claims.get("email")
    sub = claims.get("sub")
    if not email or not sub:
        raise InvalidGoogleToken("Google token missing email or sub")

    return {"sub": sub, "email": email}
