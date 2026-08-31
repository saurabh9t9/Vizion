import hashlib
import hmac
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from database import connection

router = APIRouter(tags=["authentication"])


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=6, max_length=128)
    role: str = "student"


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str
    role: str = "student"


class DeleteAccountRequest(LoginRequest):
    pass


class ProfilePhotoRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    role: str
    profile_photo: str | None = Field(default=None, max_length=3_000_000)

    @field_validator("profile_photo")
    @classmethod
    def validate_profile_photo(cls, value):
        if value is not None and not value.startswith(("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")):
            raise ValueError("Profile photo must be a JPG, PNG, or WebP image.")
        return value


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    role: str


class PasswordResetVerifyRequest(PasswordResetRequest):
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class PasswordResetCompleteRequest(PasswordResetVerifyRequest):
    new_password: str = Field(min_length=6, max_length=128)


def validate_role(role: str) -> str:
    if role not in {"student", "company"}:
        raise HTTPException(status_code=400, detail="Role must be student or company.")
    return role


def normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return normalized


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt_hex, digest_hex = stored_hash.split("$", 1)
    expected = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 120000).hex()
    return hmac.compare_digest(expected, digest_hex)


def public_user(row):
    return {"name": row["name"], "email": row["email"], "role": row["role"], "profile_photo": row.get("profile_photo")}


def otp_hash(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def send_reset_email(email: str, otp: str):
    sender = os.getenv("GMAIL_ADDRESS")
    app_password = "".join((os.getenv("GMAIL_APP_PASSWORD") or "").split())
    if not sender or not app_password:
        raise HTTPException(status_code=503, detail="Password reset email is not configured. Add GMAIL_ADDRESS and GMAIL_APP_PASSWORD to backend/.env.")
    message = EmailMessage()
    message["Subject"] = "Your VIZION password reset code"
    message["From"] = sender
    message["To"] = email
    message.set_content(f"Your VIZION password reset code is {otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.")
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as smtp:
            smtp.login(sender, app_password)
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as error:
        raise HTTPException(status_code=502, detail="Gmail rejected the credentials. Use a valid 16-character Google App Password for GMAIL_ADDRESS.") from error
    except (OSError, smtplib.SMTPException) as error:
        raise HTTPException(status_code=502, detail="The password reset email could not be sent.") from error


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    role = validate_role(request.role)
    email = normalize_email(request.email)
    try:
        with connection() as database:
            database.execute("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)", (email, request.name.strip(), hash_password(request.password), role))
            database.execute("INSERT INTO login_events (user_email) VALUES (?)", (email,))
            row = database.execute("SELECT name, email, role FROM users WHERE email = ?", (email,)).fetchone()
    except Exception as error:
        if "UNIQUE constraint failed" in str(error):
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from error
        raise
    return {"user": public_user(row)}


@router.post("/login")
async def login(request: LoginRequest):
    role = validate_role(request.role)
    email = normalize_email(request.email)
    with connection() as database:
        row = database.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or row["role"] != role or not verify_password(request.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email, password, or role.")
    with connection() as database:
        database.execute("INSERT INTO login_events (user_email) VALUES (?)", (email,))
    return {"user": public_user(row)}


@router.post("/password-reset/request")
async def request_password_reset(request: PasswordResetRequest):
    role = validate_role(request.role)
    email = normalize_email(request.email)
    with connection() as database:
        user = database.execute("SELECT email FROM users WHERE email = ? AND role = ?", (email, role)).fetchone()
        if not user:
            return {"message": "If an account matches, a reset code has been sent."}
        otp = f"{secrets.randbelow(1_000_000):06d}"
        database.execute("DELETE FROM password_reset_otps WHERE email = ?", (email,))
        database.execute("INSERT INTO password_reset_otps (email, role, code_hash, expires_at) VALUES (?, ?, ?, ?)", (email, role, otp_hash(otp), datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)))
    send_reset_email(email, otp)
    return {"message": "If an account matches, a reset code has been sent."}


def validate_reset_code(database, request):
    email = normalize_email(request.email)
    role = validate_role(request.role)
    reset = database.execute("SELECT * FROM password_reset_otps WHERE email = ? AND role = ?", (email, role)).fetchone()
    if not reset or reset["expires_at"] < datetime.now():
        raise HTTPException(status_code=400, detail="This reset code is invalid or expired.")
    if reset["attempts"] >= 5:
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new code.")
    if not hmac.compare_digest(reset["code_hash"], otp_hash(request.otp)):
        database.execute("UPDATE password_reset_otps SET attempts = attempts + 1 WHERE email = ?", (email,))
        raise HTTPException(status_code=400, detail="This reset code is invalid or expired.")
    return email, role


@router.post("/password-reset/verify")
async def verify_password_reset(request: PasswordResetVerifyRequest):
    with connection() as database:
        validate_reset_code(database, request)
    return {"message": "Reset code verified."}


@router.post("/password-reset/complete")
async def complete_password_reset(request: PasswordResetCompleteRequest):
    with connection() as database:
        email, role = validate_reset_code(database, request)
        database.execute("UPDATE users SET password_hash = ? WHERE email = ? AND role = ?", (hash_password(request.new_password), email, role))
        database.execute("DELETE FROM password_reset_otps WHERE email = ?", (email,))
    return {"message": "Password reset successfully. You can now sign in."}


@router.put("/account/profile-photo")
async def update_profile_photo(request: ProfilePhotoRequest):
    role = validate_role(request.role)
    email = normalize_email(request.email)
    with connection() as database:
        cursor = database.execute("UPDATE users SET profile_photo = ? WHERE email = ? AND role = ?", (request.profile_photo, email, role))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Account not found.")
        row = database.execute("SELECT name, email, role, profile_photo FROM users WHERE email = ?", (email,)).fetchone()
    return {"user": public_user(row)}


@router.delete("/account")
async def delete_account(request: DeleteAccountRequest):
    role = validate_role(request.role)
    email = normalize_email(request.email)
    with connection() as database:
        row = database.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row or row["role"] != role or not verify_password(request.password, row["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to verify this account.")
        database.execute("DELETE FROM users WHERE email = ?", (email,))
    return {"message": "Account deleted successfully."}
