"use client";

import { Bookmark, MapPin, Clock, AlertTriangle } from "lucide-react";

interface Job {
  job_id: number;
  title: string;
  company: string;
  location: string;
  experience_required: number;
  final_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

interface JobCardProps {
  job: Job;
  onSave?: (jobId: number) => void;
  onViewBreakdown?: (jobId: number) => void;
  className?: string;
}

export default function JobCard({
  job,
  onSave,
  onViewBreakdown,
  className = ""
}: JobCardProps) {
  return (
    <div className={`bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow premium-card-hover flex flex-col sm:flex-row justify-between gap-6 transition-all ${className}`}>
      <div className="space-y-4 flex-1">
        <div>
          <h3 className="text-lg font-black text-dark-text leading-tight">{job.title}</h3>
          <p className="text-xs font-bold text-primary mt-0.5">{job.company}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-secondary-text">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" /> {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" /> Exp: {job.experience_required} yrs
          </span>
        </div>

        {/* Skills Matched */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Matched Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {job.matched_skills.length === 0 ? (
              <span className="text-[10px] font-medium text-secondary-text/50">None</span>
            ) : (
              job.matched_skills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-md bg-orange-100/40 text-primary text-[10px] font-bold">
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Missing Skills */}
        {job.missing_skills.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-text flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-color" /> Missing Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.missing_skills.slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-md bg-red-50 text-error-color/85 text-[10px] font-bold">
                  {s}
                </span>
              ))}
              {job.missing_skills.length > 4 && (
                <span className="text-[10px] font-bold text-secondary-text pl-1">
                  +{job.missing_skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 sm:border-l border-orange-100/80 pt-4 sm:pt-0 sm:pl-6">
        <div className="text-right">
          <div className="text-3xl font-black text-primary">{Math.round(job.final_score)}%</div>
          <div className="text-[9px] font-bold text-secondary-text uppercase tracking-wider">Fit Score</div>
        </div>

        <div className="flex gap-2">
          {onSave && (
            <button
              onClick={() => onSave(job.job_id)}
              className="p-3 bg-white hover:bg-orange-50/50 border border-orange-200 rounded-xl text-secondary-text hover:text-primary transition-all shadow-sm cursor-pointer"
              title="Save Job"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}
          {onViewBreakdown && (
            <button
              onClick={() => onViewBreakdown(job.job_id)}
              className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-3 rounded-xl text-xs transition-all shadow-sm premium-shadow cursor-pointer"
            >
              View Breakdown
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
