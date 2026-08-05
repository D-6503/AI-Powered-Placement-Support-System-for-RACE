"use client";

import { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendDirection?: "up" | "down";
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendDirection = "up",
  className = ""
}: StatCardProps) {
  return (
    <div className={`p-6 bg-card-cream border border-orange-100 rounded-3xl premium-shadow flex items-center justify-between gap-4 transition-all hover:translate-y-[-2px] ${className}`}>
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-secondary-text">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-dark-text">{value}</span>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${
              trendDirection === "up" ? "text-success-color" : "text-error-color"
            }`}>
              {trendDirection === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {trend}
            </span>
          )}
        </div>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
    </div>
  );
}
