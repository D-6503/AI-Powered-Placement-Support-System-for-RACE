"use client";

import React from "react";
import { GraduationCap, Mail } from "lucide-react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-cream text-dark-text flex flex-col font-sans selection:bg-primary/20">
      {/* 🏛️ Internal Student Services Top Bar */}
      <div className="bg-[#0C2340] text-white text-[11px] font-bold px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center border-b border-orange-500/20 gap-2 z-50">
        <div className="flex items-center gap-4 flex-wrap">
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
      
      {/* Page Content Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
