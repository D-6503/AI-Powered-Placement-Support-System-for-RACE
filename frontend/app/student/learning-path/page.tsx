"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetMe } from "@/lib/api";
import { toast } from "sonner";
import { 
  TrendingUp, ArrowLeft, CheckCircle2, 
  BookOpen, Clock, Award, ChevronRight, HelpCircle, 
  Lock, BookOpenCheck, ExternalLink, GraduationCap, Check
} from "lucide-react";
import confetti from "canvas-confetti";

const CURRICULUM_DATA: Record<string, any> = {
  "AI & Analytics": {
    program: "AI & Analytics",
    title: "Postgraduate Curriculum in Artificial Intelligence & Machine Learning",
    modules: [
      {
        id: 1,
        title: "Module 1: Mathematical Foundations & Python Programming",
        desc: "Master Python fundamentals, NumPy, Pandas, SQL data manipulation, and descriptive statistics for analytics systems.",
        skills: ["Python", "SQL", "Pandas", "NumPy", "Descriptive Statistics"],
        duration: "4 Weeks",
        resources: ["Python for Data Analysis Book", "Kaggle SQL course", "REVA Lecture Slides Module 1"]
      },
      {
        id: 2,
        title: "Module 2: Machine Learning & Feature Engineering",
        desc: "Supervised and unsupervised learning models, regression, classification trees, hyperparameter tuning, and dimensionality reduction.",
        skills: ["Scikit-Learn", "Regression", "Random Forest", "XGBoost", "Feature Engineering"],
        duration: "6 Weeks",
        resources: ["Hands-On ML with Scikit-Learn", "StatQuest ML Series", "REVA ML Lab Manual"]
      },
      {
        id: 3,
        title: "Module 3: Deep Learning & Natural Language Processing",
        desc: "Neural network structures, convolutional neural networks (CNNs), recurrent neural networks (RNNs), and S-BERT NLP models.",
        skills: ["PyTorch", "TensorFlow", "NLP", "Neural Networks", "S-BERT"],
        duration: "6 Weeks",
        resources: ["Fast.ai Deep Learning Course", "HuggingFace NLP Tutorials", "REVA Deep Learning Lab"]
      },
      {
        id: 4,
        title: "Module 4: Generative AI & Large Language Models",
        desc: "Transformer architectures, prompt engineering, fine-tuning pre-trained LLMs, and building RAG (Retrieval-Augmented Generation) systems.",
        skills: ["GenAI", "Transformers", "Prompt Engineering", "LangChain", "Vector Databases"],
        duration: "4 Weeks",
        resources: ["DeepLearning.AI Prompt Engineering", "LangChain Official Docs", "RAG Implementation Guide"]
      },
      {
        id: 5,
        title: "Module 5: Capstone Placement Project",
        desc: "Design, build, and deploy an end-to-end AI/ML application. Optimize and audit with ATS placement standards.",
        skills: ["System Design", "Model Deployment", "Git & Version Control", "ATS Optimization"],
        duration: "4 Weeks",
        resources: ["MLOps Zoomcamp", "REVA RACE Capstone Handbook"]
      }
    ]
  },
  "Cybersecurity": {
    program: "Cybersecurity",
    title: "Postgraduate Curriculum in Cybersecurity & Threat Management",
    modules: [
      {
        id: 1,
        title: "Module 1: Networking & Linux Administration",
        desc: "Learn networking protocols (TCP/IP, DNS, HTTP), firewalls, routing, and command-line Linux systems administration.",
        skills: ["Linux", "Networking Protocols", "Bash Scripting", "Firewall Auditing"],
        duration: "4 Weeks",
        resources: ["Linux Bible", "CompTIA Network+ Guide", "REVA Networking Lab Sheets"]
      },
      {
        id: 2,
        title: "Module 2: Cryptography & Access Control",
        desc: "Symmetric and asymmetric encryption algorithms, hashing, digital signatures, and Identity and Access Management (IAM).",
        skills: ["Cryptography", "PKI", "IAM", "OAuth", "Multi-Factor Auth"],
        duration: "4 Weeks",
        resources: ["Applied Cryptography", "IAM Best Practices Guide", "REVA Crypto Sandbox"]
      },
      {
        id: 3,
        title: "Module 3: Security Operations Center & SIEM",
        desc: "Monitoring security events, analyzing firewall logs, threat hunting, and managing SIEM systems like Splunk.",
        skills: ["SIEM", "Splunk", "SOC Operations", "Log Analysis", "Threat Hunting"],
        duration: "6 Weeks",
        resources: ["Splunk Fundamentals Course", "SOC Analyst Handbook", "REVA Mock SOC Alerts"]
      },
      {
        id: 4,
        title: "Module 4: Penetration Testing & Vulnerability Assessment",
        desc: "Perform network vulnerability scanning, explore OWASP Top 10 web vulnerabilities, and conduct legal ethical hacking.",
        skills: ["Penetration Testing", "Vulnerability Scanning", "OWASP Top 10", "Metasploit", "Nmap"],
        duration: "6 Weeks",
        resources: ["PortSwigger Web Security Academy", "OSCP Prep Guide", "REVA Hack-the-Box Setup"]
      },
      {
        id: 5,
        title: "Module 5: Incident Response & Compliance Audit",
        desc: "Drafting containment plans, evidence collection, digital forensics, and preparing audit documents for ISO 27001 / GDPR compliance.",
        skills: ["Incident Response", "Digital Forensics", "ISO 27001", "Compliance Audit", "Risk Assessment"],
        duration: "6 Weeks",
        resources: ["NIST Incident Handling Guide", "ISO 27001 Toolkit", "REVA Capstone Project Guide"]
      }
    ]
  },
  "Cloud Architecture": {
    program: "Cloud Architecture",
    title: "Postgraduate Curriculum in Cloud Architecture & DevOps Operations",
    modules: [
      {
        id: 1,
        title: "Module 1: Cloud Infrastructure Foundations",
        desc: "Understand foundational cloud concepts on AWS/Azure, virtual private networks (VPCs), storage, security groups, and virtual instances.",
        skills: ["AWS", "Azure", "Linux", "VPC Networking", "IAM Policies"],
        duration: "4 Weeks",
        resources: ["AWS Certified Solutions Architect Course", "Linux Shell Scripting Bible"]
      },
      {
        id: 2,
        title: "Module 2: Containerization & Orchestration",
        desc: "Package applications in Docker containers and orchestrate them at scale using Kubernetes clusters, pods, and services.",
        skills: ["Docker", "Kubernetes", "Container Security", "Microservices Architecture"],
        duration: "6 Weeks",
        resources: ["Kubernetes Up & Running", "Docker Deep Dive", "REVA Kubernetes Lab Guides"]
      },
      {
        id: 3,
        title: "Module 3: Infrastructure as Code (IaC)",
        desc: "Automate server configuration and cloud provisioning using Terraform declarations and Ansible playbooks.",
        skills: ["Terraform", "Ansible", "Declarative Configuration", "Cloud Provisioning"],
        duration: "6 Weeks",
        resources: ["Terraform Up & Running", "Ansible for DevOps", "REVA Cloud Automation Lab"]
      },
      {
        id: 4,
        title: "Module 4: Continuous Delivery Pipelines (CI/CD)",
        desc: "Design automated build, test, and deploy software delivery pipelines using GitHub Actions, GitLab CI, or Jenkins.",
        skills: ["CI/CD", "GitHub Actions", "Jenkins", "Git & Version Control"],
        duration: "4 Weeks",
        resources: ["Continuous Delivery Book", "GitHub Actions Learning Path", "REVA CI/CD Lab Manual"]
      },
      {
        id: 5,
        title: "Module 5: SRE & Cloud Operations Capstone",
        desc: "Implement application monitoring (Prometheus/Grafana), configure autoscaling groups, manage incident alerts, and run the DevOps capstone project.",
        skills: ["SRE", "Prometheus", "Grafana", "Autoscaling", "Cloud Security"],
        duration: "6 Weeks",
        resources: ["Google SRE Book", "Prometheus Setup Guide", "REVA DevOps Capstone Handbook"]
      }
    ]
  }
};

