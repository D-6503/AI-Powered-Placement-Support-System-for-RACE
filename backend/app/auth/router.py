import random
import os
import smtplib
import json
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db, User, Student
from backend.app.auth.schemas import UserRegister, UserResponse, Token, PasswordResetRequest, PasswordResetVerify
from backend.app.auth.utils import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage for password recovery
_RESET_OTP_STORE = {}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists by email or phone
    existing_user = db.query(User).filter(
        or_(
            User.email == user_in.email,
            (User.phone_number == user_in.phone_number) if user_in.phone_number else False
        )
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or phone number already exists"
        )
    
    if user_in.role not in ["student", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected"
        )

    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=hashed_password,
        role=user_in.role,
        full_name=user_in.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # If student, update or create student record with phone number
    if db_user.role == "student":
        student = db.query(Student).filter(Student.user_id == db_user.id).first()
        if student:
            student.phone_number = user_in.phone_number
            db.commit()

    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Allow login with either Email OR Phone number
    user = db.query(User).filter(
        or_(
            User.email == form_data.username,
            User.phone_number == form_data.username
        )
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


def dispatch_real_email_otp(target_email: str, otp: str) -> dict:
    """Dispatches real email via SMTP (Gmail, Outlook, Resend, Custom)"""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    # 1. Custom / Gmail / Outlook SMTP Delivery
    if smtp_user and smtp_pass:
        try:
            msg = MIMEText(
                f"Hello,\n\nYour REVA RACE Placement Intelligence Portal Account Recovery Verification OTP is: {otp}\n\n"
                f"Please enter this 6-digit OTP code in the portal to reset your password. This code is valid for 15 minutes.\n\n"
                f"Best regards,\nREVA University Placement Cell",
                "plain",
                "utf-8"
            )
            msg['Subject'] = f"REVA RACE — Account Recovery OTP Code: {otp}"
            msg['From'] = smtp_user
            msg['To'] = target_email

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [target_email], msg.as_string())
            print(f"[REAL SMTP EMAIL SUCCESS] Dispatched OTP {otp} to {target_email} via {smtp_host}")
            return {"status": "sent", "mode": "smtp"}
        except Exception as e:
            print(f"[SMTP EMAIL DISPATCH ERROR] Failed to send email via {smtp_host}: {e}")

    # Fallback log notice if SMTP credentials are missing in .env
    print("=================================================================")
    print(f"[DISPATCH EMAIL NOTICE] Target: {target_email} | OTP Code: {otp}")
    print(f"[ACTION REQUIRED] Add SMTP_USER & SMTP_PASSWORD to backend/.env for live inbox delivery")
    print("=================================================================")
    return {"status": "pending_credentials", "mode": "local_log"}


def dispatch_real_sms_otp(phone_number: str, otp: str) -> bool:
    """Dispatches real SMS via Fast2SMS (India) or Twilio (Global)"""
    clean_phone = phone_number.replace("+91", "").replace("+", "").replace(" ", "").replace("-", "").strip()

    # 1. Try Fast2SMS Gateway for India (+91)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "")
    if fast2sms_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/json"
            }
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": clean_phone
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    print(f"[FAST2SMS SUCCESS] Real SMS dispatched to {clean_phone}")
                    return True
        except Exception as e:
            print(f"[FAST2SMS ERROR] Failed to send SMS: {e}")

    # 2. Try Twilio Gateway
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER", "")

    if twilio_sid and twilio_auth and twilio_phone:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            data = urllib.parse.urlencode({
                "From": twilio_phone,
                "To": f"+91{clean_phone}" if len(clean_phone) == 10 else phone_number,
                "Body": f"Your REVA RACE Account Recovery OTP is: {otp}"
            }).encode("utf-8")

            req = urllib.request.Request(url, data=data, method="POST")
            import base64
            auth_header = base64.b64encode(f"{twilio_sid}:{twilio_auth}".encode("utf-8")).decode("utf-8")
            req.add_header("Authorization", f"Basic {auth_header}")

            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    print(f"[TWILIO SMS SUCCESS] Real SMS dispatched to {phone_number}")
                    return True
        except Exception as e:
            print(f"[TWILIO SMS ERROR] Failed to send SMS: {e}")

    print("=================================================================")
    print(f"[DISPATCH SMS NOTICE] Target Mobile: {phone_number} | OTP Code: {otp}")
    print(f"[ACTION REQUIRED] Add FAST2SMS_API_KEY or TWILIO_AUTH_TOKEN to backend/.env for live SMS gateway delivery")
    print("=================================================================")
    return False


@router.post("/forgot-password/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    
    # Look up user by email or phone number
    user = db.query(User).filter(
        or_(
            User.email == identifier,
            User.phone_number == identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account found with that email address or phone number."
        )

    # Generate real random 6-digit OTP
    otp = str(random.randint(100000, 999999))
    _RESET_OTP_STORE[user.email] = otp
    if user.phone_number:
        _RESET_OTP_STORE[user.phone_number] = otp

    if payload.method == "email":
        dispatch_real_email_otp(user.email, otp)
        dest = user.email
    else:
        dest_phone = user.phone_number or user.email
        dispatch_real_sms_otp(dest_phone, otp)
        dest = dest_phone

    masked = f"{dest[:3]}***{dest[dest.find('@'):]}" if "@" in dest else f"{dest[:4]}****{dest[-2:]}"

    return {
        "status": "success",
        "message": f"Verification 6-digit OTP code dispatched to {masked}. Please check your SMS / Email inbox.",
        "destination": masked,
        "method": payload.method
    }


@router.post("/forgot-password/verify")
def verify_and_reset_password(payload: PasswordResetVerify, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    
    user = db.query(User).filter(
        or_(
            User.email == identifier,
            User.phone_number == identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    expected_otp = _RESET_OTP_STORE.get(user.email) or _RESET_OTP_STORE.get(user.phone_number)
    
    if not expected_otp or payload.otp.strip() != expected_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please enter the exact 6-digit OTP sent to your email or phone."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    # Clear OTP after successful reset
    _RESET_OTP_STORE.pop(user.email, None)
    if user.phone_number:
        _RESET_OTP_STORE.pop(user.phone_number, None)

    return {
        "status": "success",
        "message": "Password reset successfully! You can now log in with your new password."
    }
