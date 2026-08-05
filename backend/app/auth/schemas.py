from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # 'student' or 'admin'
    phone_number: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    phone_number: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class PasswordResetRequest(BaseModel):
    identifier: str  # email or phone number
    method: str = "email"  # 'email' or 'sms'

class PasswordResetVerify(BaseModel):
    identifier: str
    otp: str
    new_password: str