export default function LearningPathPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedModules, setCompletedModules] = useState<number[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const me = await apiGetMe();
        setUser(me);
        
        // Load completed modules from localStorage unique to user
        const stored = localStorage.getItem(`reva_completed_modules_${me.id}`);
        if (stored) {
          setCompletedModules(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load user info", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Safe fallback if track is missing or matching admin
  const userTrack = user?.program || "AI & Analytics";
  const curriculum = CURRICULUM_DATA[userTrack] || CURRICULUM_DATA["AI & Analytics"];

  const handleToggleModule = (moduleId: number) => {
    let updated;
    if (completedModules.includes(moduleId)) {
      updated = completedModules.filter(id => id !== moduleId);
      toast.success("Module marked incomplete.");
    } else {
      updated = [...completedModules, moduleId];
      toast.success("Module marked completed!");
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
    setCompletedModules(updated);
    localStorage.setItem(`reva_completed_modules_${user?.id || 1}`, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Compiling REVA RACE Curriculum...</span>
        </div>
      </div>
    );
  }

  const completionPercent = Math.round((completedModules.length / curriculum.modules.length) * 100);

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-orange-100/60">
        <Link href="/student/dashboard" className="w-10 h-10 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 flex items-center justify-center text-dark-text shadow-sm transition-all cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Link>
        <div>
          <h1 className="text-2xl font-black font-serif tracking-tight text-slate-800">REVA RACE Curriculum Roadmap</h1>
          <p className="text-xs text-secondary-text mt-0.5 font-bold">Track your postgraduate curriculum syllabus and verify placements readiness.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left column: Overview stats and progress */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-5 shadow-xs premium-shadow text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-dark-text">{userTrack} Track</h3>
              <p className="text-[10px] text-secondary-text font-bold mt-0.5">{user?.course || "Postgraduate Candidate"}</p>
            </div>

            <div className="border-t border-orange-100/60 pt-4 space-y-3">
              <div className="relative w-24 h-24 flex items-center justify-center mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#FFF7ED" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F97316"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * completionPercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-black">{completionPercent}%</span>
                  <span className="text-[8px] font-black text-secondary-text uppercase">Progress</span>
                </div>
              </div>
              <div className="text-[11px] font-bold text-secondary-text">
                {completedModules.length} of {curriculum.modules.length} Modules Audited
              </div>
            </div>
          </div>

          <div className="bg-card-cream border border-orange-100 rounded-3xl p-5 shadow-xs space-y-3 text-xs font-semibold text-secondary-text">
            <h4 className="text-[9px] font-black uppercase text-dark-text tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-primary" /> Placement Milestones
            </h4>
            <p className="leading-relaxed">
              Completing modules certifies your conceptual skills, increasing your S-BERT match accuracy for Bangalore vacancy requirements.
            </p>
          </div>
        </div>

        {/* Right column: Interactive Visual timeline modules */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-orange-100/50 shadow-2xs">
            <h2 className="text-base font-black text-dark-text">{curriculum.title}</h2>
            <p className="text-xs text-secondary-text mt-1 font-bold">Curriculum modules matching the official REVA RACE academic brochure.</p>
          </div>

          {/* Timeline Nodes */}
          <div className="relative pl-8 border-l-2 border-orange-200/50 ml-4 space-y-8 pt-2 pb-2">
            {curriculum.modules.map((mod: any, idx: number) => {
              const isCompleted = completedModules.includes(mod.id);
              return (
                <div key={mod.id} className="relative group">
                  {/* Node dot */}
                  <button
                    onClick={() => handleToggleModule(mod.id)}
                    className={`absolute -left-[45px] top-1.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer shadow-xs ${
                      isCompleted 
                        ? "bg-green-500 border-green-500 text-white" 
                        : "bg-white border-orange-200 text-secondary-text hover:border-primary"
                    }`}
                    title={isCompleted ? "Mark Incomplete" : "Mark Completed"}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-extrabold text-slate-700">{mod.id}</span>
                    )}
                  </button>

                  {/* Module Card */}
                  <div className={`bg-card-cream border border-orange-100 rounded-2xl p-5 shadow-xs transition-all ${
                    isCompleted ? "bg-green-50/10 border-green-100" : ""
                  }`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-orange-100/60 pb-3 mb-3">
                      <div>
                        <h3 className={`text-sm font-black ${isCompleted ? "text-slate-500 line-through" : "text-dark-text"}`}>
                          {mod.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] text-secondary-text font-bold mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Estimated: {mod.duration}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleModule(mod.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          isCompleted 
                            ? "bg-green-100 text-green-600" 
                            : "bg-primary text-white hover:bg-primary/95 shadow-xs"
                        }`}
                      >
                        {isCompleted ? "Completed" : "Mark Completed"}
                      </button>
                    </div>

                    <p className="text-xs text-secondary-text leading-relaxed font-semibold mb-4">
                      {mod.desc}
                    </p>

                    {/* Skill tags */}
                    <div className="space-y-3 pt-3 border-t border-orange-100/40">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-dark-text uppercase tracking-wider block">Target Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.skills.map((s: string) => (
                            <span key={s} className="px-2.5 py-0.5 rounded-md bg-white border border-orange-100 text-[10px] font-bold text-slate-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-dark-text uppercase tracking-wider block">Study Resources</span>
                        <div className="space-y-1">
                          {mod.resources.map((res: string, rIdx: number) => (
                            <div key={rIdx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                              <BookOpenCheck className="w-3.5 h-3.5 text-primary" />
                              <span>{res}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
