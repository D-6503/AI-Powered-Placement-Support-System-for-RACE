"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
const Joyride = dynamic(() => import("react-joyride").then((mod: any) => mod.default || mod), { ssr: false }) as any;
import { apiSaveProfile, apiUploadResume } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Upload, FileText, CheckCircle2, ChevronRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  
  // Profile state
  const [program, setProgram] = useState("AI & Analytics");
  const [targetRole, setTargetRole] = useState("AI Engineer");
  const [expYears, setExpYears] = useState("2");
  const [prefLocation, setPrefLocation] = useState("Singapore");
  const [cohort, setCohort] = useState("Batch 2026");
  const [enrollmentId, setEnrollmentId] = useState("");
  
  // Interface state
  const [step, setStep] = useState(1); // 1 = Profile, 2 = Resume Upload
  const [loading, setLoading] = useState(false);
  const [runJoyride, setRunJoyride] = useState(false);
  
  // File state
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Joyride tour steps
  const tourSteps: any[] = [
    {
      target: "#step-profile",
      content: "First, set up your REVA program details, target job role, and years of experience.",
      disableBeacon: true
    },
    {
      target: "#step-upload",
      content: "Next, upload your PDF or DOCX resume. Our AI parser will extract your skills and audit its structure.",
      disableBeacon: true
    }
  ];

  useEffect(() => {
    // Start Joyride after page load
    setRunJoyride(true);
  }, []);

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !targetRole || !expYears) {
      toast.error("Please complete all profile fields.");
      return;
    }

    setLoading(true);
    try {
      await apiSaveProfile({
        program,
        target_role: targetRole,
        experience_years: parseFloat(expYears),
        preferred_locations: prefLocation,
        cohort,
        enrollment_id: enrollmentId ? enrollmentId : undefined
      });
      toast.success("Profile saved successfully!");
      setStep(2); // move to upload resume
    } catch (err: any) {
      toast.error("Failed to save profile. Proceeding anyway.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Dropzone file handling
  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploadingFile(true);
    try {
      const data = await apiUploadResume(file);
      setUploadedResume(data);
      toast.success(`Successfully parsed ${file.name}! Score: ${data.quality_score}/100`);
    } catch (err: any) {
      toast.error("Resume parsing failed. Try another clean PDF.");
    } finally {
      setUploadingFile(false);
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

  const handleFinishOnboarding = () => {
    if (!uploadedResume) {
      toast.warning("Please upload a resume first to run the placement engines.");
      return;
    }
    toast.success("Onboarding completed! Welcome to your dashboard.");
    router.push("/student/dashboard");
  };

  const rolesMap: Record<string, string[]> = {
    "AI & Analytics": ["Data Analyst", "Data Scientist", "AI Engineer", "ML Engineer", "GenAI Engineer", "Data Engineer", "BI Developer"],
    "Cybersecurity": ["Cybersecurity Analyst", "SOC Analyst", "Security Engineer", "Vulnerability Analyst", "IAM Analyst", "GRC Analyst"],
    "Cloud Architecture": ["Cloud Engineer", "DevOps Engineer", "AWS Cloud Engineer", "Azure Cloud Engineer", "Site Reliability Engineer", "Junior Solution Architect"]
  };

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 flex flex-col items-center justify-center">
      {/* Joyride Tour */}
      <Joyride
        steps={tourSteps}
        run={runJoyride}
        continuous
        showSkipButton
        styles={{
          options: {
            primaryColor: "#F97316",
            textColor: "#2B1B12",
            backgroundColor: "#FFFBF5"
          }
        }}
      />

      <div className="w-full max-w-2xl bg-card-cream border border-orange-100/80 rounded-3xl p-8 premium-shadow space-y-8">
        <div className="flex justify-between items-center border-b border-orange-100 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Onboarding Guide</h1>
            <p className="text-xs font-semibold text-secondary-text mt-1">Let's align your profile with current market demand</p>
          </div>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
            Step {step} of 2
          </span>
        </div>

        {step === 1 && (
          <form id="step-profile" onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">REVA Program</label>
                <select
                  value={program}
                  onChange={(e) => {
                    setProgram(e.target.value);
                    setTargetRole(rolesMap[e.target.value][0]);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                >
                  <option value="AI & Analytics">AI & Analytics Postgraduate</option>
                  <option value="Cybersecurity">Cybersecurity Postgraduate</option>
                  <option value="Cloud Architecture">Cloud Architecture Postgraduate</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Target Job Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                >
                  {rolesMap[program].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Years of Experience</label>
                <input
                  type="number"
                  step="0.5"
                  value={expYears}
                  onChange={(e) => setExpYears(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Preferred Location</label>
                <input
                  type="text"
                  value={prefLocation}
                  onChange={(e) => setPrefLocation(e.target.value)}
                  placeholder="e.g. Singapore"
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Cohort Batch</label>
                <input
                  type="text"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  placeholder="e.g. Batch 2026"
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-secondary-text">Enrollment ID (Optional)</label>
                <input
                  type="text"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  placeholder="e.g. REVA-AI-2026-042"
                  className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Save & Continue <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div
              id="step-upload"
              {...getRootProps()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-orange-200 hover:border-primary/80 hover:bg-orange-50/20"
              }`}
            >
              <input {...getInputProps()} />
              {uploadingFile ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-bold text-secondary-text">Analyzing resume structure & extracting skills...</p>
                </div>
              ) : uploadedResume ? (
                <div className="space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                  <p className="text-sm font-bold text-dark-text">Resume Successfully Loaded!</p>
                  <p className="text-xs text-secondary-text">Audit Score: {uploadedResume.quality_score}/100</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-secondary-text mx-auto" />
                  <p className="text-sm font-bold text-dark-text">Drag & drop your resume file here</p>
                  <p className="text-xs text-secondary-text">Supports PDF and DOCX formats (Max 5MB)</p>
                </div>
              )}
            </div>

            {uploadedResume && (
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-text flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> AI Parser Insights
                </h3>
                <p className="text-sm font-semibold">
                  We parsed {uploadedResume.quality_score >= 70 ? "a strong" : "a basic"} profile layout.
                  Proceed to your dashboard to view recommendations and detailed roadmaps.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-white hover:bg-orange-50/50 text-dark-text border border-orange-200 font-bold py-3.5 rounded-xl transition-all text-sm cursor-pointer"
              >
                Back to Profile
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={!uploadedResume}
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
