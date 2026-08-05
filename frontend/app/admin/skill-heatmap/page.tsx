"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetAdminSkillHeatmap } from "@/lib/api";
import { 
  ArrowLeft, Grid, HelpCircle, Layers, 
  BookOpen, Info, AlertTriangle
} from "lucide-react";

export default function SkillHeatmapPage() {
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHeatmap = async () => {
      try {
        const data = await apiGetAdminSkillHeatmap();
        setHeatmapData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadHeatmap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm font-bold text-secondary-text">Compiling Skill Matrix...</span>
        </div>
      </div>
    );
  }

  // Helper to calculate cell color density
  const getCellColor = (count: number) => {
    if (count === 0) return "bg-white text-secondary-text/30";
    if (count < 5) return "bg-orange-100 text-primary";
    if (count < 15) return "bg-orange-200 text-primary-orange font-bold";
    if (count < 25) return "bg-orange-300 text-primary font-bold";
    return "bg-primary text-white font-extrabold";
  };

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard" className="w-10 h-10 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 flex items-center justify-center text-dark-text shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Missing Skill Heatmap</h1>
          <p className="text-xs font-semibold text-secondary-text mt-1">Cross-cohort analysis of critical missing skills to guide curriculum refinements</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Heatmap Grid (Takes 3 Columns) */}
        <div className="lg:col-span-3 bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-6 overflow-x-auto">
          <h3 className="text-sm font-black uppercase tracking-wider text-secondary-text flex items-center gap-2">
            <Grid className="w-4 h-4 text-primary" /> Cohort Missing Skills Matrix
          </h3>

          <div className="min-w-[600px] space-y-4">
            {/* Header row: Programs */}
            <div className="grid grid-cols-4 gap-4 items-center border-b border-orange-100 pb-3 text-center">
              <div className="text-left text-xs font-bold text-secondary-text uppercase">Skill Item</div>
              {heatmapData.programs.map((prog: string, idx: number) => (
                <div key={idx} className="text-xs font-black text-dark-text uppercase tracking-tight">
                  {prog}
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="space-y-3">
              {heatmapData.heatmap.map((row: any, idx: number) => (
                <div key={idx} className="grid grid-cols-4 gap-4 items-center text-center">
                  <div className="text-left text-xs font-bold text-secondary-text pr-2">
                    {row.skill}
                  </div>
                  {row.counts.map((count: number, cIdx: number) => (
                    <div 
                      key={cIdx} 
                      className={`py-3.5 rounded-xl border border-orange-100/30 text-xs transition-all flex items-center justify-center ${getCellColor(count)}`}
                    >
                      {count} Students
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend & Advice panel */}
        <div className="space-y-6 lg:col-span-1">
          {/* Color Code Legend */}
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" /> Density Legend
            </h3>
            
            <div className="space-y-2">
              {[
                { label: "0 Students missing", color: "bg-white border border-orange-100" },
                { label: "1-4 Students missing", color: "bg-orange-100" },
                { label: "5-14 Students missing", color: "bg-orange-200" },
                { label: "15-24 Students missing", color: "bg-orange-300" },
                { label: "25+ Students missing", color: "bg-primary text-white" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-semibold">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum suggestion */}
          <div className="bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-primary" /> Director Action Insights
            </h3>
            <p className="text-xs font-semibold text-secondary-text leading-relaxed">
              We recommend scheduling additional hands-on bootcamps or workshop assignments for cells in the <span className="text-primary font-bold">Deep Orange</span> region (e.g. Git & Version Control or Kubernetes) to immediately elevate batch placement statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
