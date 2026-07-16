"""
Frosthaven Tracker — Backend API
FastAPI + SQLite, JWT auth, campaign cloud sync, email verification.
Port 8001 (separate from Gloomhaven's 8000).
"""

import os
import re
import ssl
import time
import random
import string
import smtplib
import logging
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from collections import defaultdict

import databases
import sqlalchemy
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-to-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.seznam.cz")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "okkopecky@gmail.com")

DATABASE_URL = "sqlite:///./data/fh-app.db"

logger = logging.getLogger("fh-api")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

users = sqlalchemy.Table(
    "users",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
    sqlalchemy.Column("email", sqlalchemy.String, unique=True, index=True),
    sqlalchemy.Column("username", sqlalchemy.String, unique=True, index=True),
    sqlalchemy.Column("hashed_password", sqlalchemy.String),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("is_verified", sqlalchemy.Boolean, default=False),
    sqlalchemy.Column("verification_code", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("verification_code_expires_at", sqlalchemy.DateTime, nullable=True),
    sqlalchemy.Column("resend_count", sqlalchemy.Integer, default=0),
    sqlalchemy.Column("resend_window_start", sqlalchemy.DateTime, nullable=True),
)

campaigns = sqlalchemy.Table(
    "campaigns",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("user_id", sqlalchemy.Integer, sqlalchemy.ForeignKey("users.id")),
    sqlalchemy.Column("name", sqlalchemy.String),
    sqlalchemy.Column("created_at", sqlalchemy.String),
    sqlalchemy.Column("last_played_at", sqlalchemy.String),
    sqlalchemy.Column("data", sqlalchemy.Text),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow),
)

