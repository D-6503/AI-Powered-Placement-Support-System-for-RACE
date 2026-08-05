"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetRecommendations, apiGetJobExplanation, apiCreateApplication, apiGetRecruiterDetails, getSmartApplyUrl, getCareersApplyUrl, getLinkedInApplyUrl, getNaukriApplyUrl, apiGetLiveStatus, apiRefreshLiveJobs } from "@/lib/api";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import CompanyLogo from "@/components/CompanyLogo";
import { 
  Briefcase, ArrowLeft, ArrowRight, Loader2, Bookmark, CheckCircle2, 
  X, Check, AlertTriangle, Layers, MapPin, Clock, Sparkles,
  Search, Mail, User, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";

export default function JobMatchesPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeCity, setActiveCity] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeApplyJob, setActiveApplyJob] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const JOBS_PER_PAGE = 6;
  
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
      const data = await apiGetRecruiterDetails(jobId);
      setRecruiterData(data);
    } catch {
      toast.error("Failed to discover recruiter contacts.");
      setRecruiterJobId(null);
    } finally {
      setLoadingRecruiter(false);
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
            const data = await apiGetRecommendations();
            setJobs(data);
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

  const loadJobs = async () => {
    try {
      const data = await apiGetRecommendations();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    loadLiveStatus();
  }, []);

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
      const data = await response.json();
      setTailoredData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tailoring suggestions.");
      setTailorJobId(null);
    } finally {
      setLoadingTailor(false);
    }
  };

  const handleSaveJob = async (jobId: number) => {
    try {
      await apiCreateApplication(jobId);
      toast.success("Job saved to your Application Kanban board!");
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, is_applied: true } : j));
    } catch {
      toast.error("Failed to save job. It may already be tracked.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Smart Apply URL Builder
  // Priority: stored apply_url → platform-specific search → LinkedIn fallback
  // ─────────────────────────────────────────────────────────────
  const getApplyUrl = (job: any): string => {
    return getSmartApplyUrl(job);
  };

  const getJobPlatformBadge = (job: any) => {
    const src = (job.source || "").toLowerCase();
    const url = (job.apply_url || "").toLowerCase();
    if (src === "greenhouse" || url.includes("greenhouse.io")) {
      return { label: "Greenhouse ATS", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    }
    if (src === "lever" || url.includes("lever.co")) {
      return { label: "Lever ATS", color: "bg-cyan-50 text-cyan-700 border border-cyan-200" };
    }
    if (src === "smartrecruiters" || url.includes("smartrecruiters.com")) {
      return { label: "SmartRecruiters ATS", color: "bg-teal-50 text-teal-700 border border-teal-200" };
    }
    if (src === "adzuna" || url.includes("adzuna")) {
      return { label: "Adzuna", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    }
    if (src === "jsearch" || url.includes("jsearch")) {
      return { label: "JSearch Multi-platform", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    }
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


  // Label to display on the apply button based on platform
  const getPlatformLabel = (job: any): { label: string; color: string } => {
    const url = getSmartApplyUrl(job).toLowerCase();
    if (url.includes("greenhouse.io")) return { label: "Apply on Greenhouse ATS", color: "bg-emerald-600 hover:bg-emerald-700" };
    if (url.includes("lever.co")) return { label: "Apply on Lever ATS", color: "bg-cyan-600 hover:bg-cyan-700" };
    if (url.includes("smartrecruiters.com")) return { label: "Apply on SmartRecruiters ATS", color: "bg-teal-600 hover:bg-teal-700" };
    if (url.includes("adzuna")) return { label: "Apply on Adzuna", color: "bg-amber-600 hover:bg-amber-700" };
    if (url.includes("careers.google.com")) return { label: "Apply on Google Careers", color: "bg-[#4285F4] hover:bg-[#4285F4]/90" };
    if (url.includes("careers.microsoft.com")) return { label: "Apply on Microsoft Search", color: "bg-[#00A4EF] hover:bg-[#00A4EF]/90" };
    if (url.includes("amazon.jobs")) return { label: "Apply on Amazon Jobs", color: "bg-[#FF9900] hover:bg-[#FF9900]/90" };
    if (url.includes("careers.walmart.com")) return { label: "Apply on Walmart Careers", color: "bg-[#0071CE] hover:bg-[#0071CE]/90" };
    if (url.includes("careers.wipro.com")) return { label: "Apply on Wipro Careers", color: "bg-green-700 hover:bg-green-800" };
    if (url.includes("career.infosys.com")) return { label: "Apply on Infosys iCareers", color: "bg-blue-700 hover:bg-blue-800" };
    if (url.includes("nextstep.tcs.com")) return { label: "Apply on TCS NextStep", color: "bg-blue-800 hover:bg-blue-900" };
    if (url.includes("careers.cognizant.com")) return { label: "Apply on Cognizant", color: "bg-blue-600 hover:bg-blue-700" };
    if (url.includes("careers.ey.com")) return { label: "Apply on EY Careers", color: "bg-[#FEE21E] hover:bg-[#FEE21E]/90 text-slate-900 font-black" };
    if (url.includes("pwc.com")) return { label: "Apply on PwC Careers", color: "bg-[#D04A02] hover:bg-[#D04A02]/90" };
    if (url.includes("careers.kpmg.com")) return { label: "Apply on KPMG Careers", color: "bg-[#00338D] hover:bg-[#00338D]/90" };
    if (url.includes("sc.com")) return { label: "Apply on Standard Chartered", color: "bg-[#0A8A42] hover:bg-[#0A8A42]/90" };
    if (url.includes("linkedin.com")) return { label: "Apply on LinkedIn", color: "bg-[#0A66C2] hover:bg-[#0A66C2]/90" };
    if (url.includes("naukri.com")) return { label: "Apply on Naukri", color: "bg-[#FF7555] hover:bg-[#FF7555]/90" };
    if (url.includes("remotive.com")) return { label: "Apply on Remotive", color: "bg-[#00C8AA] hover:bg-[#00C8AA]/90" };
    if (url.includes("instahyre.com")) return { label: "Apply on Instahyre", color: "bg-purple-600 hover:bg-purple-700" };
    if (url.includes("foundit.in")) return { label: "Apply on Foundit", color: "bg-indigo-600 hover:bg-indigo-700" };
    if (url.includes("glassdoor")) return { label: "Apply on Glassdoor", color: "bg-green-600 hover:bg-green-700" };
    return { label: "Apply Now", color: "bg-[#0C2340] hover:bg-[#0C2340]/90" };
  };


  // LinkedIn fallback search URL (always available as secondary button)
  const getLinkedInSearchUrl = (job: any): string => {
    const title = encodeURIComponent(job.title || "");
    return `https://www.linkedin.com/jobs/search/?keywords=${title}&location=India&f_TPR=r604800&f_JT=F`;
  };

  // Naukri fallback URL
  const getNaukriUrl = (job: any) => {
    const slug = (job.title || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://www.naukri.com/${slug}-jobs-in-bengaluru?qp=${encodeURIComponent(job.title)}&l=Bengaluru`;
  };

  // Format salary in INR Lakhs

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const toLPA = (v: number) => (v / 100000).toFixed(1);
    if (min && max) return `₹${toLPA(min)}L – ₹${toLPA(max)}L PA`;
    if (min) return `From ₹${toLPA(min)}L PA`;
    return `Up to ₹${toLPA(max!)}L PA`;
  };

  const getCompanyColor = (company: string) => {
    const name = (company || "").toLowerCase();
    if (name.includes("google")) return "bg-gradient-to-br from-blue-500 via-red-400 to-yellow-400 text-white";
    if (name.includes("microsoft")) return "bg-gradient-to-br from-cyan-500 to-blue-600 text-white";
    if (name.includes("walmart")) return "bg-gradient-to-br from-blue-700 to-blue-900 text-white";
    if (name.includes("flipkart")) return "bg-gradient-to-br from-yellow-400 to-orange-500 text-white";
    if (name.includes("ey") || name.includes("ernst")) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900";
    if (name.includes("kpmg")) return "bg-gradient-to-br from-blue-600 to-blue-800 text-white";
    if (name.includes("pwc")) return "bg-gradient-to-br from-orange-500 to-red-600 text-white";
    if (name.includes("ibm")) return "bg-gradient-to-br from-blue-800 to-indigo-900 text-white";
    if (name.includes("infosys")) return "bg-gradient-to-br from-blue-500 to-indigo-600 text-white";
    if (name.includes("wipro")) return "bg-gradient-to-br from-green-500 to-teal-600 text-white";
    if (name.includes("tcs")) return "bg-gradient-to-br from-blue-600 to-purple-600 text-white";
    if (name.includes("accenture")) return "bg-gradient-to-br from-purple-500 to-indigo-700 text-white";
    if (name.includes("standard")) return "bg-gradient-to-br from-teal-600 to-green-700 text-white";
    return "bg-gradient-to-br from-orange-200 to-orange-300 text-primary";
  };

  function classifyCategory(title: string) {
    const t = String(title).toLowerCase();
    if (t.includes("machine") || t.includes("ml") || t.includes("ai") || t.includes("analytics") ||
        t.includes("data") || t.includes("genai") || t.includes("nlp") || t.includes("vision")) return "AI & Analytics";
    if (t.includes("security") || t.includes("cyber") || t.includes("soc") || t.includes("threat") ||
        t.includes("pentest") || t.includes("vulnerability") || t.includes("grc") || t.includes("iam")) return "Cybersecurity";
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
    const trackFiltered = jobs.filter(j => activeFilter === "All" || classifyCategory(j.title) === activeFilter);
    return trackFiltered.filter(j => matchCity(j.location || "", cityName)).length;
  };

  const filteredJobs = jobs.filter(j => {
    const matchesTrack = activeFilter === "All" || classifyCategory(j.title) === activeFilter;
    const matchesLocation = matchCity(j.location || "", activeCity);
    return matchesTrack && matchesLocation;
  });
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Running AI Matching Algorithms...</span>
          <span className="text-xs font-semibold text-secondary-text/70">Scoring {jobs.length} opportunities for your profile</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/student/dashboard" className="w-10 h-10 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 flex items-center justify-center text-dark-text shadow-sm transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">AI Job Recommendations</h1>
            <p className="text-xs font-semibold text-secondary-text mt-1">
              {filteredJobs.length} live openings matched to your profile · Bangalore, India
            </p>
          </div>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["All", "AI & Analytics", "Cybersecurity", "Cloud Architecture"].map(f => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setActiveCity("All"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === f
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-orange-200 text-secondary-text hover:bg-orange-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
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

      {/* Mini City Filter Row with dynamic count badges */}
      <div className="bg-orange-50/40 border border-orange-100/60 rounded-2xl p-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black text-secondary-text uppercase tracking-wider mr-2">Filter by City:</span>
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
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCity === city.name
                  ? "bg-[#0C2340] text-white shadow-xs"
                  : "bg-white border border-orange-150 text-slate-600 hover:border-orange-350 hover:bg-orange-50/30"
              }`}
            >
              <span>{city.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                activeCity === city.name ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>


      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Jobs List Panel */}
        <div className="lg:col-span-2 space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-orange-100 rounded-2xl p-16 text-center space-y-3">
              <Briefcase className="w-12 h-12 text-orange-200 mx-auto" />
              <p className="text-sm font-bold text-secondary-text">No matches found for this track.</p>
              <p className="text-xs font-semibold text-secondary-text/70">Complete your profile and upload your resume to improve matching!</p>
            </div>
          ) : (
            <>
              {paginatedJobs.map((job) => {
                const salary = formatSalary(job.salary_min, job.salary_max);
                const fitPct = Math.round(job.final_score || 0);
                const fitColor = fitPct >= 70 ? "text-green-700 bg-green-50 border-green-200"
                               : fitPct >= 50 ? "text-orange-600 bg-orange-50 border-orange-200"
                               : "text-slate-500 bg-slate-50 border-slate-200";

                return (
                  <div
                    key={job.job_id}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-200"
                  >
                    {/* Card Top */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                             <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100/60 p-1">
                               <CompanyLogo company={job.company} employerLogo={job.employer_logo} />
                             </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-800 truncate">{job.title}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-xs font-bold text-primary truncate">{job.company}</p>
                              {(() => {
                                const badge = getJobPlatformBadge(job);
                                return (
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                                {job.posted_date ? new Date(job.posted_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recently posted"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* ATS Score */}
                        <div className={`px-3 py-2 rounded-xl border text-center flex-shrink-0 min-w-[64px] ${fitColor}`}>
                          <div className="text-xl font-black leading-none">{fitPct}%</div>
                          <div className="text-[8px] font-black uppercase tracking-wide mt-0.5">ATS Fit</div>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary flex-shrink-0" />{job.location || "India"}</span>
                        {job.experience_required > 0 && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary flex-shrink-0" />{job.experience_required} yr{job.experience_required !== 1 ? "s" : ""} exp</span>
                        )}
                        {salary && <span className="font-black text-green-700">{salary}</span>}
                      </div>

                      {/* Job Description Preview */}
                      {job.jd_text && (
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-3 line-clamp-2">
                          {job.jd_text.replace(/\s+/g, " ").trim().substring(0, 200) + (job.jd_text.length > 200 ? "…" : "")}
                        </p>
                      )}

                      {/* Skills */}
                      <div className="mt-3 space-y-2">
                        {(job.matched_skills || []).length > 0 && (
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Matched Skills</div>
                            <div className="flex flex-wrap gap-1.5">
                              {(job.matched_skills || []).slice(0, 5).map((s: string) => (
                                <span key={s} className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-200">✓ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(job.missing_skills || []).length > 0 && (
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-orange-500" /> Skill Gaps
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(job.missing_skills || []).slice(0, 4).map((s: string) => (
                                <span key={s} className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">✖ {s}</span>
                              ))}
                              {(job.missing_skills || []).length > 4 && (
                                <span className="text-[10px] font-bold text-slate-400 self-center">+{job.missing_skills.length - 4} more gaps</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100 flex-wrap gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenExplanation(job.job_id)}
                          className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer flex items-center gap-1 text-slate-600 hover:text-primary hover:border-orange-300 transition-all"
                        >
                          <AlertTriangle className="w-3 h-3" /> Audit Score
                        </button>
                        <button
                          onClick={() => handleOpenTailor(job.job_id)}
                          className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer flex items-center gap-1 text-slate-600 hover:text-primary hover:border-orange-300 transition-all"
                        >
                          <Sparkles className="w-3 h-3" /> AI Tailor
                        </button>
                        <button
                          onClick={() => handleOpenRecruiter(job.job_id)}
                          className="bg-white hover:bg-orange-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer flex items-center gap-1 text-slate-600 hover:text-primary hover:border-orange-300 transition-all"
                        >
                          <Search className="w-3 h-3" /> Recruiter
                        </button>
                      </div>

                      <div className="flex gap-2 items-center flex-wrap">
                        {/* Primary platform-specific Apply button */}
                        {(() => {
                          const applyUrl = getApplyUrl(job);
                          const { color } = getPlatformLabel(job);
                          return (
                            <a
                              href={applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleSaveJob(job.job_id)}
                              className={`text-[10px] font-extrabold text-white ${color} px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer`}
                              title={`Apply to ${job.title} at ${job.company}`}
                            >
                              Apply Now
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          );
                        })()}
                        {/* Track / Save button */}
                        <button
                          onClick={() => handleSaveJob(job.job_id)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between py-4 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Showing {((currentPage - 1) * JOBS_PER_PAGE) + 1}–{Math.min(currentPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box Side panel */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
            <h3 className="text-md font-extrabold uppercase tracking-wider text-secondary-text">Scoring Criteria</h3>
            <p className="text-xs font-semibold text-secondary-text leading-relaxed">
              We compile recommendations using a weighted multi-criteria calculation:
            </p>
            <div className="space-y-2.5 pt-2">
              {[
                { label: "Semantic Similarity", wt: "30%" },
                { label: "Required Skill Coverage", wt: "25%" },
                { label: "Demand-Aware Skill weight", wt: "20%" },
                { label: "Evidence verification quality", wt: "15%" },
                { label: "Experience Eligibility", wt: "5%" },
                { label: "Preferred Location fit", wt: "5%" }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                  <span>{item.label}</span>
                  <span className="font-bold text-primary">{item.wt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Overlay for Match score explanation */}
      {selectedJobId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
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
                    {/* Score comparison card */}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-card-cream h-full border-l border-orange-100 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b border-orange-100 pb-4">
                <div>
                  <h2 className="text-xl font-black flex items-center gap-1.5">
                    <User className="w-5 h-5 text-primary" /> Corporate Hiring Hub
                  </h2>
                  <p className="text-xs text-secondary-text mt-0.5 font-bold">
                    Official Corporate Contact & Office Details
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
                  <span className="text-xs font-bold text-secondary-text">Resolving live corporate web intelligence...</span>
                </div>
              ) : (
                recruiterData && (
                  <div className="space-y-6">
                    {/* Corporate Contact Card */}
                    <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col gap-4 shadow-md">
                      <div>
                        <div className="text-base font-extrabold text-white">{recruiterData.company_name} — Corporate Hiring Hub</div>
                        <div className="text-xs font-bold text-orange-400 mt-0.5">{recruiterData.recruiter_title}</div>
                      </div>

                      {recruiterData.company_linkedin_url && (
                        <div className="flex gap-2">
                          <a
                            href={recruiterData.company_linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Company LinkedIn Page
                          </a>
                          {recruiterData.official_website && (
                            <a
                              href={recruiterData.official_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                            >
                              Official Website
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Address & Outreach Details */}
                    <div className="space-y-3 bg-white p-5 rounded-2xl border border-orange-100 shadow-xs">
                      <h3 className="text-xs font-black uppercase tracking-wider text-dark-text">Corporate Office & Outreach Contact</h3>
                      
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start text-xs font-semibold border-b border-orange-100/50 pb-2 gap-4">
                          <span className="text-secondary-text shrink-0">HQ Address</span>
                          <span className="font-bold text-dark-text text-right">{recruiterData.company_address}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold border-b border-orange-100/50 pb-2">
                          <span className="text-secondary-text">Careers Email</span>
                          <a href={`mailto:${recruiterData.corporate_email}`} className="font-mono font-bold text-primary hover:underline">
                            {recruiterData.corporate_email}
                          </a>
                        </div>
                        <div className="flex justify-between text-xs font-semibold border-b border-orange-100/50 pb-2">
                          <span className="text-secondary-text">Boardline Phone</span>
                          <span className="font-mono text-dark-text">{recruiterData.corporate_phone || "+91 80 4000 1000"}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold pb-1">
                          <span className="text-secondary-text">Live Web Resolution</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {recruiterData.verification_status || "Verified Official Channel"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick outreach reminder note */}
                    <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-[10px] font-bold text-secondary-text leading-relaxed">
                      💡 Tip: Use the **AI Document Generator** to draft a cover letter or application pitch for {recruiterData.company_name}'s talent acquisition team.
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={() => { setRecruiterJobId(null); setRecruiterData(null); }}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer mt-8"
            >
              Close Corporate Contact
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
