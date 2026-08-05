"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  apiGetDashboard, apiGetMe, apiGetLiveJobs, apiGetRecommendations,
  apiGetJobExplanation, apiCreateApplication, apiGetRecruiterDetails,
  apiGetSimulatedEmails, getSmartApplyUrl, getCareersApplyUrl, getLinkedInApplyUrl, getNaukriApplyUrl,
  apiGetLiveStatus, apiRefreshLiveJobs
} from "@/lib/api";
import { 
  Briefcase, FileText, CheckCircle2, TrendingUp, AlertTriangle, 
  MapPin, Clock, ArrowRight, Bot, Sparkles, LogOut, LayoutDashboard,
  HelpCircle, Check, X, Search, Mail, User, Send, GraduationCap, Bookmark, Loader2, RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import RevaLogo from "@/components/RevaLogo";
import CompanyLogo from "@/components/CompanyLogo";

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Live Feed Jobs State
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeCity, setActiveCity] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeApplyJob, setActiveApplyJob] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const JOBS_PER_PAGE = 5;

  // AI Placement Advisor Chatbox State
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "Advisor", text: "Hello! I am your REVA RACE Placement Advisor. Ask me anything about skills, resumes, or matching jobs." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [configuringKey, setConfiguringKey] = useState(false);

  // SMTP Email state
  const [emails, setEmails] = useState<any[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<"advisor" | "mailbox">("advisor");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  
  const loadEmails = async (studentId: number) => {
    try {
      const data = await apiGetSimulatedEmails(studentId);
      setEmails(data);
    } catch (err) {
      console.error("Failed to load email logs", err);
    }
  };

  // Explanation Drawer states
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  // Resume Tailoring Drawer states
  const [tailorJobId, setTailorJobId] = useState<number | null>(null);
  const [tailoredData, setTailoredData] = useState<any>(null);
  const [loadingTailor, setLoadingTailor] = useState(false);

  // Recruiter Discovery states
  const [recruiterJobId, setRecruiterJobId] = useState<number | null>(null);
  const [recruiterData, setRecruiterData] = useState<any>(null);
  const [loadingRecruiter, setLoadingRecruiter] = useState(false);

  const handleOpenRecruiter = async (jobId: number) => {
    setRecruiterJobId(jobId);
    setLoadingRecruiter(true);
    try {
      const res = await apiGetRecruiterDetails(jobId);
      setRecruiterData(res);
    } catch {
      toast.error("Failed to discover recruiter contacts.");
      setRecruiterJobId(null);
    } finally {
      setLoadingRecruiter(false);
    }
  };

  const handleOpenExplanation = async (jobId: number) => {
    setSelectedJobId(jobId);
    setLoadingExpl(true);
    try {
      const data = await apiGetJobExplanation(jobId);
      setExplanation(data);
    } catch (err) {
      toast.error("Failed to load match explanation.");
      setSelectedJobId(null);
    } finally {
      setLoadingExpl(false);
    }
  };

  const handleOpenTailor = async (jobId: number) => {
    setTailorJobId(jobId);
    setLoadingTailor(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/matching/job/${jobId}/tailor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to tailor resume");
      }
      const tailored = await response.json();
      setTailoredData(tailored);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tailoring suggestions.");
      setTailorJobId(null);
    } finally {
      setLoadingTailor(false);
    }
  };

  const handleEasyApply = async (jobId: number) => {
    try {
      // Trigger apply endpoint which changes status to Applied and fires SMTP simulated dispatch
      await apiCreateApplication(jobId);
      
      // Update local jobs list applied status
      setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, is_applied: true } : j));
      toast.success("Application submitted successfully! SMTP confirmation dispatch fired.");
      
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 }
      });
      
      // Reload stats
      const d = await apiGetDashboard();
      setData(d);
      
      if (d.student_id) {
        loadEmails(d.student_id);
      }
    } catch {
      toast.error("Failed to submit application.");
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "User", text: userMsg }]);
    setSendingChat(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/generation/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      if (!response.ok) throw new Error("Chat failed");
      const resData = await response.json();
      setChatMessages(prev => [...prev, { sender: "Advisor", text: resData.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: "Advisor", text: "Sorry, I am having trouble connecting to the AI Advisor. Please try again." }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey.trim()) return;

    setConfiguringKey(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generation/configure-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ api_key: geminiKey.trim() })
      });
      if (!response.ok) throw new Error("Failed to configure key");
      toast.success("Gemini API Key configured and saved successfully!");
      setShowKeyConfig(false);
      
      // Inject greeting from live model
      setChatMessages(prev => [
        ...prev,
        { sender: "Advisor", text: "System Notification: Gemini API Key has been updated successfully! I am now ready to parse queries via live Gemini models." }
      ]);
    } catch {
      toast.error("Failed to update Gemini key.");
    } finally {
      setConfiguringKey(false);
    }
  };

  const loadLiveStatus = async () => {
    try {
      const status = await apiGetLiveStatus();
      setSyncStatus(status);
      if (status.is_syncing) {
        setSyncing(true);
      }
    } catch (err) {
      console.error("Failed to load live status:", err);
    }
  };

  const handleRefreshLiveJobs = async () => {
    setSyncing(true);
    try {
      const res = await apiRefreshLiveJobs();
      if (res.status === "started") {
        toast.success("Live job scraper pipeline triggered in background!");
        
        let count = 0;
        const interval = setInterval(async () => {
          const status = await apiGetLiveStatus();
          setSyncStatus(status);
          count++;
          
          if (!status.is_syncing || count > 15) {
            clearInterval(interval);
            setSyncing(false);
            
            // Reload recommendations
            const recs = await apiGetRecommendations();
            if (recs && recs.length > 0) {
              setJobs(recs);
            }
            toast.success("Job sync completed successfully!");
          }
        }, 4000);
      } else if (res.status === "already_running") {
        toast.info("A live job refresh is already in progress.");
        setSyncing(true);
      }
    } catch {
      toast.error("Failed to trigger live job refresh.");
      setSyncing(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const u = await apiGetMe();
        setUser(u);
        const d = await apiGetDashboard();
        setData(d);

        if (d.student_id) {
          loadEmails(d.student_id);
        }

        // Confetti celebrate if readiness score is excellent
        if (d.readiness_score >= 80.0) {
          setTimeout(() => {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }, 800);
        }
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    };

    // Load live real jobs separately (non-blocking)
    const loadLiveJobs = async () => {
      setLoadingJobs(true);
      try {
        // Try to load scored recommendations for all active jobs in the DB (crawled real jobs)
        const recs = await apiGetRecommendations();
        if (recs && recs.length > 0) {
          setJobs(recs);
        } else {
          // Fallback to JSearch API live jobs for student track
          const profile = await apiGetDashboard().catch(() => null);
          const program = profile?.program || "AI & Analytics";
          const live = await apiGetLiveJobs(program, 40);
          if (live && live.length > 0) {
            const enriched = live.map((j: any, idx: number) => ({
              ...j,
              job_id: j.job_id || idx + 9000,
              final_score: j.final_score || 0,
              matched_skills: j.matched_skills || [],
              missing_skills: j.missing_skills || [],
            }));
            setJobs(enriched);
          }
        }
      } catch (err) {
        console.error("Live jobs fetch failed:", err);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadDashboardData();
    loadLiveJobs();
    loadLiveStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text animate-pulse">Loading Live Social Job Feed...</span>
        </div>
      </div>
    );
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  // Get initial letters for avatar
  const getInitials = (name: string) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : "SL";
  };

  // Dynamic Company Gradient background helper
  const getCompanyColor = (company: string) => {
    const name = (company || "").toLowerCase();
    if (name.includes("google")) return "bg-gradient-to-br from-blue-500 via-red-400 to-yellow-400 text-white";
    if (name.includes("microsoft")) return "bg-gradient-to-br from-cyan-500 to-blue-600 text-white";
    if (name.includes("walmart")) return "bg-gradient-to-br from-blue-700 to-blue-900 text-white";
    if (name.includes("flipkart")) return "bg-gradient-to-br from-yellow-400 to-orange-500 text-white";
    if (name.includes("amazon")) return "bg-gradient-to-br from-orange-400 to-yellow-500 text-white";
    if (name.includes("ey") || name.includes("ernst")) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900";
    if (name.includes("kpmg")) return "bg-gradient-to-br from-blue-600 to-blue-800 text-white";
    if (name.includes("pwc")) return "bg-gradient-to-br from-orange-500 to-red-600 text-white";
    if (name.includes("ibm")) return "bg-gradient-to-br from-blue-800 to-indigo-900 text-white";
    if (name.includes("infosys")) return "bg-gradient-to-br from-blue-500 to-indigo-600 text-white";
    if (name.includes("wipro")) return "bg-gradient-to-br from-green-500 to-teal-600 text-white";
    if (name.includes("tcs")) return "bg-gradient-to-br from-blue-600 to-purple-600 text-white";
    if (name.includes("accenture")) return "bg-gradient-to-br from-purple-500 to-indigo-700 text-white";
    if (name.includes("secure") || name.includes("soc")) return "bg-gradient-to-br from-slate-700 to-slate-900 text-white";
    if (name.includes("standard")) return "bg-gradient-to-br from-teal-600 to-green-700 text-white";
    return "bg-gradient-to-br from-orange-200 to-orange-300 text-primary";
  };

  // Format salary in INR Lakhs
  const formatSalaryLPA = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const toLPA = (v: number) => (v / 100000).toFixed(1);
    if (min && max) return `₹${toLPA(min)}L – ₹${toLPA(max)}L PA`;
    if (min) return `From ₹${toLPA(min)}L PA`;
    return `Up to ₹${toLPA(max!)}L PA`;
  };

  // Local helper to classify platform and color of job
  const getJobPlatformBadge = (job: any) => {
    const src = (job.source || "").toLowerCase();
    const url = (job.apply_url || "").toLowerCase();
    if (src === "linkedin" || url.includes("linkedin.com")) {
      return { label: "LinkedIn", color: "bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20" };
    }
    if (src === "naukri" || url.includes("naukri.com")) {
      return { label: "Naukri.com", color: "bg-[#FF7555]/10 text-[#FF7555] border border-[#FF7555]/20" };
    }
    if (src === "indeed" || url.includes("indeed.com")) {
      return { label: "Indeed", color: "bg-indigo-50 text-indigo-700 border border-indigo-200" };
    }
    if (src === "glassdoor" || url.includes("glassdoor")) {
      return { label: "Glassdoor", color: "bg-green-50 text-green-700 border border-green-200" };
    }
    const cleanCompany = (job.company || "").replace(/\b(india|global tech|labs|corporation|gmbh|co|ltd|pvt|private|limited|inc|group|solutions|technologies)\b/gi, "").trim();
    return { label: `${cleanCompany} Careers`, color: "bg-orange-50 text-orange-700 border border-orange-200" };
  };

  // Local helper to classify category of crawled jobs for filters
  function classifyRoleCategory(title: string, jdText: string) {
    const t = String(title).toLowerCase();
    if (t.includes("machine") || t.includes("ml") || t.includes("ai") || t.includes("analytics") ||
        t.includes("learning") || t.includes("data") || t.includes("genai") || t.includes("nlp") ||
        t.includes("vision") || t.includes("deep learning")) return "AI & Analytics";
    if (t.includes("security") || t.includes("cyber") || t.includes("soc") || t.includes("threat") ||
        t.includes("pentest") || t.includes("vulnerability") || t.includes("grc") || t.includes("iam") ||
        t.includes("incident") || t.includes("firewall")) return "Cybersecurity";
    return "Cloud Architecture";
  }

  const matchCity = (jobLocation: string, filterCity: string) => {
    if (filterCity === "All") return true;
    const loc = (jobLocation || "").toLowerCase();
    const filter = filterCity.toLowerCase();
    
    if (filter === "delhi ncr") {
      return loc.includes("noida") || loc.includes("gurgaon") || loc.includes("gurugram") || loc.includes("delhi") || loc.includes("ncr");
    }
    return loc.includes(filter);
  };

  const getCityCount = (cityName: string) => {
    const trackFiltered = jobs.filter(j => {
      if (activeFilter === "All") return true;
      return classifyRoleCategory(j.title, j.jd_text || "") === activeFilter;
    });
    return trackFiltered.filter(j => matchCity(j.location || "", cityName)).length;
  };

  const filteredJobs = jobs.filter(j => {
    const matchesTrack = activeFilter === "All" || classifyRoleCategory(j.title, j.jd_text || "") === activeFilter;
    const matchesLocation = matchCity(j.location || "", activeCity);
    return matchesTrack && matchesLocation;
  });

  // Paginated jobs for current page
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  return (
    <div className="flex-1 flex overflow-hidden w-full bg-background-cream text-dark-text font-sans">
      
      {/* Sidebar Navigation */}
      <aside className={`bg-[#0C2340] text-white border-r border-orange-500/10 flex flex-col justify-between transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="p-6">
          <div className="mb-10 bg-white p-2.5 rounded-2xl flex items-center justify-center shadow-xs">
            <RevaLogo showText={sidebarOpen} noBlend={true} large={true} />
          </div>

          <nav className="space-y-1.5">
            {[
              { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/student/dashboard", active: true },
              { label: "Resume Center", icon: <FileText className="w-5 h-5" />, path: "/student/resume", active: false },
              { label: "Job Recommendations", icon: <Briefcase className="w-5 h-5" />, path: "/student/job-matches", active: false },
              { label: "Skill Roadmaps", icon: <TrendingUp className="w-5 h-5" />, path: "/student/learning-path", active: false },
              { label: "AI Generator", icon: <Sparkles className="w-5 h-5" />, path: "/student/generator", active: false },
              { label: "Application Tracker", icon: <CheckCircle2 className="w-5 h-5" />, path: "/student/applications", active: false }
            ].map((item, idx) => (
              <Link
                key={idx}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  item.active 
                    ? "bg-primary text-white shadow-sm premium-shadow" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
          >
            {sidebarOpen ? "Collapse Navigation" : "»"}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-red-400 hover:bg-red-500/10 w-full transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content: LinkedIn-Style Feed Page */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto space-y-8 w-full">
        
        {/* Branded Header Banner */}
        <div className="bg-gradient-to-r from-[#0C2340] to-[#1E3A8A] text-white p-6 rounded-3xl premium-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-primary text-[9px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> REVA RACE Placement Intelligence
            </div>
            <h2 className="text-xl font-black font-serif tracking-tight">Candidate Placement Hub</h2>
            <p className="text-xs text-slate-300 font-semibold max-w-xl">
              Track live vacancy mandates, audit ATS resume scores, resolve technical skill gaps, and validate recruiter communication channels.
            </p>
          </div>
          
          <Link
            href="/student/onboarding"
            className="z-10 inline-flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            Restart Walkthrough
          </Link>
        </div>

        {/* 3-Column LinkedIn Feed Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Column 1: Left Profile Widget Card */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-card-cream border border-orange-100 rounded-3xl overflow-hidden shadow-sm premium-shadow">
              {/* Card Banner Background Strip */}
              <div className="h-16 bg-gradient-to-r from-[#0C2340] to-primary/80" />
              
              {/* Profile details */}
              <div className="p-5 text-center -mt-10 relative space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-white bg-primary text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  {getInitials(user?.full_name || "Sarah Lim")}
                </div>
                
                <div>
                  <h3 className="font-extrabold text-sm text-dark-text">{user?.full_name || "Sarah Lim"}</h3>
                  <p className="text-[10px] text-primary font-black uppercase tracking-wider mt-0.5">{user?.email}</p>
                </div>

                <div className="border-t border-orange-100/60 pt-3 text-left space-y-2 text-xs font-semibold text-secondary-text">
                  <div className="flex justify-between">
                    <span>Program:</span>
                    <span className="font-bold text-dark-text">{user?.role === "admin" ? "Placement Admin" : (user?.program || "AI & Analytics")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Course:</span>
                    <span className="font-bold text-dark-text">{user?.course || "Postgraduate Candidate"}</span>
                  </div>
                  {user?.srn && (
                    <div className="flex justify-between">
                      <span>SRN:</span>
                      <span className="font-bold text-dark-text font-mono">{user.srn}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-orange-100/60 pt-3 space-y-3">
                  {/* Readiness index display */}
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between text-[10px] font-black text-secondary-text uppercase">
                      <span>Readiness Score</span>
                      <span className="text-primary font-black">{data?.readiness_score ?? 0}%</span>
                    </div>
                    <div className="w-full bg-orange-100/40 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${data?.readiness_score ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Resume index display */}
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between text-[10px] font-black text-secondary-text uppercase">
                      <span>Resume Score</span>
                      <span className="text-primary font-black">{data?.resume_score ?? 0}/100</span>
                    </div>
                    <div className="w-full bg-orange-100/40 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${data?.resume_score ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats panel links */}
            <div className="bg-card-cream border border-orange-100 rounded-3xl p-5 shadow-xs space-y-3 font-semibold text-xs text-secondary-text">
              <h4 className="text-[9px] font-black uppercase text-dark-text tracking-wider">Placement Funnel</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-orange-100/50">
                  <div className="font-black text-primary text-sm">{data?.applications_by_status?.Applied || 0}</div>
                  <div className="text-[9px]">Applied</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-orange-100/50">
                  <div className="font-black text-primary text-sm">{data?.applications_by_status?.Selected || 0}</div>
                  <div className="text-[9px]">Offers</div>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Main Social Job Post Feed */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Live Job Feed Status & Sync Control Panel */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${syncing ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${syncing ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                  </span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {syncing ? "LinkedIn Live Agent Scraping..." : "LinkedIn Live Feed Agent Connected"}
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  💼 Direct Apply Pipeline Active
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  {syncStatus?.last_sync 
                    ? `Last checked: ${new Date(syncStatus.last_sync).toLocaleTimeString("en-IN", {hour: '2-digit', minute:'2-digit'})} (${syncStatus.last_sync_stats?.new_jobs || 0} fresh jobs added)`
                    : "Connecting to agent..."}
                </p>
              </div>
              <button
                onClick={handleRefreshLiveJobs}
                disabled={syncing}
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  syncing
                    ? "bg-slate-50 text-slate-400 border-slate-200"
                    : "bg-[#0C2340] hover:bg-[#112F55] text-white border-[#0C2340] shadow-sm active:scale-95"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? "Syncing..." : "Sync Jobs"}
              </button>
            </div>

            {/* Feed Filter Bar */}
            <div className="bg-card-cream border border-orange-100 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm flex-shrink-0">
                  {getInitials(user?.full_name || "DM")}
                </div>
                <div className="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-2.5 text-xs text-secondary-text font-semibold cursor-default">
                  🔍 AI-matched openings for your track in Bangalore, India
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-100/60">
                {["All", "AI & Analytics", "Cybersecurity", "Cloud Architecture"].map((track) => (
                  <button
                    key={track}
                    onClick={() => { setActiveFilter(track); setActiveCity("All"); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFilter === track 
                        ? "bg-primary text-white shadow-sm" 
                        : "bg-white text-secondary-text border border-orange-200 hover:bg-orange-50/70 hover:border-primary/30"
                    }`}
                  >
                    {track}
                  </button>
                ))}
                <span className="ml-auto text-[10px] font-black text-secondary-text self-center">
                  {filteredJobs.length} openings found
                </span>
              </div>
              
              {/* City Mini Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-3 mt-2 border-t border-dashed border-orange-100/40 items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-2">City:</span>
                {[
                  { name: "All", label: "All Cities" },
                  { name: "Bangalore", label: "Bangalore" },
                  { name: "Pune", label: "Pune" },
                  { name: "Hyderabad", label: "Hyderabad" },
                  { name: "Mumbai", label: "Mumbai" },
                  { name: "Chennai", label: "Chennai" },
                  { name: "Delhi NCR", label: "Delhi NCR" }
                ].map(city => {
                  const count = getCityCount(city.name);
                  return (
                    <button
                      key={city.name}
                      onClick={() => { setActiveCity(city.name); setCurrentPage(1); }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeCity === city.name
                          ? "bg-[#0C2340] text-white shadow-xs"
                          : "bg-white border border-orange-150 text-slate-500 hover:border-orange-350 hover:bg-orange-50/30"
                      }`}
                    >
                      <span>{city.label}</span>
                      <span className={`text-[8px] px-1 py-0.2 rounded-full font-black ${
                        activeCity === city.name ? "bg-white/20 text-white" : "bg-slate-100 text-slate-550"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feeds list */}
            {loadingJobs ? (
              <div className="p-16 bg-white border border-orange-100 rounded-2xl text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-sm font-bold text-secondary-text">Fetching real-time India tech listings...</p>
                <p className="text-xs font-semibold text-secondary-text/70">Running AI match scoring for your profile...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-16 bg-white border border-orange-100 rounded-2xl text-center space-y-3">
                <Briefcase className="w-10 h-10 text-orange-200 mx-auto" />
                <p className="text-sm font-bold text-secondary-text">No active job posts matching your criteria.</p>
                <p className="text-xs font-semibold text-secondary-text/70">Try uploading your resume or switching track filters.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedJobs.map((job) => {
                    const salary = formatSalaryLPA(job.salary_min, job.salary_max);
                    const fitPct = Math.round(job.final_score || 0);
                    const fitColor = fitPct >= 70 ? "text-green-600 bg-green-50 border-green-200" : 
                                     fitPct >= 50 ? "text-orange-600 bg-orange-50 border-orange-200" : 
                                     "text-slate-500 bg-slate-50 border-slate-200";
                    
                    return (
                      <div 
                        key={job.job_id} 
                        className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-200"
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100/60 p-1">
                              <CompanyLogo company={job.company} employerLogo={job.employer_logo} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                                <span className="truncate max-w-[160px]">{job.company}</span>
                                <span className="flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                  Actively Hiring
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {/* Platform badge */}
                                {(() => {
                                  const badge = getJobPlatformBadge(job);
                                  return (
                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                                <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                                  {job.posted_date_human || job.posted_date ? 
                                    (job.posted_date_human || new Date(job.posted_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })) 
                                    : "Recently posted"}
                                </span>
                                {job.job_type && (
                                  <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">· {job.job_type}</span>
                                )}
                                {job.is_remote && (
                                  <span className="text-[9px] font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-200 flex-shrink-0">Remote OK</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {fitPct > 0 && (
                            <div className={`px-3 py-2 rounded-xl border text-center min-w-[60px] flex-shrink-0 ${fitColor}`}>
                              <div className="text-lg font-black leading-none">{fitPct}%</div>
                              <div className="text-[8px] font-black uppercase tracking-wide mt-0.5">ATS Match</div>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-3">
                          <div>
                            <h3 className="text-base font-black text-slate-800">{job.title}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] font-semibold text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                                {job.location || "India"}
                              </span>
                              {job.experience_required > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                                  {job.experience_required} yr{job.experience_required !== 1 ? "s" : ""} exp
                                </span>
                              )}
                              {salary && (
                                <span className="font-extrabold text-green-700">{salary}</span>
                              )}
                            </div>
                          </div>

                          {/* Full JD preview — first 280 chars */}
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            {job.jd_text 
                              ? job.jd_text.replace(/\n+/g, " ").trim().substring(0, 280) + (job.jd_text.length > 280 ? "…" : "") 
                              : "No job description available."}
                          </p>

                          {/* Skill Tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {(job.matched_skills || []).slice(0, 4).map((s: string) => (
                              <span key={s} className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-200">
                                ✓ {s}
                              </span>
                            ))}
                            {(job.missing_skills || []).slice(0, 3).map((s: string) => (
                              <span key={s} className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                                ✖ {s}
                              </span>
                            ))}
                            {(job.missing_skills || []).length > 3 && (
                              <span className="text-[10px] font-bold text-slate-400 self-center pl-0.5">
                                +{job.missing_skills.length - 3} skill gaps
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Action Bar */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleOpenExplanation(job.job_id)}
                              className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 text-slate-600 hover:border-orange-300 hover:text-primary"
                              title="ATS Gap Audit Analysis"
                            >
                              <AlertTriangle className="w-3 h-3" /> Audit
                            </button>
                            <button
                              onClick={() => handleOpenTailor(job.job_id)}
                              className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 text-slate-600 hover:border-orange-300 hover:text-primary"
                              title="AI Resume Tailor"
                            >
                              <Sparkles className="w-3 h-3" /> Tailor
                            </button>
                            <button
                              onClick={() => handleOpenRecruiter(job.job_id)}
                              className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 text-slate-600 hover:border-orange-300 hover:text-primary"
                              title="Find Recruiter Contact"
                            >
                              <Search className="w-3 h-3" /> Recruiter
                            </button>
                          </div>
                          <div className="flex gap-2 items-center flex-wrap">
                            {/* Smart Platform-Aware Apply Button */}
                            {(() => {
                              const applyUrl = getSmartApplyUrl(job);
                              const urlLower = applyUrl.toLowerCase();
                              
                              let btnLabel = "Apply Now";
                              let btnColor = "bg-[#0C2340] hover:bg-[#0C2340]/90";
                              
                              if (urlLower.includes("careers.google.com")) {
                                btnLabel = "Apply on Google Careers";
                                btnColor = "bg-[#4285F4] hover:bg-[#4285F4]/90";
                              } else if (urlLower.includes("careers.microsoft.com")) {
                                btnLabel = "Apply on Microsoft Search";
                                btnColor = "bg-[#00A4EF] hover:bg-[#00A4EF]/90";
                              } else if (urlLower.includes("amazon.jobs")) {
                                btnLabel = "Apply on Amazon Jobs";
                                btnColor = "bg-[#FF9900] hover:bg-[#FF9900]/90";
                              } else if (urlLower.includes("careers.walmart.com")) {
                                btnLabel = "Apply on Walmart Careers";
                                btnColor = "bg-[#0071CE] hover:bg-[#0071CE]/90";
                              } else if (urlLower.includes("careers.wipro.com")) {
                                btnLabel = "Apply on Wipro Careers";
                                btnColor = "bg-green-700 hover:bg-green-800";
                              } else if (urlLower.includes("career.infosys.com")) {
                                btnLabel = "Apply on Infosys iCareers";
                                btnColor = "bg-blue-700 hover:bg-blue-800";
                              } else if (urlLower.includes("nextstep.tcs.com")) {
                                btnLabel = "Apply on TCS NextStep";
                                btnColor = "bg-blue-800 hover:bg-blue-900";
                              } else if (urlLower.includes("careers.cognizant.com")) {
                                btnLabel = "Apply on Cognizant";
                                btnColor = "bg-blue-600 hover:bg-blue-700";
                              } else if (urlLower.includes("careers.ey.com")) {
                                btnLabel = "Apply on EY Careers";
                                btnColor = "bg-[#FEE21E] hover:bg-[#FEE21E]/90 text-slate-900 font-black";
                              } else if (urlLower.includes("pwc.com")) {
                                btnLabel = "Apply on PwC Careers";
                                btnColor = "bg-[#D04A02] hover:bg-[#D04A02]/90";
                              } else if (urlLower.includes("careers.kpmg.com")) {
                                btnLabel = "Apply on KPMG Careers";
                                btnColor = "bg-[#00338D] hover:bg-[#00338D]/90";
                              } else if (urlLower.includes("sc.com")) {
                                btnLabel = "Apply on Standard Chartered";
                                btnColor = "bg-[#0A8A42] hover:bg-[#0A8A42]/90";
                              } else if (urlLower.includes("linkedin.com")) {
                                btnLabel = "Apply on LinkedIn";
                                btnColor = "bg-[#0A66C2] hover:bg-[#0A66C2]/90";
                              } else if (urlLower.includes("naukri.com")) {
                                btnLabel = "Apply on Naukri";
                                btnColor = "bg-[#FF7555] hover:bg-[#FF7555]/90";
                              } else if (urlLower.includes("remotive.com")) {
                                btnLabel = "Apply on Remotive";
                                btnColor = "bg-[#00C8AA] hover:bg-[#00C8AA]/90";
                              } else if (urlLower.includes("instahyre.com")) {
                                btnLabel = "Apply on Instahyre";
                                btnColor = "bg-purple-600 hover:bg-purple-700";
                              } else if (urlLower.includes("foundit.in")) {
                                btnLabel = "Apply on Foundit";
                                btnColor = "bg-indigo-600 hover:bg-indigo-700";
                              } else if (urlLower.includes("glassdoor")) {
                                btnColor = "bg-green-600 hover:bg-green-700";
                              }
                              
                              return (
                                <a
                                  href={applyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleEasyApply(job.job_id)}
                                  className={`text-[10px] font-extrabold text-white ${btnColor} px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer`}
                                  title={`Apply to ${job.title} at ${job.company}`}
                                >
                                  Apply Now
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              );
                            })()}
                            {/* Track Application */}
                            <button
                              onClick={() => handleEasyApply(job.job_id)}
                              disabled={job.is_applied}
                              className={`font-black px-4 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                                job.is_applied
                                  ? "bg-green-100 text-green-700 cursor-not-allowed border border-green-200"
                                  : "bg-[#EA580C] hover:bg-[#EA580C]/90 text-white"
                              }`}
                            >
                              📌 {job.is_applied ? "Tracking" : "Track"}
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between py-4 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Showing {((currentPage - 1) * JOBS_PER_PAGE) + 1}–{Math.min(currentPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                            page === currentPage
                              ? "bg-primary text-white shadow-sm"
                              : "border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Column 4: Right Sidebar - Tabbed AI Chat vs SMTP Mailbox */}
          <div className="lg:col-span-1 bg-card-cream border border-orange-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[540px] premium-shadow">
            <div className="flex flex-col h-full justify-between">
              
              {/* Tab selector */}
              <div className="flex gap-1.5 p-1 bg-orange-50 border border-orange-100 rounded-xl mb-3">
                <button
                  type="button"
                  onClick={() => setActiveRightTab("advisor")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    activeRightTab === "advisor" ? "bg-primary text-white shadow-xs" : "text-secondary-text hover:text-dark-text"
                  }`}
                >
                  AI Advisor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab("mailbox")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeRightTab === "mailbox" ? "bg-primary text-white shadow-xs" : "text-secondary-text hover:text-dark-text"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> SMTP Outbox ({emails.length})
                </button>
              </div>

              {activeRightTab === "advisor" ? (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Chat Header with settings key toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-orange-100/60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-dark-text">AI Career Advisor</h4>
                        <p className="text-[8px] font-black text-secondary-text uppercase">REVA RACE Assistant</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowKeyConfig(!showKeyConfig)}
                      className="p-1 rounded-lg hover:bg-orange-100/60 text-secondary-text hover:text-primary transition-all cursor-pointer"
                      title="Configure Gemini API Key"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </button>
                  </div>

                  {/* Collapsible Key Config Panel */}
                  {showKeyConfig && (
                    <form onSubmit={handleSaveKey} className="p-3 bg-white rounded-xl border border-orange-100/60 space-y-2 mt-2 animate-in slide-in-from-top duration-200">
                      <label className="text-[9px] font-black text-secondary-text uppercase block">Gemini API Key</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="Paste key..."
                          className="flex-1 bg-background-cream border border-orange-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/40 text-dark-text"
                        />
                        <button
                          type="submit"
                          disabled={configuringKey || !geminiKey.trim()}
                          className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {configuringKey ? "..." : "Save"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Message History area */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-3.5 max-h-[280px] scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === "User" ? "items-end" : "items-start"}`}>
                        <span className="text-[8px] font-black text-secondary-text uppercase mb-0.5">{msg.sender}</span>
                        <div className={`p-3 rounded-2xl text-[11px] leading-relaxed font-semibold max-w-[90%] shadow-2xs ${
                          msg.sender === "User" 
                            ? "bg-primary text-white rounded-tr-none" 
                            : "bg-white text-secondary-text border border-orange-100/50 rounded-tl-none"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {sendingChat && (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200" />
                      </div>
                    )}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-orange-100/60">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask advisor..."
                      className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 text-dark-text"
                      disabled={sendingChat}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || sendingChat}
                      className="w-8 h-8 bg-primary hover:bg-primary/95 text-white flex items-center justify-center rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-orange-100/60">
                    <div>
                      <h4 className="text-xs font-black text-dark-text">Simulated SMTP Outbox</h4>
                      <p className="text-[8px] font-black text-secondary-text uppercase">Real-time mail dispatches</p>
                    </div>
                  </div>

                  {/* Emails list container */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[360px] scrollbar-thin">
                    {emails.length === 0 ? (
                      <div className="text-center py-20 text-[10px] font-bold text-secondary-text">
                        No emails sent yet. Apply to a job posting to trigger an SMTP confirmation log.
                      </div>
                    ) : (
                      emails.map((em) => (
                        <div 
                          key={em.id} 
                          onClick={() => setSelectedEmail(em)}
                          className="p-3 bg-white hover:bg-orange-50/50 border border-orange-100/60 rounded-xl cursor-pointer transition-all shadow-2xs space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 font-extrabold rounded-md uppercase">Sent via SMTP</span>
                            <span className="text-[8px] font-bold text-secondary-text">{em.sent_at}</span>
                          </div>
                          <h5 className="text-[11px] font-black text-dark-text truncate">{em.subject}</h5>
                          <p className="text-[9px] font-bold text-secondary-text truncate">To: {em.recipient}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
      </main>

      {/* Drawer Overlay for Match score explanation */}
      {selectedJobId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end font-sans">
          <div className="w-full max-w-lg bg-card-cream h-full border-l border-orange-100 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b border-orange-100 pb-4">
                <div>
                  <h2 className="text-xl font-black">Score Explanation</h2>
                  <p className="text-xs text-secondary-text mt-0.5">
                    {explanation ? `${explanation.job_title} at ${explanation.company}` : "Loading details..."}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedJobId(null); setExplanation(null); }}
                  className="p-1 rounded-lg hover:bg-orange-100 text-secondary-text hover:text-dark-text transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingExpl ? (
                <div className="flex flex-col items-center gap-2 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs font-bold text-secondary-text">Running diagnostics...</span>
                </div>
              ) : (
                explanation && (
                  <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                      <div className="text-4xl font-black text-primary">{Math.round(explanation.final_score)}%</div>
                      <div className="text-[10px] font-bold text-secondary-text uppercase tracking-wider mt-1">Final Index Match</div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text">Criteria breakdown</h3>
                      {explanation.breakdown.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{item.criteria}</span>
                            <span className="font-bold">{Math.round(item.score)}/100</span>
                          </div>
                          <div className="w-full bg-orange-100/40 rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Lagging Areas & Corrective Actions */}
                    {explanation.suggestions && explanation.suggestions.length > 0 && (
                      <div className="space-y-3 border-t border-orange-100/60 pt-4 animate-in fade-in duration-300">
                        <h3 className="text-xs font-black uppercase tracking-wider text-dark-text flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-primary animate-pulse" /> Lagging Areas & Corrections
                        </h3>
                        <div className="space-y-2">
                          {explanation.suggestions.map((sug: string, idx: number) => (
                            <div key={idx} className="p-3 bg-red-50/50 border border-orange-100 rounded-xl text-xs font-semibold text-secondary-text leading-relaxed">
                              {sug}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            <button
              onClick={() => { setSelectedJobId(null); setExplanation(null); }}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer mt-8"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* Tailor Drawer Overlay */}
      {tailorJobId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end font-sans">
          <div className="w-full max-w-lg bg-card-cream h-full border-l border-orange-100 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b border-orange-100 pb-4">
                <div>
                  <h2 className="text-xl font-black flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" /> AI Resume Tailoring
                  </h2>
                  <p className="text-xs text-secondary-text mt-0.5 font-bold">
                    {tailoredData ? `${tailoredData.job_title} at ${tailoredData.company}` : "Analyzing qualifications..."}
                  </p>
                </div>
                <button
                  onClick={() => { setTailorJobId(null); setTailoredData(null); }}
                  className="p-1 rounded-lg hover:bg-orange-100 text-secondary-text hover:text-dark-text transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingTailor ? (
                <div className="flex flex-col items-center gap-2 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs font-bold text-secondary-text">Running S-BERT keywords mapping...</span>
                </div>
              ) : (
                tailoredData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-center animate-pulse">
                      <div>
                        <div className="text-2xl font-black text-secondary-text">{tailoredData.before_score}%</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-text mt-0.5">Original Fit</div>
                      </div>
                      <div className="border-l border-orange-200">
                        <div className="text-2xl font-black text-green-600 flex items-center justify-center gap-1">
                          {tailoredData.after_score}% <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 mt-0.5 font-black animate-bounce">Optimized Fit</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-dark-text">AI Tailored Experience Bullets</h3>
                      <p className="text-[11px] font-bold text-secondary-text leading-relaxed">
                        Incorporate these custom accomplishment statements into your work experience text block to optimize ATS index scanning:
                      </p>
                      
                      <div className="space-y-3">
                        {tailoredData.tailored_experience_bullets.map((bullet: string, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white border border-orange-100 flex flex-col gap-2 relative shadow-sm">
                            <p className="text-xs font-semibold leading-relaxed text-secondary-text pl-4 relative">
                              <span className="absolute left-0 top-0 font-bold text-primary">•</span>
                              {bullet}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(bullet);
                                toast.success("Copied tailored bullet to clipboard!");
                              }}
                              className="self-end text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              Copy statement
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-dark-text">Optimization Rationale</h3>
                      <div className="space-y-2">
                        {tailoredData.reasons.map((reason: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-xs font-semibold text-secondary-text">
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={() => { setTailorJobId(null); setTailoredData(null); }}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer mt-8"
            >
              Close Optimization
            </button>
          </div>
        </div>
      )}

      {/* Recruiter Drawer Overlay */}
      {recruiterJobId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end font-sans">
          <div className="w-full max-w-lg bg-card-cream h-full border-l border-orange-100 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b border-orange-100 pb-4">
                <div>
                  <h2 className="text-xl font-black flex items-center gap-1.5">
                    <User className="w-5 h-5 text-primary" /> Recruiter Discovery
                  </h2>
                  <p className="text-xs text-secondary-text mt-0.5 font-bold">
                    Hiring Manager & Recruiter Validation
                  </p>
                </div>
                <button
                  onClick={() => { setRecruiterJobId(null); setRecruiterData(null); }}
                  className="p-1 rounded-lg hover:bg-orange-100 text-secondary-text hover:text-dark-text transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingRecruiter ? (
                <div className="flex flex-col items-center gap-2 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs font-bold text-secondary-text">Resolving MX records & validating recruiter contact...</span>
                </div>
              ) : (
                recruiterData && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-orange-100 flex flex-col gap-4 shadow-xs">
                      <div>
                        <div className="text-sm font-extrabold text-dark-text">{recruiterData.recruiter_name}</div>
                        <div className="text-xs font-bold text-secondary-text mt-0.5">{recruiterData.recruiter_title}</div>
                      </div>

                      <div className="flex gap-2">
                        <span className="bg-green-50 text-success-color border border-green-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                          {recruiterData.verification_status}
                        </span>
                        <span className="bg-orange-50 text-primary border border-orange-100 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                          {recruiterData.mx_validation}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text">Contact Channels</h3>
                      <div className="space-y-3 font-semibold text-xs text-secondary-text">
                        <div className="flex justify-between items-center p-3 bg-white border border-orange-100/50 rounded-xl">
                          <div>
                            <div className="text-[10px] font-black text-dark-text uppercase">Corporate Email</div>
                            <div>{recruiterData.recruiter_email}</div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(recruiterData.recruiter_email);
                              toast.success("Copied email to clipboard!");
                            }}
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white border border-orange-100/50 rounded-xl">
                          <div>
                            <div className="text-[10px] font-black text-dark-text uppercase">LinkedIn Profile</div>
                            <div className="text-primary truncate max-w-[200px]">{recruiterData.linkedin_url}</div>
                          </div>
                          <a
                            href={recruiterData.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            Visit
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={() => { setRecruiterJobId(null); setRecruiterData(null); }}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer mt-8"
            >
              Close Recruiter Contact
            </button>
          </div>
        </div>
      )}
      {/* Simulated Email Detail Modal */}
      {selectedEmail !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-card-cream border border-orange-100 rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b border-orange-100 pb-3">
              <div>
                <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 font-extrabold rounded-md uppercase">SMTP Confirmation Receipt</span>
                <h3 className="text-sm font-black text-slate-800 mt-1">{selectedEmail.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 rounded-lg hover:bg-orange-100 text-secondary-text hover:text-dark-text transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700 bg-white p-4 rounded-xl border border-orange-100/50">
              <div className="flex justify-between text-[10px] text-secondary-text border-b border-slate-100 pb-2">
                <span><strong>To:</strong> {selectedEmail.recipient}</span>
                <span>{selectedEmail.sent_at}</span>
              </div>
              
              <p className="whitespace-pre-wrap leading-relaxed">
                {selectedEmail.body}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedEmail.body);
                  toast.success("Copied email text!");
                }}
                className="bg-white hover:bg-orange-50 border border-orange-200 font-bold px-4 py-2 rounded-xl text-xs text-slate-700 shadow-2xs"
              >
                Copy Content
              </button>
              <button
                onClick={() => setSelectedEmail(null)}
                className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}


    </div>
  );
}