feedback = sqlalchemy.Table(
    "feedback",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
    sqlalchemy.Column("type", sqlalchemy.String),
    sqlalchemy.Column("message", sqlalchemy.Text),
    sqlalchemy.Column("email", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("page", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("user_agent", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("ip", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
)

# Sdílení kampaní: kód pro připojení + členové
campaign_shares = sqlalchemy.Table(
    "campaign_shares",
    metadata,
    sqlalchemy.Column("campaign_id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("share_code", sqlalchemy.String, unique=True, index=True),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
)

campaign_members = sqlalchemy.Table(
    "campaign_members",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
    sqlalchemy.Column("campaign_id", sqlalchemy.String, index=True),
    sqlalchemy.Column("user_id", sqlalchemy.Integer, index=True),
    sqlalchemy.Column("joined_at", sqlalchemy.DateTime, default=datetime.utcnow),
)

engine = sqlalchemy.create_engine(
    DATABASE_URL.replace("sqlite:///", "sqlite:///"),
    connect_args={"check_same_thread": False},
)
metadata.create_all(engine)

# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # Ensure sub is string (python-jose requires it)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Neplatný token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        user_id = int(user_id_raw) if user_id_raw is not None else None
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    query = users.select().where(users.c.id == user_id)
    user = await database.fetch_one(query)
    if user is None:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# Rate limiting (in-memory)
# ---------------------------------------------------------------------------

rate_limits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int):
    """Raise 429 if rate limit exceeded."""
    now = time.time()
    timestamps = rate_limits[key]
    # Prune old entries
    rate_limits[key] = [t for t in timestamps if now - t < window_seconds]
    if len(rate_limits[key]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Příliš mnoho požadavků. Zkuste to znovu za chvíli.",
        )
    rate_limits[key].append(now)


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------


def generate_verification_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def send_verification_email(to_email: str, code: str, username: str):
    """Send 6-digit verification code. Falls back to console if SMTP not configured."""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto;
                background: linear-gradient(135deg, #0a1628 0%, #0f2847 50%, #0a1628 100%);
                border: 1px solid #3b82f6; border-radius: 12px; padding: 32px; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #60a5fa; font-size: 24px; margin: 0;">
                &#10052; Frosthaven Tracker
            </h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">
                Ověření e-mailové adresy
            </p>
        </div>
        <p style="color: #cbd5e1; font-size: 15px;">
            Ahoj <strong style="color: #60a5fa;">{username}</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 15px;">
            Tvůj ověřovací kód:
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                         color: #60a5fa; background: rgba(59,130,246,0.1);
                         padding: 12px 24px; border-radius: 8px; border: 1px solid #3b82f6;">
                {code}
            </span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
            Kód je platný 15 minut.
        </p>
        <hr style="border: none; border-top: 1px solid #1e3a5f; margin: 24px 0;">
        <p style="color: #64748b; font-size: 12px; text-align: center;">
            Pokud jsi o registraci nežádal/a, tento e-mail ignoruj.
        </p>
    </div>
    """

    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Verification code for {to_email}: {code}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Frosthaven Tracker — Ověřovací kód: {code}"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        logger.info(f"Verification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        logger.warning(f"Fallback — verification code for {to_email}: {code}")


def send_password_reset_email(to_email: str, code: str, username: str):
    """Send password reset code."""
    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto;
                background: linear-gradient(135deg, #0a1628 0%, #0f2847 50%, #0a1628 100%);
                border: 1px solid #3b82f6; border-radius: 12px; padding: 32px; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #60a5fa; font-size: 24px; margin: 0;">
                &#10052; Frosthaven Tracker
            </h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">
                Reset hesla
            </p>
        </div>
        <p style="color: #cbd5e1; font-size: 15px;">
            Ahoj <strong style="color: #60a5fa;">{username}</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 15px;">
            Kód pro reset hesla:
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                         color: #60a5fa; background: rgba(59,130,246,0.1);
                         padding: 12px 24px; border-radius: 8px; border: 1px solid #3b82f6;">
                {code}
            </span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
            Kód je platný 15 minut.
        </p>
        <hr style="border: none; border-top: 1px solid #1e3a5f; margin: 24px 0;">
        <p style="color: #64748b; font-size: 12px; text-align: center;">
            Pokud jsi o reset hesla nežádal/a, tento e-mail ignoruj.
        </p>
    </div>
    """

    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Reset code for {to_email}: {code}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Frosthaven Tracker — Reset hesla: {code}"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send reset email to {to_email}: {e}")
        logger.warning(f"Fallback — reset code for {to_email}: {code}")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str


class ResendCodeRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str


class CampaignSaveRequest(BaseModel):
    id: str
    name: str
    created_at: str
    last_played_at: str
    data: str  # JSON string


class FeedbackRequest(BaseModel):
    type: str  # 'bug' | 'navrh' | 'jine'
    message: str
    email: Optional[str] = None
    page: Optional[str] = None
    userAgent: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_verified: bool
    created_at: str


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Frosthaven Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:4173",
        "https://frosthaven.ongy.cz",
        "https://ongy.cz",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    os.makedirs("data", exist_ok=True)
    await database.connect()
    logger.info("Frosthaven Tracker API started on port 8001")


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "frosthaven-tracker"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------


@app.post("/api/auth/register")
async def register(req: RegisterRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"register:{client_ip}", max_requests=5, window_seconds=3600)

    # Validate
    if len(req.password) < 6:
        raise HTTPException(400, "Heslo musí mít alespoň 6 znaků")
    if len(req.username) < 2:
        raise HTTPException(400, "Jméno musí mít alespoň 2 znaky")
    if not re.match(r"^[a-zA-Z0-9_.-]+$", req.username):
        raise HTTPException(400, "Jméno může obsahovat jen písmena, čísla, tečky, pomlčky a podtržítka")

    # Check existing
    existing = await database.fetch_one(
        users.select().where(users.c.email == req.email)
    )
    if existing:
        if existing.is_verified:
            raise HTTPException(400, "Tento e-mail je již registrován")
        # Re-registration of unverified account — update it
        code = generate_verification_code()
        await database.execute(
            users.update()
            .where(users.c.id == existing.id)
            .values(
                username=req.username,
                hashed_password=hash_password(req.password),
                verification_code=code,
                verification_code_expires_at=datetime.utcnow() + timedelta(minutes=15),
                resend_count=0,
                resend_window_start=None,
            )
        )
        send_verification_email(req.email, code, req.username)
        return {"message": "Ověřovací kód byl odeslán na e-mail"}

    existing_name = await database.fetch_one(
        users.select().where(users.c.username == req.username)
    )
    if existing_name:
        raise HTTPException(400, "Toto uživatelské jméno je již obsazené")

    code = generate_verification_code()
    await database.execute(
        users.insert().values(
            email=req.email,
            username=req.username,
            hashed_password=hash_password(req.password),
            created_at=datetime.utcnow(),
            is_verified=False,
            verification_code=code,
            verification_code_expires_at=datetime.utcnow() + timedelta(minutes=15),
            resend_count=0,
            resend_window_start=None,
        )
    )
    send_verification_email(req.email, code, req.username)
    return {"message": "Ověřovací kód byl odeslán na e-mail"}


@app.post("/api/auth/verify")
async def verify(req: VerifyRequest):
    user = await database.fetch_one(
        users.select().where(users.c.email == req.email)
    )
    if not user:
        raise HTTPException(400, "Uživatel nenalezen")
    if user.is_verified:
        raise HTTPException(400, "Účet je již ověřen")
    if not user.verification_code:
        raise HTTPException(400, "Žádný ověřovací kód nebyl vygenerován")
    if user.verification_code_expires_at and user.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(400, "Ověřovací kód vypršel. Nechte si poslat nový.")
    if user.verification_code != req.code:
        raise HTTPException(400, "Nesprávný ověřovací kód")

    await database.execute(
        users.update()
        .where(users.c.id == user.id)
        .values(
            is_verified=True,
            verification_code=None,
            verification_code_expires_at=None,
        )
    )

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_verified": True,
        },
    }


@app.post("/api/auth/resend-code")
async def resend_code(req: ResendCodeRequest):
    user = await database.fetch_one(
        users.select().where(users.c.email == req.email)
    )
    if not user:
        raise HTTPException(400, "Uživatel nenalezen")
    if user.is_verified:
        raise HTTPException(400, "Účet je již ověřen")

    # Rate limit: max 3 resends per hour
    now = datetime.utcnow()
    resend_count = user.resend_count or 0
    window_start = user.resend_window_start

    if window_start and (now - window_start) < timedelta(hours=1):
        if resend_count >= 3:
            raise HTTPException(429, "Maximálně 3 odeslání za hodinu. Zkuste to později.")
        new_count = resend_count + 1
    else:
        window_start = now
        new_count = 1

    code = generate_verification_code()
    await database.execute(
        users.update()
        .where(users.c.id == user.id)
        .values(
            verification_code=code,
            verification_code_expires_at=now + timedelta(minutes=15),
            resend_count=new_count,
            resend_window_start=window_start,
        )
    )
    send_verification_email(req.email, code, user.username)
    return {"message": "Nový ověřovací kód byl odeslán"}


@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"forgot:{client_ip}", max_requests=5, window_seconds=3600)

    user = await database.fetch_one(
        users.select().where(users.c.email == req.email)
    )
    if not user:
        # Don't reveal if email exists
        return {"message": "Pokud účet existuje, byl odeslán kód pro reset hesla"}

    code = generate_verification_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    await database.execute(
        users.update().where(users.c.id == user.id).values(
            verification_code=code,
            verification_code_expires_at=expires,
        )
    )

    # Send reset email
    send_password_reset_email(req.email, code, user.username)
    return {"message": "Pokud účet existuje, byl odeslán kód pro reset hesla"}


@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reset:{client_ip}", max_requests=10, window_seconds=3600)

    user = await database.fetch_one(
        users.select().where(users.c.email == req.email)
    )
    if not user:
        raise HTTPException(400, "Neplatný požadavek")
    if not user.verification_code or user.verification_code != req.code:
        raise HTTPException(400, "Nesprávný kód")
    if user.verification_code_expires_at and user.verification_code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Kód vypršel. Požádejte o nový.")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Heslo musí mít alespoň 6 znaků")

    hashed = get_password_hash(req.new_password)
    await database.execute(
        users.update().where(users.c.id == user.id).values(
            hashed_password=hashed,
            verification_code=None,
            verification_code_expires_at=None,
        )
    )
    return {"message": "Heslo bylo změněno"}


