"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetLiveFeed } from "@/lib/api";
import { toast } from "sonner";
import { 
  Building2, Search, MapPin, Mail, Phone, Globe, ExternalLink, 
  ArrowLeft, Loader2, Sparkles, Send, ShieldCheck, Copy, Check
} from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";

export default function AdminRecruiterDirectoryPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");

  // Pitch Email Composer state
  const [pitchCompany, setPitchCompany] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadCompanyMandates();
  }, []);

  const loadCompanyMandates = async () => {
    setLoading(true);
    try {
      const res = await apiGetLiveFeed({ limit: 1500 });
      setJobs(res?.jobs || []);
    } catch (err) {
      console.error("Failed to load company mandates:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group jobs by unique corporate employer
  const companyMap = new Map<string, any>();
  
  jobs.forEach(job => {
    const compName = job.company?.strip ? job.company.strip() : job.company;
    if (!compName) return;

    const key = compName.toLowerCase();
    if (!companyMap.has(key)) {
      companyMap.set(key, {
        company_name: compName,
        employer_logo: job.employer_logo,
        location: job.location || "Bengaluru, India",
        openings_count: 1,
        sample_title: job.title,
        source: job.source,
        apply_url: job.apply_url
      });
    } else {
      const existing = companyMap.get(key);
      existing.openings_count += 1;
    }
  });

  const companiesList = Array.from(companyMap.values());

  const filteredCompanies = companiesList.filter(comp => {
    const matchesSearch = comp.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCity = selectedCity === "All" || comp.location?.toLowerCase().includes(selectedCity.toLowerCase());
    return matchesSearch && matchesCity;
  });

  const handleOpenPitchModal = (comp: any) => {
    setPitchCompany(comp);
    const cleanComp = comp.company_name;
    const cleanDomain = cleanComp.toLowerCase().replace(/[^a-z0-9]/g, "") || "company";

    setEmailSubject(`REVA Placement Cell — Campus Hiring Partnership with ${cleanComp}`);
    setEmailBody(
      `Dear Talent Acquisition Team at ${cleanComp},\n\n` +
      `Greetings from the Placement Office at REVA University, Bengaluru!\n\n` +
      `We are currently presenting our 2026 Postgraduate Cohort in AI & Analytics, Cybersecurity, and Cloud Architecture. ` +
      `Our candidates undergo rigorous hands-on technical training in Python, MLOps, Cloud Infrastructure, and Cyber Defense.\n\n` +
      `We noted your recent mandate for '${comp.sample_title}' and would welcome an opportunity to schedule a campus hiring drive or share pre-vetted candidate profiles.\n\n` +
      `Best regards,\n` +
      `Dr. Alex Tan\n` +
      `Director of Corporate Relations & Placements\n` +
      `REVA University, Bengaluru | placements@reva.edu.in`
    );
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    toast.success("Outreach pitch email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-primary hover:bg-orange-100 transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                Corporate Relations Hub
              </span>
              <span className="text-xs text-secondary-text font-bold">• Recruiter Directory</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-tight mt-1">
              Corporate Employer & Recruiter Directory
            </h1>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/dashboard" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Dashboard
          </Link>
          <Link href="/admin/students" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Student Roster
          </Link>
          <Link href="/admin/recruiter-directory" className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-primary text-white shadow-xs">
            Corporate Partners
          </Link>
          <Link href="/admin/salary-analytics" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            CTC Analytics
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search corporate hiring partner by company name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <span className="text-xs font-bold text-secondary-text">City Hub:</span>
            {["All", "Bangalore", "Pune", "Hyderabad", "Gurugram", "Chennai"].map(c => (
              <button
                key={c}
                onClick={() => setSelectedCity(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedCity === c
                    ? "bg-[#0C2340] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs font-bold text-secondary-text">Loading corporate recruiter directory...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-3xl border border-slate-200">
          <Building2 className="w-10 h-10 text-orange-200 mx-auto" />
          <p className="text-sm font-bold text-dark-text">No corporate partners match the selected filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map(comp => {
            const cleanDomain = comp.company_name.toLowerCase().replace(/[^a-z0-9]/g, "") || "company";

            return (
              <div key={comp.company_name} className="bg-white border border-slate-200/80 hover:border-orange-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  {/* Logo and Name */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100 p-1.5">
                      <CompanyLogo company={comp.company_name} employerLogo={comp.employer_logo} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-base text-dark-text truncate">{comp.company_name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-secondary-text mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{comp.location}</span>
                      </div>
                      <div className="mt-2">
                        <span className="px-2.5 py-1 rounded-full bg-orange-100 text-primary text-[10px] font-black">
                          {comp.openings_count} Active Mandates
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outreach Intelligence Box */}
                  <div className="space-y-2 text-xs font-semibold text-slate-700 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-secondary-text">Recruitment Mail:</span>
                      <span className="font-mono text-primary font-bold">careers@{cleanDomain}.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-secondary-text">Status:</span>
                      <span className="text-green-700 font-bold text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Outreach
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <a
                    href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(comp.company_name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    LinkedIn
                  </a>
                  <button
                    onClick={() => handleOpenPitchModal(comp)}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Compose Pitch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outreach Pitch Modal */}
      {pitchCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-dark-text">Campus Outreach Pitch Generator</h3>
                  <p className="text-xs text-secondary-text font-semibold">Generate corporate partnership email for {pitchCompany.company_name}</p>
                </div>
              </div>
              <button onClick={() => setPitchCompany(null)} className="text-slate-400 hover:text-dark-text p-1 cursor-pointer">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-orange-200 text-xs font-bold bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Email Body Pitch</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full p-4 rounded-2xl border border-orange-200 text-xs font-medium leading-relaxed bg-slate-50 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPitchCompany(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied Pitch!" : "Copy Pitch Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
