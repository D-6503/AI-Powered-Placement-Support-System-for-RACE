"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { apiGetProfile, apiUploadResume, apiGetParsedResume, apiGetResumeScore } from "@/lib/api";
import { toast } from "sonner";
import { 
  FileText, ArrowLeft, Loader2, Upload, CheckCircle2, 
  XCircle, AlertTriangle, Eye, Plus, Trash2, Check, PenTool
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ResumeAuditPage() {
  const [profile, setProfile] = useState<any>(null);
  const [parsedResume, setParsedResume] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState("skills");
  const [activeTab, setActiveTab] = useState("audit"); // "audit" or "builder"

  // Resume Builder States
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState<any[]>([{ degree: "", institution: "", year: "", gpa: "" }]);
  const [experience, setExperience] = useState<any[]>([{ role: "", company: "", duration: "", description: "" }]);
  const [projects, setProjects] = useState<any[]>([{ title: "", description: "", tools: "" }]);
  const [certs, setCerts] = useState<any[]>([{ name: "", organization: "", year: "" }]);
  const [building, setBuilding] = useState(false);

  const loadData = async () => {
    try {
      const p = await apiGetProfile();
      setProfile(p);
      
      try {
        const parsed = await apiGetParsedResume(p.id);
        setParsedResume(parsed);
      } catch (err) {
        console.log("No parsed resume found yet for this student.");
      }

      try {
        const score = await apiGetResumeScore(p.id);
        setAudit(score);
      } catch (err) {
        console.log("No quality audit score found yet for this student.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploading(true);
    try {
      const res = await apiUploadResume(file);
      toast.success(`Successfully uploaded resume! Score: ${res.quality_score}/100`);
      loadData();
    } catch (err) {
      toast.error("Failed to parse resume.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
    },
    maxFiles: 1
  });

  const handleBuildResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !summary || !skills) {
      toast.error("Please complete your phone, summary, and skills fields.");
      return;
    }

    setBuilding(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/resumes/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          phone,
          summary,
          education: education.filter(x => x.degree && x.institution),
          experience: experience.filter(x => x.role && x.company),
          projects: projects.filter(x => x.title && x.description),
          certifications: certs.filter(x => x.name && x.organization),
          skills: skills.split(",").map(x => x.trim()).filter(x => x.length > 0)
        })
      });

      if (!response.ok) {
        throw new Error("Resume builder failed.");
      }

      const resData = await response.json();
      toast.success(`Resume successfully compiled! ATS Score: ${resData.quality_score}/100`);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });

      await loadData();
      setActiveTab("audit");
    } catch (err: any) {
      toast.error(err.message || "Failed to compile manual resume.");
    } finally {
      setBuilding(false);
    }
  };

  // State mutators for lists
  const addEdu = () => setEducation([...education, { degree: "", institution: "", year: "", gpa: "" }]);
  const removeEdu = (idx: number) => setEducation(education.filter((_, i) => i !== idx));
  const updateEdu = (idx: number, field: string, val: string) => {
    const next = [...education];
    next[idx][field] = val;
    setEducation(next);
  };

  const addExp = () => setExperience([...experience, { role: "", company: "", duration: "", description: "" }]);
  const removeExp = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));
  const updateExp = (idx: number, field: string, val: string) => {
    const next = [...experience];
    next[idx][field] = val;
    setExperience(next);
  };

  const addProj = () => setProjects([...projects, { title: "", description: "", tools: "" }]);
  const removeProj = (idx: number) => setProjects(projects.filter((_, i) => i !== idx));
  const updateProj = (idx: number, field: string, val: string) => {
    const next = [...projects];
    next[idx][field] = val;
    setProjects(next);
  };

  const addCert = () => setCerts([...certs, { name: "", organization: "", year: "" }]);
  const removeCert = (idx: number) => setCerts(certs.filter((_, i) => i !== idx));
  const updateCert = (idx: number, field: string, val: string) => {
    const next = [...certs];
    next[idx][field] = val;
    setCerts(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Analyzing Credentials...</span>
        </div>
      </div>
    );
  }

  const sectionsList = [
    { id: "skills", label: "Skills Catalog" },
    { id: "experience", label: "Work Experience" },
    { id: "projects", label: "Academic Projects" },
    { id: "education", label: "Education Details" },
    { id: "contact_info", label: "Contact Info" }
  ];

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orange-100 pb-4">
        <div className="flex items-center gap-4">
          <Link href="/student/dashboard" className="w-10 h-10 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 flex items-center justify-center text-dark-text shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Resume Center</h1>
            <p className="text-xs font-semibold text-secondary-text mt-1">Audit structure and optimize compatibility metrics</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-orange-100/50 p-1.5 rounded-2xl border border-orange-100">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "audit" ? "bg-white text-primary shadow-sm" : "text-secondary-text hover:text-dark-text"
            }`}
          >
            ATS Audit & Upload
          </button>
          <button
            onClick={() => setActiveTab("builder")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "builder" ? "bg-white text-primary shadow-sm" : "text-secondary-text hover:text-dark-text"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Resume Builder
          </button>
        </div>
      </div>

      {activeTab === "audit" ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side: Score & Checklist */}
          <div className="space-y-8 lg:col-span-1">
            {/* Quality Audit Card */}
            <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
              <h3 className="text-md font-extrabold uppercase tracking-wider text-secondary-text">Audit Score</h3>
              <div className="flex items-center justify-between">
                <span className="text-5xl font-black text-primary">{audit?.quality_score ?? 0}%</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  !audit 
                    ? "bg-slate-100 text-slate-500" 
                    : audit.quality_score >= 70 
                      ? "bg-green-100 text-green-700" 
                      : "bg-primary/10 text-primary"
                }`}>
                  {!audit ? "No Resume" : audit.quality_score >= 70 ? "Passed Audit" : "Needs Review"}
                </span>
              </div>
              
              <div className="w-full bg-orange-100/50 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${audit?.quality_score ?? 0}%` }}
                />
              </div>
            </div>

            {/* Checklist Card */}
            <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
              <h3 className="text-md font-extrabold uppercase tracking-wider text-secondary-text">Structure Checklist</h3>
              <div className="space-y-3.5">
                {!audit?.checks ? (
                  <div className="text-xs font-bold text-secondary-text py-4">
                    Audit checklist is empty. Please upload your CV/Resume below to begin tracking credentials.
                  </div>
                ) : (
                  audit.checks.map((check: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    {check.status ? (
                      <CheckCircle2 className="w-5 h-5 text-success-color flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-error-color flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-bold">{check.section}</div>
                      <div className="text-xs text-secondary-text font-semibold mt-0.5">{check.message}</div>
                    </div>
                  </div>
                )))}
              </div>
            </div>

            {/* Dropzone Upload */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center bg-card-cream ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-orange-200 hover:border-primary/80 hover:bg-orange-50/20"
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-bold text-secondary-text">Re-indexing profile...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-secondary-text mx-auto" />
                  <p className="text-xs font-bold text-dark-text">Re-upload PDF or DOCX</p>
                  <p className="text-[10px] text-secondary-text">Recalculates placement readiness instantly</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Parsed text & Improvements */}
          <div className="lg:col-span-2 space-y-8">
            {/* Suggested Improvements Card */}
            <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
              <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" /> Suggested Improvements
              </h3>
              <ul className="space-y-3">
                {!audit ? (
                  <li className="text-xs font-bold text-secondary-text bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center">
                    No suggestions available. Please upload your CV/Resume to begin tracking suggested improvements.
                  </li>
                ) : audit.suggested_improvements.length === 0 ? (
                  <li className="text-sm font-semibold text-success-color bg-green-50/50 p-4 rounded-xl text-center">
                    ✓ Your resume is optimized! No immediate structural improvements are required.
                  </li>
                ) : (
                  audit.suggested_improvements.map((imp: string, idx: number) => (
                    <li key={idx} className="text-xs font-semibold leading-relaxed bg-orange-50/30 border border-orange-100/50 p-3.5 rounded-2xl flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      {imp}
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Parsed Sections Viewer */}
            <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-6">
              <div className="flex justify-between items-center border-b border-orange-100 pb-4 flex-wrap gap-4">
                <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> Parsed Resume Sections
                </h3>
                
                <div className="flex gap-1.5 flex-wrap">
                  {sectionsList.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSection(sec.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSection === sec.id
                          ? "bg-primary text-white"
                          : "bg-background-cream text-secondary-text hover:text-primary hover:bg-orange-50/30"
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-background-cream/50 border border-orange-100/50 rounded-2xl p-5 text-xs leading-relaxed font-semibold font-mono text-secondary-text whitespace-pre-wrap min-h-60 max-h-96 overflow-y-auto">
                {parsedResume ? (
                  parsedResume.sections[activeSection] || `No data parsed for ${activeSection}`
                ) : (
                  <span className="text-slate-400 italic">Please upload your CV/Resume to view parsed sections.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Resume Builder View */
        <form onSubmit={handleBuildResume} className="bg-card-cream border border-orange-100 rounded-3xl p-8 premium-shadow space-y-8 max-w-4xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-xl font-black">Interactive Resume Builder</h2>
            <p className="text-xs font-bold text-secondary-text">Compile profile details manually into an ATS-friendly template</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Skills (Comma-separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Python, SQL, Git & Version Control, PyTorch"
                className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Professional Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Results-oriented cybersecurity student at REVA University specialized in threat modeling and network auditing."
              className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm min-h-24"
              required
            />
          </div>

          {/* Education list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-2">
              <h3 className="text-sm font-black uppercase text-primary">Education Background</h3>
              <button
                type="button"
                onClick={addEdu}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>
            {education.map((edu, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-4 items-end bg-background-cream/40 p-4 rounded-2xl border border-orange-100/40 relative">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Degree / Qualification</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEdu(idx, "degree", e.target.value)}
                    placeholder="e.g. M.Tech in AI"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Institution</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEdu(idx, "institution", e.target.value)}
                    placeholder="REVA University"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                    required
                  />
                </div>
                <div className="col-span-1 flex gap-2 items-center">
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Grad Year</label>
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) => updateEdu(idx, "year", e.target.value)}
                      placeholder="2026"
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                      required
                    />
                  </div>
                  {education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEdu(idx)}
                      className="text-red-500 hover:text-red-700 mt-5 p-1 rounded-lg border border-orange-100 bg-white hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Experience list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-2">
              <h3 className="text-sm font-black uppercase text-primary">Work Experience</h3>
              <button
                type="button"
                onClick={addExp}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>
            {experience.map((exp, idx) => (
              <div key={idx} className="space-y-3 bg-background-cream/40 p-4 rounded-2xl border border-orange-100/40 relative">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Job Title / Role</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => updateExp(idx, "role", e.target.value)}
                      placeholder="e.g. Intern"
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExp(idx, "company", e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] font-bold text-secondary-text uppercase">Duration</label>
                      <input
                        type="text"
                        value={exp.duration}
                        onChange={(e) => updateExp(idx, "duration", e.target.value)}
                        placeholder="e.g. Jan 2024 - Present"
                        className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                        required
                      />
                    </div>
                    {experience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExp(idx)}
                        className="text-red-500 hover:text-red-700 mt-5 p-1 rounded-lg border border-orange-100 bg-white hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Accomplishment / Description</label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => updateExp(idx, "description", e.target.value)}
                    placeholder="e.g. Conducted security penetration testing, mapped vulnerability gaps, and resolved 15 active threat pathways."
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs min-h-16"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Projects list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-2">
              <h3 className="text-sm font-black uppercase text-primary">Academic Projects</h3>
              <button
                type="button"
                onClick={addProj}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>
            {projects.map((proj, idx) => (
              <div key={idx} className="space-y-3 bg-background-cream/40 p-4 rounded-2xl border border-orange-100/40 relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Project Title</label>
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => updateProj(idx, "title", e.target.value)}
                      placeholder="e.g. Churn Prediction Engine"
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] font-bold text-secondary-text uppercase">Tools Used</label>
                      <input
                        type="text"
                        value={proj.tools}
                        onChange={(e) => updateProj(idx, "tools", e.target.value)}
                        placeholder="e.g. Python, Scikit-learn, SQL"
                        className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                        required
                      />
                    </div>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProj(idx)}
                        className="text-red-500 hover:text-red-700 mt-5 p-1 rounded-lg border border-orange-100 bg-white hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Description</label>
                  <textarea
                    value={proj.description}
                    onChange={(e) => updateProj(idx, "description", e.target.value)}
                    placeholder="e.g. Trained random forest classifier, compiled pipeline, and reached 92% validation accuracy."
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs min-h-16"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Certifications list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-2">
              <h3 className="text-sm font-black uppercase text-primary">Certifications</h3>
              <button
                type="button"
                onClick={addCert}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Certificate
              </button>
            </div>
            {certs.map((cert, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-4 items-end bg-background-cream/40 p-4 rounded-2xl border border-orange-100/40 relative">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Certificate Name</label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCert(idx, "name", e.target.value)}
                    placeholder="AWS Solutions Architect"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-secondary-text uppercase">Issuing Organization</label>
                  <input
                    type="text"
                    value={cert.organization}
                    onChange={(e) => updateCert(idx, "organization", e.target.value)}
                    placeholder="Amazon Web Services"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                    required
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase">Year</label>
                    <input
                      type="text"
                      value={cert.year}
                      onChange={(e) => updateCert(idx, "year", e.target.value)}
                      placeholder="2025"
                      className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs"
                      required
                    />
                  </div>
                  {certs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCert(idx)}
                      className="text-red-500 hover:text-red-700 mt-5 p-1 rounded-lg border border-orange-100 bg-white hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-orange-100 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={building}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {building ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling Resume & Recomputing ATS...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save & Compile Resume
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
