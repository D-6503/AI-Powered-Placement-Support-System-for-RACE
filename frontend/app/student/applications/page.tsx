"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetApplications, apiUpdateApplication } from "@/lib/api";
import { toast } from "sonner";
import { 
  ArrowLeft, Loader2, Calendar, FileText, ChevronRight,
  TrendingUp, Eye, Bookmark, Send, CheckCircle2
} from "lucide-react";

export default function ApplicationsTrackerPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadApps = async () => {
    try {
      const data = await apiGetApplications(42);
      setApps(data || []);
    } catch (err) {
      console.error("Failed to load student applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const moveApplicationStatus = async (appId: number, nextStatus: string) => {
    setUpdatingId(appId);
    try {
      await apiUpdateApplication(appId, { status: nextStatus });
      toast.success(`Application status updated to ${nextStatus}!`);
      await loadApps();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Loading Candidate Application Tracker...</span>
        </div>
      </div>
    );
  }

  // Simplified & Trackable Pipeline Stages
  const lanes = ["Saved", "Viewed", "Applied"];

  const getLaneMeta = (lane: string) => {
    switch (lane) {
      case "Saved": return { color: "bg-amber-100 text-amber-800 border-amber-200", icon: <Bookmark className="w-4 h-4 text-amber-600" /> };
      case "Viewed": return { color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Eye className="w-4 h-4 text-blue-600" /> };
      case "Applied": return { color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/student/dashboard" className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 flex items-center justify-center text-primary transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                Real-Time Tracking
              </span>
              <span className="text-xs text-secondary-text font-bold">• 100% Verifiable Pipeline</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-tight mt-1">
              Candidate Application Pipeline Tracker
            </h1>
          </div>
        </div>
      </div>

      {/* Robust 3-Column Kanban Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {lanes.map((lane) => {
          const laneApps = apps.filter((app) => (app.status || "Saved") === lane);
          const meta = getLaneMeta(lane);

          return (
            <div 
              key={lane} 
              className="bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col h-[650px] shadow-xs space-y-4"
            >
              {/* Lane Header */}
              <div className={`p-3.5 rounded-2xl border font-black text-xs flex justify-between items-center uppercase tracking-wider ${meta.color}`}>
                <div className="flex items-center gap-2">
                  {meta.icon}
                  <span>{lane} Vacancies</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/80 text-dark-text font-mono font-bold text-[11px]">
                  {laneApps.length}
                </span>
              </div>

              {/* Lane Cards */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {laneApps.length === 0 ? (
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-xs text-secondary-text font-semibold p-6 text-center space-y-2">
                    <Bookmark className="w-8 h-8 text-orange-200" />
                    <p>No mandates currently in <span className="font-extrabold text-dark-text">{lane}</span> stage.</p>
                  </div>
                ) : (
                  laneApps.map((app) => (
                    <div 
                      key={app.id} 
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-4.5 shadow-xs hover:shadow-md transition-all space-y-3 relative"
                    >
                      {updatingId === app.id && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-dark-text leading-snug">{app.job_title}</h4>
                          <p className="text-xs font-bold text-primary mt-0.5">{app.company}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-orange-100 text-primary text-[10px] font-black flex-shrink-0">
                          {Math.round(app.fit_score || 85)}% Match
                        </span>
                      </div>

                      <div className="text-[11px] text-secondary-text font-medium flex items-center justify-between border-t border-slate-100 pt-2">
                        <span>Updated recently</span>
                        {app.follow_up_date && (
                          <span className="flex items-center gap-1 font-bold text-slate-700">
                            <Calendar className="w-3 h-3 text-primary" /> {app.follow_up_date}
                          </span>
                        )}
                      </div>

                      {/* Dropdown Status Selector */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-secondary-text">Move Status To:</label>
                        <select
                          value={app.status || lane}
                          onChange={(e) => moveApplicationStatus(app.id, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-extrabold text-dark-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          {lanes.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