@app.post("/api/auth/login")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"login:{client_ip}", max_requests=10, window_seconds=3600)

    # OAuth2 form uses `username` field — we match against email
    user = await database.fetch_one(
        users.select().where(users.c.email == form_data.username)
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(400, "Nesprávný e-mail nebo heslo")
    if not user.is_verified:
        raise HTTPException(400, "Účet není ověřen. Zkontrolujte e-mail.")

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_verified": user.is_verified,
        },
    }


@app.get("/api/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.post("/api/auth/change-password")
async def change_password(req: ChangePasswordRequest, current_user=Depends(get_current_user)):
    # Verify current password
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(400, "Nesprávné aktuální heslo")

    # Validate new password
    if len(req.new_password) < 6:
        raise HTTPException(400, "Nové heslo musí mít alespoň 6 znaků")

    # Update password
    hashed = hash_password(req.new_password)
    await database.execute(
        users.update()
        .where(users.c.id == current_user.id)
        .values(hashed_password=hashed)
    )
    return {"message": "Heslo bylo úspěšně změněno"}


@app.delete("/api/auth/account")
async def delete_account(req: DeleteAccountRequest, current_user=Depends(get_current_user)):
    """GDPR: trvalé smazání účtu včetně všech kampaní."""
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(400, "Nesprávné heslo")

    own_campaigns = await database.fetch_all(
        campaigns.select().where(campaigns.c.user_id == current_user.id)
    )
    for c in own_campaigns:
        await database.execute(
            campaign_shares.delete().where(campaign_shares.c.campaign_id == c.id)
        )
        await database.execute(
            campaign_members.delete().where(campaign_members.c.campaign_id == c.id)
        )
    await database.execute(
        campaigns.delete().where(campaigns.c.user_id == current_user.id)
    )
    # Členství v cizích kampaních
    await database.execute(
        campaign_members.delete().where(campaign_members.c.user_id == current_user.id)
    )
    await database.execute(users.delete().where(users.c.id == current_user.id))
    return {"message": "Účet a všechna data byly trvale smazány"}


# ---------------------------------------------------------------------------
# Campaign endpoints
# ---------------------------------------------------------------------------


@app.get("/api/campaigns/")
async def list_campaigns(current_user=Depends(get_current_user)):
    own = await database.fetch_all(
        campaigns.select().where(campaigns.c.user_id == current_user.id)
    )
    memberships = await database.fetch_all(
        campaign_members.select().where(campaign_members.c.user_id == current_user.id)
    )
    shared = []
    for m in memberships:
        row = await database.fetch_one(
            campaigns.select().where(campaigns.c.id == m.campaign_id)
        )
        if row:
            shared.append(row)

    def summary(r, role):
        return {
            "id": r.id,
            "name": r.name,
            "created_at": r.created_at,
            "last_played_at": r.last_played_at,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "role": role,
        }

    return [summary(r, "owner") for r in own] + [summary(r, "member") for r in shared]


async def get_campaign_access(campaign_id: str, user_id: int) -> str | None:
    """Vrátí 'owner' / 'member' / None podle přístupu uživatele ke kampani."""
    row = await database.fetch_one(
        campaigns.select().where(campaigns.c.id == campaign_id)
    )
    if not row:
        return None
    if row.user_id == user_id:
        return "owner"
    member = await database.fetch_one(
        campaign_members.select().where(
            (campaign_members.c.campaign_id == campaign_id)
            & (campaign_members.c.user_id == user_id)
        )
    )
    return "member" if member else None


@app.get("/api/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if not access:
        raise HTTPException(404, "Kampaň nenalezena")
    row = await database.fetch_one(
        campaigns.select().where(campaigns.c.id == campaign_id)
    )
    if not row:
        raise HTTPException(404, "Kampaň nenalezena")
    return {
        "id": row.id,
        "name": row.name,
        "created_at": row.created_at,
        "last_played_at": row.last_played_at,
        "data": row.data,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@app.post("/api/campaigns/")
async def save_campaign(
    req: CampaignSaveRequest,
    request: Request,
    current_user=Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(
        f"save:{current_user.id}:{client_ip}",
        max_requests=60,
        window_seconds=60,
    )

    # Upsert: vlastník i člen sdílené kampaně smí aktualizovat
    existing = await database.fetch_one(
        campaigns.select().where(campaigns.c.id == req.id)
    )

    if existing:
        access = await get_campaign_access(req.id, current_user.id)
        if not access:
            raise HTTPException(403, "Ke kampani nemáte přístup")
        await database.execute(
            campaigns.update()
            .where(campaigns.c.id == req.id)
            .values(
                name=req.name,
                created_at=req.created_at,
                last_played_at=req.last_played_at,
                data=req.data,
                updated_at=datetime.utcnow(),
            )
        )
    else:
        await database.execute(
            campaigns.insert().values(
                id=req.id,
                user_id=current_user.id,
                name=req.name,
                created_at=req.created_at,
                last_played_at=req.last_played_at,
                data=req.data,
                updated_at=datetime.utcnow(),
            )
        )

    return {"id": req.id, "status": "saved"}


@app.delete("/api/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if not access:
        raise HTTPException(404, "Kampaň nenalezena")

    if access == "member":
        # Člen kampaň nemaže — jen ji opouští
        await database.execute(
            campaign_members.delete().where(
                (campaign_members.c.campaign_id == campaign_id)
                & (campaign_members.c.user_id == current_user.id)
            )
        )
        return {"status": "left"}

    await database.execute(
        campaigns.delete().where(campaigns.c.id == campaign_id)
    )
    await database.execute(
        campaign_shares.delete().where(campaign_shares.c.campaign_id == campaign_id)
    )
    await database.execute(
        campaign_members.delete().where(campaign_members.c.campaign_id == campaign_id)
    )
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Campaign sharing
# ---------------------------------------------------------------------------

SHARE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # bez záměnných znaků


class JoinRequest(BaseModel):
    code: str


@app.post("/api/campaigns/{campaign_id}/share")
async def create_share(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if access != "owner":
        raise HTTPException(403, "Sdílet může jen vlastník kampaně")
    if not current_user.is_verified:
        raise HTTPException(403, "Pro sdílení je nutný ověřený e-mail")

    existing = await database.fetch_one(
        campaign_shares.select().where(campaign_shares.c.campaign_id == campaign_id)
    )
    if existing:
        return {"shareCode": existing.share_code}

    import secrets
    for _ in range(20):
        code = "".join(secrets.choice(SHARE_CODE_ALPHABET) for _ in range(6))
        clash = await database.fetch_one(
            campaign_shares.select().where(campaign_shares.c.share_code == code)
        )
        if not clash:
            break
    else:
        raise HTTPException(500, "Nepodařilo se vygenerovat kód")

    await database.execute(
        campaign_shares.insert().values(
            campaign_id=campaign_id, share_code=code, created_at=datetime.utcnow()
        )
    )
    return {"shareCode": code}


@app.get("/api/campaigns/{campaign_id}/share")
async def get_share_info(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if not access:
        raise HTTPException(404, "Kampaň nenalezena")

    share = await database.fetch_one(
        campaign_shares.select().where(campaign_shares.c.campaign_id == campaign_id)
    )
    member_rows = await database.fetch_all(
        campaign_members.select().where(campaign_members.c.campaign_id == campaign_id)
    )
    members = []
    for m in member_rows:
        u = await database.fetch_one(users.select().where(users.c.id == m.user_id))
        if u:
            members.append({
                "userId": u.id,
                "username": u.username,
                "joinedAt": m.joined_at.isoformat() if m.joined_at else None,
            })

    campaign_row = await database.fetch_one(
        campaigns.select().where(campaigns.c.id == campaign_id)
    )
    owner = await database.fetch_one(
        users.select().where(users.c.id == campaign_row.user_id)
    )

    return {
        # Kód vidí jen vlastník (člen by ho mohl šířit dál)
        "shareCode": share.share_code if (share and access == "owner") else None,
        "isShared": bool(share) or len(members) > 0,
        "members": members,
        "ownerUsername": owner.username if owner else "?",
    }


@app.delete("/api/campaigns/{campaign_id}/share")
async def revoke_share(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if access != "owner":
        raise HTTPException(403, "Zrušit sdílení může jen vlastník")
    await database.execute(
        campaign_shares.delete().where(campaign_shares.c.campaign_id == campaign_id)
    )
    return {"status": "revoked"}


@app.post("/api/campaigns/join")
async def join_campaign(req: JoinRequest, current_user=Depends(get_current_user)):
    share = await database.fetch_one(
        campaign_shares.select().where(
            campaign_shares.c.share_code == req.code.strip().upper()
        )
    )
    if not share:
        raise HTTPException(404, "Neplatný kód")

    campaign_row = await database.fetch_one(
        campaigns.select().where(campaigns.c.id == share.campaign_id)
    )
    if not campaign_row:
        raise HTTPException(404, "Kampaň už neexistuje")
    if campaign_row.user_id == current_user.id:
        raise HTTPException(400, "Vlastní kampaň nelze připojit")

    existing = await database.fetch_one(
        campaign_members.select().where(
            (campaign_members.c.campaign_id == share.campaign_id)
            & (campaign_members.c.user_id == current_user.id)
        )
    )
    if not existing:
        await database.execute(
            campaign_members.insert().values(
                campaign_id=share.campaign_id,
                user_id=current_user.id,
                joined_at=datetime.utcnow(),
            )
        )

    owner = await database.fetch_one(
        users.select().where(users.c.id == campaign_row.user_id)
    )
    return {
        "campaignId": campaign_row.id,
        "campaignName": campaign_row.name,
        "ownerUsername": owner.username if owner else "?",
    }


@app.post("/api/campaigns/{campaign_id}/leave")
async def leave_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if access != "member":
        raise HTTPException(400, "Nejste členem této kampaně")
    await database.execute(
        campaign_members.delete().where(
            (campaign_members.c.campaign_id == campaign_id)
            & (campaign_members.c.user_id == current_user.id)
        )
    )
    return {"status": "left"}


@app.delete("/api/campaigns/{campaign_id}/members/{user_id}")
async def kick_member(campaign_id: str, user_id: int, current_user=Depends(get_current_user)):
    access = await get_campaign_access(campaign_id, current_user.id)
    if access != "owner":
        raise HTTPException(403, "Členy může odebírat jen vlastník")
    await database.execute(
        campaign_members.delete().where(
            (campaign_members.c.campaign_id == campaign_id)
            & (campaign_members.c.user_id == user_id)
        )
    )
    return {"status": "kicked"}


# ---------------------------------------------------------------------------
# Feedback endpoint
# ---------------------------------------------------------------------------


@app.post("/api/feedback/")
async def submit_feedback(req: FeedbackRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"feedback:{client_ip}", max_requests=5, window_seconds=3600)

    if not req.message or not req.message.strip():
        raise HTTPException(400, "Zpráva je povinná")
    if req.type not in ("bug", "navrh", "jine"):
        raise HTTPException(400, "Neplatný typ zpětné vazby")

    await database.execute(
        feedback.insert().values(
            type=req.type,
            message=req.message.strip(),
            email=req.email,
            page=req.page,
            user_agent=req.userAgent,
            ip=client_ip,
            created_at=datetime.utcnow(),
        )
    )
    logger.info(f"Feedback received: type={req.type}, ip={client_ip}")

    # Send email notification
    if SMTP_USER and SMTP_PASSWORD:
        try:
            body = "Typ: " + req.type + "\nStranka: " + str(req.page) + "\nEmail: " + (req.email or "neuvedeno") + "\nIP: " + client_ip + "\n\n" + req.message
            msg = MIMEText(body, "plain", "utf-8")
            msg["From"] = "FH Tracker <" + SMTP_FROM + ">"
            msg["To"] = NOTIFY_EMAIL
            msg["Subject"] = "[FH Feedback] " + req.type + ": " + req.message[:50]
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, NOTIFY_EMAIL, msg.as_string())
        except Exception as e:
            logger.error(f"Failed to send feedback notification: {e}")

    return {"ok": True}


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --host 0.0.0.0 --port 8001
# ---------------------------------------------------------------------------
