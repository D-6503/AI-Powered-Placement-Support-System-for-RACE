"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRegister, apiLogin, apiSaveProfile } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, Lock, Eye, EyeOff, GraduationCap, Calendar, Award, ShieldAlert, ArrowRight } from "lucide-react";
import RevaLogo from "@/components/RevaLogo";
import confetti from "canvas-confetti";

export default function RegisterPage() {
  const router = useRouter();
  
  // Core Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  // Student Core Fields
  const [srn, setSrn] = useState("");
  const [dob, setDob] = useState("");
  const [program, setProgram] = useState("AI & Analytics");
  const [degree, setDegree] = useState("M.Tech");
  const [cohort, setCohort] = useState("Batch 2026");
  const [studyMode, setStudyMode] = useState("Full-Time");

  // Automatic Background Mappings to keep the form clean
  const rolesMap: Record<string, string> = {
    "AI & Analytics": "AI Engineer",
    "Cybersecurity": "SOC Analyst",
    "Cloud Architecture": "Cloud DevOps Engineer"
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) {
      toast.error("Please fill in all account details.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register User
      await apiRegister({
        email,
        password,
        full_name: fullName,
        role,
        phone_number: phoneNumber
      });

      // 2. Auto Onboard Profile for student
      if (role === "student") {
        const loginData = new URLSearchParams();
        loginData.append("username", email);
        loginData.append("password", password);

        try {
          const auth = await apiLogin(loginData);
          if (auth && auth.access_token) {
            // Auto-resolve background metadata to avoid user input fatigue
            const targetRole = rolesMap[program] || "Developer";
            const courseName = degree === "PG Diploma" ? `PG Diploma in ${program}` : `${degree} in ${program}`;
            
            await apiSaveProfile({
              program,
              target_role: targetRole,
              experience_years: 0.0,
              preferred_locations: "Bangalore",
              cohort: cohort,
              enrollment_id: srn,
              srn,
              dob,
              course: courseName,
              year: 2026,
              college_email: email,
              study_mode: studyMode
            });
          }
        } catch (profileErr) {
          console.error("Auto profile save failed", profileErr);
        }
      }

      toast.success("Account created successfully!");
      
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.5 }
      });

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to create account. Email or SRN may already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background-cream text-dark-text font-sans">
      
      {/* Left Column: Visual Brand Banner */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0C2340] text-white p-12 relative overflow-hidden">
        {/* Soft Background Accent Circles */}
        <div className="absolute top-10 right-10 w-[250px] h-[250px] bg-primary/10 rounded-full blur-3xl -z-5" />
        <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-primary/5 rounded-full blur-3xl -z-5" />

        {/* Brand Header */}
        <div className="flex items-center">
          <div className="inline-flex items-center bg-white/95 px-4 py-2 rounded-2xl shadow-md border border-white/20 backdrop-blur-sm">
            <Link href="/">
              <RevaLogo showText={true} noBlend={true} large={true} />
            </Link>
          </div>
        </div>

        {/* Brand Details */}
        <div className="space-y-6 max-w-md my-auto">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> REVA University System
          </div>
          <h2 className="text-3xl font-serif font-black tracking-tight leading-snug">
            Placement Intelligence <br />
            For Postgraduate Candidates
          </h2>
          <p className="text-xs text-slate-300 font-semibold leading-relaxed">
            Register your profile to begin auditing your skills taxonomy, matching live company openings, and unlocking automated recruiter outreach documents.
          </p>

          {/* Bullet achievements list */}
          <div className="space-y-3 pt-2">
            {[
              "Real-time semantic ATS resume audit checklist.",
              "Corporate recruiter discovery with SMTP validation.",
              "Ground truth course specialization skill gaps mappings."
            ].map((bullet, idx) => (
              <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-200">
                <ShieldAlert className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partner badges stickers */}
        <div className="border-t border-slate-700/50 pt-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Academic Integration Partners</p>
          <div className="flex flex-wrap gap-3">
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-md text-[9px] font-black text-slate-200 border border-slate-700">AWS Academy Member</span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-md text-[9px] font-black text-slate-200 border border-slate-700">EC-Council Mapped</span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-md text-[9px] font-black text-slate-200 border border-slate-700">Cloud Security Alliance</span>
          </div>
        </div>
      </div>

      {/* Right Column: Clean White Registration Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo representation for mobile */}
          <div className="lg:hidden flex justify-center">
            <Link href="/">
              <RevaLogo showText={true} large={true} />
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black font-serif text-dark-text tracking-tight">Create Your Account</h1>
            <p className="text-xs text-secondary-text font-bold">Please fill in the details below to initialize your placement audit</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Lim"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">College Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah@reva.edu.in"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Phone Number (India +91)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                />
              </div>
            </div>

            {/* Password with Eye Toggle */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Account Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-3 text-secondary-text hover:text-dark-text p-1 transition-colors cursor-pointer"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* System Role Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold appearance-none cursor-pointer"
                required
              >
                <option value="student">Student / Cohort Candidate</option>
                <option value="admin">Placement Officer / Admin</option>
              </select>
            </div>

            {/* Student Special Fields */}
            {role === "student" && (
              <div className="space-y-4 pt-2 border-t border-orange-100/60 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* SRN */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">SRN (Register No)</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3.5 w-3.5 h-3.5 text-secondary-text" />
                      <input
                        type="text"
                        value={srn}
                        onChange={(e) => setSrn(e.target.value)}
                        placeholder="e.g. R24AI001"
                        className="w-full pl-8 pr-3 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                        required={role === "student"}
                      />
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-3.5 h-3.5 text-secondary-text" />
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-8 pr-3 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                        required={role === "student"}
                      />
                    </div>
                  </div>

                </div>

                {/* Program Track & Degree row select */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Program Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">RACE Program Track</label>
                    <select
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold appearance-none cursor-pointer"
                      required={role === "student"}
                    >
                      <option value="AI & Analytics">AI & Analytics</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Cloud Architecture">Cloud Architecture</option>
                    </select>
                  </div>

                  {/* Degree Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Degree Type</label>
                    <select
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold appearance-none cursor-pointer"
                      required={role === "student"}
                    >
                      <option value="M.Tech">M.Tech</option>
                      <option value="M.Sc">M.Sc</option>
                      <option value="PG Diploma">PG Diploma</option>
                    </select>
                  </div>

                </div>

                {/* Cohort Batch & Study Mode Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Cohort Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Cohort Batch</label>
                    <input
                      type="text"
                      value={cohort}
                      onChange={(e) => setCohort(e.target.value)}
                      placeholder="e.g. Batch 2026"
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold"
                      required={role === "student"}
                    />
                  </div>

                  {/* Study Mode Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Study Mode</label>
                    <select
                      value={studyMode}
                      onChange={(e) => setStudyMode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white text-xs font-semibold appearance-none cursor-pointer"
                      required={role === "student"}
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-md premium-shadow flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs font-semibold text-secondary-text">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">
              Sign In
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
