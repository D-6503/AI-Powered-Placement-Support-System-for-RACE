"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiLogin, apiForgotPasswordRequest, apiForgotPasswordVerify } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, KeyRound, Mail, Phone, ShieldCheck, X, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import RevaLogo from "@/components/RevaLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<"email" | "sms">("email");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [destinationMasked, setDestinationMasked] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const data = await apiLogin(formData);
      toast.success("Welcome back!");
      
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [inboxUrl, setInboxUrl] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      toast.error("Please enter your registered email address or phone number.");
      return;
    }

    setSendingForgot(true);
    try {
      const res = await apiForgotPasswordRequest(forgotIdentifier, recoveryMethod);
      if (res.status === "success") {
        setOtpCode(""); // User enters the 6-digit code received in email/SMS
        setDestinationMasked(res.destination || forgotIdentifier);
        if (res.inbox_url) {
          setInboxUrl(res.inbox_url);
        } else {
          setInboxUrl(null);
        }
        setForgotStep("verify");
        toast.success(res.message || "Verification 6-digit OTP code sent!");
      }
    } catch (err: any) {
      toast.error(err.message || "Account recovery request failed.");
    } finally {
      setSendingForgot(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      toast.error("Please enter the 6-digit OTP code and new password.");
      return;
    }

    setSendingForgot(true);
    try {
      const res = await apiForgotPasswordVerify(forgotIdentifier, otpCode, newPassword);
      if (res.status === "success") {
        toast.success("Password reset successfully! Log in with your new password.");
        setShowForgotModal(false);
        setPassword(newPassword);
        setForgotStep("request");
        setForgotIdentifier("");
        setOtpCode("");
        setNewPassword("");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setSendingForgot(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-cream text-dark-text p-6">
      <div className="w-full max-w-md bg-card-cream border border-orange-100/80 rounded-3xl p-8 premium-shadow space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Link href="/">
              <RevaLogo showText={true} large={true} />
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome Back</h1>
          <p className="text-sm font-semibold text-secondary-text">Sign in to your Placement Intelligence Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Email Address or Phone</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@reva.edu.in or +91 9876543210"
              className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/45 bg-white transition-all text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(email);
                  setShowForgotModal(true);
                }}
                className="text-xs font-extrabold text-primary hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/45 bg-white transition-all text-sm pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="text-center text-xs font-semibold text-secondary-text">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-bold">
            Create an account
          </Link>
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-secondary-text hover:text-dark-text p-1.5 rounded-full hover:bg-orange-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-primary">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Account Recovery</h3>
                <p className="text-xs font-semibold text-secondary-text">
                  {forgotStep === "request" ? "Reset your portal password using Email or Phone" : "Enter 6-digit OTP code to create new password"}
                </p>
              </div>
            </div>

            {forgotStep === "request" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Method selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-orange-50 border border-orange-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod("email")}
                    className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      recoveryMethod === "email" ? "bg-white text-primary shadow-xs" : "text-secondary-text hover:text-dark-text"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod("sms")}
                    className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      recoveryMethod === "sms" ? "bg-white text-primary shadow-xs" : "text-secondary-text hover:text-dark-text"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    SMS / Phone
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">
                    {recoveryMethod === "email" ? "Registered Email Address" : "Registered Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder={recoveryMethod === "email" ? "e.g. sarah@reva.edu.in" : "e.g. +91 9876543210"}
                    className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingForgot}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingForgot ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Recovery OTP <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-xs text-green-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Verification 6-Digit OTP Dispatched!</p>
                      <p className="text-[11px] opacity-90">Please enter the 6-digit OTP code sent to your SMS / Email inbox (<span className="font-extrabold">{destinationMasked}</span>)</p>
                    </div>
                  </div>

                  {inboxUrl && (
                    <div className="pt-1">
                      <a
                        href={inboxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] transition-all shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Online Inbox
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">6-Digit OTP Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs font-bold text-center letter-spacing-2 tracking-widest font-mono"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs font-semibold"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-secondary-text hover:text-dark-text p-1 transition-colors cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("request")}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={sendingForgot}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingForgot ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Reset Password <ShieldCheck className="w-3.5 h-3.5" /></>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
