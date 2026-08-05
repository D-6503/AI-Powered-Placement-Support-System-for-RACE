"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetRecommendations } from "@/lib/api";
import { toast } from "sonner";
import { 
  Sparkles, ArrowLeft, Loader2, Copy, Check,
  Mail, FileText, Send, MessageSquare, Printer, Settings, Award, HelpCircle
} from "lucide-react";

export default function GeneratorPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom or DB Job Toggle
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  
  // Custom Job input state
  const [customCompany, setCustomCompany] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customJd, setCustomJd] = useState("");

  // Options state
  const [docType, setDocType] = useState<string>("cover-letter");
  const [highlightProject, setHighlightProject] = useState("");
  const [tone, setTone] = useState("Professional");

  // Output states
  const [generatedText, setGeneratedText] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refinement states
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await apiGetRecommendations();
        setJobs(data);
        if (data.length > 0) {
          setSelectedJobId(String(data[0].job_id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const handleGenerate = async () => {
    // Validate custom job or selected job presence
    if (isCustomJob) {
      if (!customCompany.trim() || !customTitle.trim() || !customJd.trim()) {
        toast.error("Please fill in the custom Company, Role Title, and Job Description fields.");
        return;
      }
    } else {
      if (!selectedJobId) {
        toast.error("Please select a target job match.");
        return;
      }
    }

    setGenerating(true);
    setGeneratedText("");
    try {
      let response;
      if (isCustomJob) {
        // Hit custom document endpoint
        response = await fetch("http://127.0.0.1:8000/generation/custom-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            document_type: docType,
            company: customCompany.trim(),
            job_title: customTitle.trim(),
            job_description: customJd.trim(),
            highlight_project: highlightProject.trim() || null,
            tone: tone
          })
        });
      } else {
        // Fetch details from selected job in list to call custom generation with parameters
        const matchedJob = jobs.find(j => String(j.job_id) === selectedJobId);
        response = await fetch("http://127.0.0.1:8000/generation/custom-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            document_type: docType,
            company: matchedJob?.company || "Target Company",
            job_title: matchedJob?.title || "Target Role",
            job_description: matchedJob?.jd_text || "",
            highlight_project: highlightProject.trim() || null,
            tone: tone
          })
        });
      }

      if (!response.ok) throw new Error("Generation failed");
      const res = await response.json();
      
      // Simulate clean typing animation
      const text = res.content;
      let cur = "";
      let charIdx = 0;
      const interval = setInterval(() => {
        if (charIdx < text.length) {
          cur += text.slice(charIdx, charIdx + 4);
          setGeneratedText(cur);
          charIdx += 4;
        } else {
          setGeneratedText(text);
          clearInterval(interval);
        }
      }, 15);
      
    } catch {
      toast.error("Failed to generate custom placement assets.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInstruction.trim() || !generatedText) return;

    setRefining(true);
    const instruction = refineInstruction.trim();
    setRefineInstruction("");

    try {
      const response = await fetch("http://127.0.0.1:8000/generation/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          document_type: docType,
          current_content: generatedText,
          instruction: instruction
        })
      });
      if (!response.ok) throw new Error("Refinement failed");
      const data = await response.json();
      setGeneratedText(data.content);
      toast.success("AI Refinement applied successfully!");
    } catch {
      toast.error("Failed to refine document.");
    } finally {
      setRefining(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-doc-canvas")?.innerHTML;
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>REVA RACE Generated Asset</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; }
            h2 { border-bottom: 2px solid #F97316; padding-bottom: 10px; margin-bottom: 20px; font-size: 20px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>${docType.replace("-", " ").toUpperCase()}</h2>
          <pre>${generatedText}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Configuring Generator Suite...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-orange-100/60">
        <Link href="/student/dashboard" className="w-10 h-10 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 flex items-center justify-center text-dark-text shadow-sm transition-all cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Link>
        <div>
          <h1 className="text-2xl font-black font-serif tracking-tight text-slate-800">Placement Documents & Prep Suite</h1>
          <p className="text-xs text-secondary-text mt-0.5 font-bold">Generate resume-matched cover letters, cold outreach email templates, and interview prep QA sheets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Controls Panel */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 shadow-xs premium-shadow space-y-5">
            
            {/* Target Job Toggle Tabs */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Target Vacancy</label>
              <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-orange-100">
                <button
                  type="button"
                  onClick={() => setIsCustomJob(false)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isCustomJob ? "bg-primary text-white shadow-xs" : "text-secondary-text hover:text-dark-text"
                  }`}
                >
                  Matched Roles
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomJob(true)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCustomJob ? "bg-primary text-white shadow-xs" : "text-secondary-text hover:text-dark-text"
                  }`}
                >
                  Custom Target
                </button>
              </div>
            </div>

            {/* Target Select or Custom Fields */}
            {!isCustomJob ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Choose from Matches</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  {jobs.length === 0 ? (
                    <option value="">No pre-matched roles</option>
                  ) : (
                    jobs.map((job) => (
                      <option key={job.job_id} value={job.job_id}>
                        {job.title} at {job.company} ({Math.round(job.final_score)}% Fit)
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Company Name</label>
                  <input
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Role Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. AI Product Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Job Description (JD)</label>
                  <textarea
                    value={customJd}
                    onChange={(e) => setCustomJd(e.target.value)}
                    placeholder="Paste job description keywords, qualifications, and tasks here..."
                    className="w-full h-24 px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Document type selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Document Type</label>
              <div className="space-y-1">
                {[
                  { id: "cover-letter", label: "Tailored Cover Letter", icon: <FileText className="w-4 h-4" /> },
                  { id: "recruiter-email", label: "Recruiter Cold Email", icon: <Mail className="w-4 h-4" /> },
                  { id: "linkedin-message", label: "LinkedIn Connection Note", icon: <MessageSquare className="w-4 h-4" /> },
                  { id: "elevator-pitch", label: "Interview Elevator Pitch", icon: <Sparkles className="w-4 h-4 text-primary" /> },
                  { id: "qa-prep", label: "STAR Interview Q&A Sheet", icon: <Award className="w-4 h-4 text-primary" /> }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setDocType(type.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      docType === type.id
                        ? "bg-primary border-primary text-white shadow-sm premium-shadow"
                        : "bg-white border-orange-200 text-secondary-text hover:text-primary hover:bg-orange-50/20"
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Highlight input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Highlight Profile Project</label>
              <input
                type="text"
                value={highlightProject}
                onChange={(e) => setHighlightProject(e.target.value)}
                placeholder="e.g. Customer Churn Prediction Engine"
                className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Tone Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-secondary-text block">Document Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                <option value="Professional">Professional (Formal & Structured)</option>
                <option value="Enthusiastic">Enthusiastic (Energetic & Driven)</option>
                <option value="Confident">Confident (Bold & Direct)</option>
                <option value="Collaborative">Collaborative (Team-Oriented & Supportive)</option>
              </select>
            </div>

            {/* Run generation */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-primary hover:bg-primary/95 text-white font-black py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Assets
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Side: Document Preview Canvas & AI Refine Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 shadow-xs premium-shadow flex flex-col justify-between min-h-[550px]">
            
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Preview Controls Header */}
              <div className="flex justify-between items-center border-b border-orange-100/50 pb-4 flex-wrap gap-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Document Preview Canvas</h3>
                
                {generatedText && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-orange-50/50 border border-orange-200 text-secondary-text hover:text-primary font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all shadow-xs cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-success-color" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Text"}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-orange-50/50 border border-orange-200 text-secondary-text hover:text-primary font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Renders Document Canvas */}
              <div className="flex-1 py-4 flex flex-col">
                {generating && !generatedText ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-40 flex-1">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-bold text-secondary-text">Running S-BERT keywords and tailoring documents...</span>
                  </div>
                ) : generatedText ? (
                  <div id="printable-doc-canvas" className="w-full flex-1 p-6 bg-white border border-orange-100 rounded-2xl shadow-2xs overflow-y-auto max-h-[380px]">
                    <pre className="text-xs font-semibold leading-relaxed font-sans text-slate-700 whitespace-pre-wrap select-text">
                      {generatedText}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-secondary-text font-semibold py-40 text-xs flex-1 flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-primary/30" />
                    <span>Select target vacancy details, choose document formats, and click Generate to construct placement assets.</span>
                  </div>
                )}
              </div>

              {/* AI Prompt Refinement Box */}
              {generatedText && (
                <form onSubmit={handleRefine} className="flex gap-2 pt-3 border-t border-orange-100/60 mt-4 animate-in slide-in-from-bottom duration-200">
                  <input
                    type="text"
                    value={refineInstruction}
                    onChange={(e) => setRefineInstruction(e.target.value)}
                    placeholder="Ask AI to modify (e.g. 'make it shorter', 'highlight Python projects more')..."
                    className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 text-dark-text"
                    disabled={refining}
                  />
                  <button
                    type="submit"
                    disabled={!refineInstruction.trim() || refining}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white flex items-center justify-center rounded-xl shadow-sm transition-all cursor-pointer font-black text-xs disabled:opacity-40"
                  >
                    {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refine Document"}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
