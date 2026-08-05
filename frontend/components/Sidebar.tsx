"use client";

import Link from "next/link";
import { 
  LayoutDashboard, FileText, Briefcase, TrendingUp, Sparkles, 
  CheckCircle2, Grid, LogOut, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import RevaLogo from "./RevaLogo";

interface SidebarProps {
  role: "student" | "admin";
  activePath: string;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  role,
  activePath,
  isOpen,
  onToggle,
  onLogout
}: SidebarProps) {
  const studentNav = [
    { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/student/dashboard" },
    { label: "Resume Audit", icon: <FileText className="w-5 h-5" />, path: "/student/resume" },
    { label: "Job Matches", icon: <Briefcase className="w-5 h-5" />, path: "/student/job-matches" },
    { label: "Skill Roadmaps", icon: <TrendingUp className="w-5 h-5" />, path: "/student/learning-path" },
    { label: "AI Generator", icon: <Sparkles className="w-5 h-5" />, path: "/student/generator" },
    { label: "Application Tracker", icon: <CheckCircle2 className="w-5 h-5" />, path: "/student/applications" }
  ];

  const adminNav = [
    { label: "Overview", icon: <LayoutDashboard className="w-5 h-5" />, path: "/admin/dashboard" },
    { label: "Missing Heatmaps", icon: <Grid className="w-5 h-5" />, path: "/admin/skill-heatmap" },
    { label: "Model Analytics", icon: <TrendingUp className="w-5 h-5" />, path: "/admin/analytics" }
  ];

  const navigation = role === "admin" ? adminNav : studentNav;

  return (
    <aside className={`bg-card-cream border-r border-orange-100 flex flex-col justify-between transition-all duration-300 ${
      isOpen ? "w-64" : "w-20"
    } flex-shrink-0 h-screen sticky top-0 z-40`}>
      <div className="p-6">
        <div className="mb-10">
          <RevaLogo showText={isOpen} large={true} />
        </div>

        <nav className="space-y-2">
          {navigation.map((item, idx) => {
            const isActive = activePath === item.path;

            return (
              <Link
                key={idx}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? "bg-primary text-white shadow-sm premium-shadow" 
                    : "text-secondary-text hover:text-primary hover:bg-orange-50/50"
                }`}
              >
                {item.icon}
                {isOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 space-y-4">
        <button
          onClick={onToggle}
          className="hidden md:flex w-full items-center justify-center p-2.5 rounded-xl bg-orange-100/40 text-secondary-text hover:text-primary transition-colors cursor-pointer"
        >
          {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-error-color hover:bg-red-50/50 w-full transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
