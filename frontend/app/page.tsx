"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, FileText, BarChart3, ShieldAlert, Mail, Layers, Cpu, 
  CheckCircle2, Award, Zap, BookOpen, GraduationCap, Calendar, Lock
} from "lucide-react";
import RevaLogo from "@/components/RevaLogo";
import CompanyLogo from "@/components/CompanyLogo";

function PartnerLogo({ partner, domain }: { partner: string; domain: string }) {
  const [loadState, setLoadState] = useState(0);

  if (loadState === 2) {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      "IBM India": {
        bg: "bg-gradient-to-br from-blue-700 to-indigo-900",
        text: "text-white font-mono tracking-tighter text-[10px] font-black",
        label: "IBM"
      },
      "Ensign InfoSecurity": {
        bg: "bg-gradient-to-br from-teal-900 to-slate-900",
        text: "text-teal-300 font-serif text-[8px] font-black tracking-widest",
        label: "ENSIGN"
      },
      "NCS Group": {
        bg: "bg-gradient-to-br from-orange-600 to-red-800",
        text: "text-white font-sans text-xs font-black tracking-wide",
        label: "NCS"
      },
      "Capgemini": {
        bg: "bg-gradient-to-br from-[#0070AD] to-blue-900",
        text: "text-white font-sans text-[8px] font-black tracking-widest",
        label: "CAPGEMINI"
      },
      "Oracle Labs": {
        bg: "bg-gradient-to-br from-red-800 to-slate-900",
        text: "text-white font-serif text-xs font-black tracking-wider",
        label: "ORACLE"
      },
      "PwC": {
        bg: "bg-gradient-to-br from-[#D04A02] to-amber-700",
        text: "text-white font-sans text-xs font-black lowercase tracking-tighter",
        label: "pwc"
      },
      "EY": {
        bg: "bg-gradient-to-br from-[#FFE600] to-yellow-500",
        text: "text-black font-sans text-xs font-black tracking-widest",
        label: "EY"
      },
      "SecureNet": {
        bg: "bg-gradient-to-br from-emerald-700 to-slate-900",
        text: "text-white font-mono text-[8px] font-black uppercase tracking-wider",
        label: "SECNET"
      }
    };

    const config = styles[partner] || {
      bg: "bg-gradient-to-br from-orange-500 to-amber-600",
      text: "text-white font-sans text-xs font-black",
      label: partner.substring(0, 2).toUpperCase()
    };

    return (
      <div className={`w-full h-full flex items-center justify-center rounded-lg shadow-inner ${config.bg}`}>
        <span className={config.text}>{config.label}</span>
      </div>
    );
  }

  const src = loadState === 0
    ? `https://logo.clearbit.com/${domain}?cb=race`
    : `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128&cb=race`;

  return (
    <img 
      src={src}
      alt={`${partner} Logo`}
      className="w-full h-full object-contain mix-blend-multiply"
      onError={() => {
        setLoadState(prev => prev + 1);
      }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background-cream text-dark-text selection:bg-primary/20">
      
      {/* 🏛️ Internal Student Services Top Bar */}
      <div className="bg-[#0C2340] text-white text-[11px] font-bold px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center border-b border-orange-500/20 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-primary" /> REVA University - Internal Candidate Services
          </span>
          <span className="hidden md:inline-flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-primary" /> support.race@reva.edu.in
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider">
            Secure Candidate Access
          </span>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-orange-100 bg-white sticky top-0 z-50 shadow-xs">
        <Link href="/" className="flex items-center">
          <RevaLogo large />
        </Link>
        
        {/* Navigation Items */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-black text-secondary-text uppercase tracking-wider">
          <a href="#overview" className="hover:text-primary transition-all">Portal Overview</a>
          <a href="#tracks" className="hover:text-primary transition-all">Specialization Tracks</a>
          <a href="#capabilities" className="hover:text-primary transition-all">Portal Capabilities</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-black text-secondary-text uppercase tracking-wider hover:text-primary transition-colors cursor-pointer">
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-black bg-primary hover:bg-primary/95 text-white px-5 py-3 rounded-xl transition-all shadow-sm premium-shadow uppercase tracking-wider cursor-pointer"
          >
            Register Profile
          </Link>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <section id="overview" className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 py-16 lg:py-24 gap-12 max-w-7xl mx-auto w-full relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-3xl -z-10" />

        {/* Left Side: Welcome Copy */}
        <div className="flex-1 space-y-6 text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100/50 border border-orange-200 text-primary text-[10px] font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> REVA Academy for Corporate Excellence (RACE)
          </div>

          <h1 className="text-4xl md:text-5.5xl font-black tracking-tight leading-none text-dark-text font-serif">
            AI-Powered Placement & <br />
            <span className="text-primary font-black">Career Readiness</span> Hub
          </h1>

          <p className="text-sm md:text-base text-secondary-text font-semibold leading-relaxed">
            Welcome to the internal placement intelligence platform for admitted candidates at REVA RACE. Track corporate placement pipelines, audit resume compatibility against active mandates, resolve skill gaps, and validate outreach channels using your official student account.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md premium-shadow group text-xs uppercase tracking-wider"
            >
              Onboard Profile
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-white hover:bg-orange-50/50 text-dark-text border border-orange-200 font-bold px-6 py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider shadow-xs"
            >
              Candidate Sign In
            </Link>
          </div>

          {/* Academic Stickers */}
          <div className="pt-6 border-t border-orange-100/80">
            <p className="text-[10px] font-bold text-secondary-text uppercase tracking-widest mb-3">Academic Program Standards</p>
            <div className="flex flex-wrap gap-4 items-center opacity-85">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-orange-100 shadow-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                <span className="text-[10px] font-black text-dark-text">AWS Academy Member</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-orange-100 shadow-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black text-dark-text">EC-Council Mapped</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-orange-100 shadow-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                <span className="text-[10px] font-black text-dark-text">Cloud Security Alliance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: High-Fidelity Candidate Dashboard Workflow tracker built purely in CSS/HTML */}
        <div className="flex-1 w-full max-w-lg bg-white border border-orange-100 rounded-3xl p-6 shadow-lg space-y-6">
          <div className="flex justify-between items-center border-b border-orange-100 pb-3">
            <div>
              <span className="text-[9px] font-black uppercase text-primary tracking-widest">RACE Placement Pipeline</span>
              <h4 className="text-sm font-extrabold text-dark-text mt-0.5">Automated Candidate Workflow</h4>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#0C2340]/10 text-[#0C2340] text-[9px] font-black tracking-wider uppercase">
              Core Engine
            </span>
          </div>

          {/* Workflow Steps Vertical Timeline */}
          <div className="relative pl-6 space-y-6">
            {/* Timeline vertical connector line */}
            <div className="absolute left-2 top-2 bottom-2 w-[1.5px] bg-orange-200" />

            {[
              {
                step: "01",
                label: "Resume Ingestion & Parsing",
                badge: "PDF / DOCX Parser",
                desc: "Extracts contact info, work history, projects, and generates a structured candidate skills taxonomy.",
                active: true
              },
              {
                step: "02",
                label: "Specialization Gap Diagnostics",
                badge: "Taxonomy Auditor",
                desc: "Maps candidate skills against program ground truths, highlighting curriculum requirements gaps.",
                active: true
              },
              {
                step: "03",
                label: "Mandate Score Alignment",
                badge: "FAISS Index Matcher",
                desc: "Ranks live vacancy compatibility index using demand-aware semantic cosine similarity.",
                active: false
              },
              {
                step: "04",
                label: "AI Statement Tailoring",
                badge: "S-BERT Optimizer",
                desc: "Rewrites candidate bullet statements to fit target vacancy keywords, maximizing ATS validation scores.",
                active: false
              },
              {
                step: "05",
                label: "Outreach & SMTP Verification",
                badge: "MX Validator & SMTP Logs",
                desc: "Audits target hiring manager mailboxes and generates personalized email templates.",
                active: false
              }
            ].map((item, idx) => (
              <div key={idx} className="relative group text-left">
                {/* Timeline node */}
                <div className={`absolute -left-[23px] top-1.5 w-[14px] h-[14px] rounded-full border-2 bg-white transition-colors duration-300 ${
                  item.active 
                    ? "border-primary bg-primary" 
                    : "border-orange-200 group-hover:border-primary"
                }`} />

                <div className="space-y-1.5 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-dark-text">{item.step}. {item.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      item.active 
                        ? "bg-orange-100 text-primary border border-orange-200/50" 
                        : "bg-slate-100 text-slate-500 border border-slate-200/40"
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-secondary-text font-semibold leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Placement Flight Path (Onboarding Workflow) */}
      <section className="py-16 px-6 lg:px-12 bg-white border-t border-orange-100/80 text-center">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif text-dark-text">Your Placement Flight Path</h2>
            <p className="text-xs text-secondary-text font-semibold">Track your progress from onboarding to recruiter communication</p>
          </div>

          <div className="grid sm:grid-cols-5 gap-6">
            {[
              { step: "01", title: "Verify SRN", desc: "Register using your official Student Register Number (SRN)." },
              { step: "02", title: "ATS Audit", desc: "Upload your current CV to run structural diagnostics and audits." },
              { step: "03", title: "Explore Matches", desc: "Browse pre-filtered job vacancies categorized by compatibility index." },
              { step: "04", title: "Resume Tailoring", desc: "Optimize specific experience statements to align with target JDs." },
              { step: "05", title: "Communication", desc: "Verify recruiter mailboxes and generate personalized letters." }
            ].map((stepItem, idx) => (
              <div key={idx} className="bg-background-cream/35 border border-orange-100/65 rounded-2xl p-5 text-left space-y-3 shadow-xs">
                <span className="text-xs font-black text-primary font-mono bg-orange-100/40 px-2.5 py-1 rounded-md">{stepItem.step}</span>
                <div>
                  <h4 className="font-extrabold text-xs text-dark-text">{stepItem.title}</h4>
                  <p className="text-[10px] text-secondary-text font-semibold mt-1 leading-relaxed">{stepItem.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Specialization Tracks Section */}
      <section id="tracks" className="py-20 px-6 lg:px-12 bg-white border-t border-orange-100/80 text-center">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif text-dark-text">Academic Specialization Tracks</h2>
            <p className="text-xs text-secondary-text font-semibold">Pre-mapped skill taxonomies for active postgraduate cohorts</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Artificial Intelligence & Analytics",
                type: "M.Tech / M.Sc / PGDM",
                skills: ["Python", "TensorFlow", "Scikit-Learn", "S-BERT", "Transformers", "SQL"],
                desc: "Focused on machine learning engineering, NLP architecture, and generative model deployment."
              },
              {
                title: "Cybersecurity Systems",
                type: "M.Tech / M.Sc / PG Diploma",
                skills: ["Linux", "Threat Intelligence", "Splunk SIEM", "Vulnerability Scanning", "Network Security"],
                desc: "Structured vulnerability auditing, security operational center (SOC) metrics, and threat hunting."
              },
              {
                title: "Cloud Infrastructure Architecture",
                type: "M.Tech / M.Sc / PG Diploma / Certifications",
                skills: ["AWS Cloud", "Azure Dev", "Terraform", "Kubernetes (CKA)", "Docker", "Git & CI/CD"],
                desc: "Cloud infrastructure provisioning, scalable Kubernetes clustering, and pipeline optimization."
              }
            ].map((prog, idx) => (
              <div key={idx} className="bg-background-cream/40 border border-orange-100 rounded-3xl p-6 text-left flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-primary uppercase tracking-wider">{prog.type}</span>
                  <h3 className="text-base font-black text-dark-text font-serif leading-snug">{prog.title}</h3>
                  <p className="text-xs text-secondary-text font-semibold leading-relaxed">{prog.desc}</p>
                </div>

                <div className="space-y-2 border-t border-orange-100/60 pt-4">
                  <h4 className="text-[9px] font-black uppercase text-secondary-text tracking-wider">Curriculum Skill Focus</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {prog.skills.map((s) => (
                      <span key={s} className="bg-white border border-orange-100/50 px-2 py-0.5 rounded-md text-[9px] font-bold text-secondary-text">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recruiter Partners Grid */}
      <section id="partners" className="py-16 px-6 lg:px-12 bg-background-cream/40 border-t border-orange-100/80 text-center">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Global Hiring Network</p>
            <h3 className="text-2xl font-serif font-black text-dark-text">Top Recruiting Corporate Partners</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 items-center justify-center">
            {[
              { name: "Google", logo: null },
              { name: "Microsoft", logo: null },
              { name: "Amazon", logo: null },
              { name: "Infosys", logo: null },
              { name: "Wipro", logo: null },
              { name: "TCS", logo: null },
              { name: "Rubrik", logo: null },
              { name: "Swiggy", logo: null },
              { name: "Razorpay", logo: null },
              { name: "CRED", logo: null },
              { name: "Stripe", logo: null },
              { name: "Flipkart", logo: null }
            ].map((partner) => (
              <div key={partner.name} className="bg-white border border-slate-200/80 hover:border-orange-300 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden p-1 shadow-xs">
                  <CompanyLogo company={partner.name} employerLogo={partner.logo} />
                </div>
                <span className="text-xs font-extrabold text-dark-text truncate w-full text-center">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="py-20 px-6 lg:px-12 bg-white border-t border-orange-100/80 text-center">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2.5xl md:text-3.5xl font-extrabold tracking-tight font-serif text-dark-text">Portal Capabilities</h2>
            <p className="text-xs text-secondary-text font-semibold">Enterprise placement support tools for candidate audit analysis</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FileText className="w-6 h-6 text-primary" />,
                title: "ATS Resume Auditor",
                desc: "Parses PDF/DOCX resumes, flags missing timeline elements, and delivers custom tailors."
              },
              {
                icon: <Layers className="w-6 h-6 text-primary" />,
                title: "Demand-Aware Matching",
                desc: "Matches candidates by dynamically weighting live job-market demand, giving more importance to active required skills."
              },
              {
                icon: <ShieldAlert className="w-6 h-6 text-primary" />,
                title: "Validated Recruiter Contacts",
                desc: "Identifies target hiring managers, validates corporate SMTP emails, and details MX records logs."
              }
            ].map((feat, i) => (
              <div key={i} className="p-8 rounded-3xl bg-background-cream/20 border border-orange-100/50 text-left space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-orange-100/40 flex items-center justify-center">
                  {feat.icon}
                </div>
                <h3 className="text-base font-extrabold text-dark-text font-serif">{feat.title}</h3>
                <p className="text-xs leading-relaxed text-secondary-text font-semibold">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-orange-100/80 text-center text-xs font-semibold text-[#CBD5E1] bg-[#0C2340] space-y-2">
        <p className="text-white">© 2026 REVA Academy for Corporate Excellence (RACE). All Rights Reserved.</p>
        <p>Internal Student Portal | M.Tech / M.Sc / PGDM / PG Diploma in Artificial Intelligence, Cybersecurity & Cloud Architecture.</p>
      </footer>
    </div>
  );
}
