"""Centralized reading of environment variables and configuration (model name, etc.)."""

import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
TAILOR_MODEL = os.getenv("TAILOR_MODEL", "claude-opus-4-8")

# 账户系统配置：数据库连接串与 JWT 参数。
# DATABASE_URL / JWT_SECRET 含密码密钥，只从本机 .env 读，没有兜底默认值。
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
# JWT 签名算法，HS256 = 对称密钥签名，够用且无需额外配置。
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
# token 有效期（分钟）。os.getenv 返回字符串，这里转成 int 供计算过期时间用；
# 默认 10080 分钟 = 7 天。
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
