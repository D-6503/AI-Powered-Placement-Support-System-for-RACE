"use client";

import { Calendar, Loader2 } from "lucide-react";

interface Application {
  id: number;
  job_title: string;
  company: string;
  status: string;
  fit_score: number;
  follow_up_date?: string;
}

interface ApplicationKanbanProps {
  applications: Application[];
  onStatusChange: (appId: number, nextStatus: string) => void;
  updatingId?: number | null;
  className?: string;
}

export default function ApplicationKanban({
  applications,
  onStatusChange,
  updatingId,
  className = ""
}: ApplicationKanbanProps) {
  const lanes = ["Saved", "Applied", "Shortlisted", "Interview", "Selected", "Rejected"];

  const getLaneColor = (lane: string) => {
    switch (lane) {
      case "Saved": return "bg-orange-100/40 text-primary border-orange-200/50";
      case "Applied": return "bg-blue-50 text-blue-600 border-blue-100";
      case "Shortlisted": return "bg-purple-50 text-purple-600 border-purple-100";
      case "Interview": return "bg-yellow-50 text-yellow-600 border-yellow-100";
      case "Selected": return "bg-green-50 text-success-color border-green-100";
      case "Rejected": return "bg-red-50 text-error-color border-red-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <div className={`grid md:grid-cols-3 xl:grid-cols-6 gap-6 overflow-x-auto pb-4 ${className}`}>
      {lanes.map((lane) => {
        const laneApps = applications.filter((app) => app.status === lane);

        return (
          <div
            key={lane}
            className="bg-card-cream border border-orange-100 rounded-2xl p-4 flex flex-col min-w-[200px] h-[550px] overflow-y-auto space-y-4"
          >
            {/* Lane Header */}
            <div className={`p-3 rounded-xl border font-bold text-xs flex justify-between items-center uppercase tracking-wider ${getLaneColor(lane)}`}>
              <span>{lane}</span>
              <span className="font-black">({laneApps.length})</span>
            </div>

            {/* Lane Cards */}
            <div className="flex-1 space-y-4">
              {laneApps.length === 0 ? (
                <div className="h-full border border-dashed border-orange-100/60 rounded-xl flex items-center justify-center text-[10px] text-secondary-text font-bold p-4 text-center">
                  No roles in this lane
                </div>
              ) : (
                laneApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white border border-orange-100/60 rounded-xl p-4 premium-shadow space-y-3.5 relative"
                  >
                    {updatingId === app.id && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-black text-dark-text leading-tight">{app.job_title}</h4>
                      <p className="text-[10px] font-bold text-secondary-text mt-0.5">{app.company}</p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                        Fit: {Math.round(app.fit_score)}%
                      </span>
                      {app.follow_up_date && (
                        <span className="text-secondary-text flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" /> {app.follow_up_date}
                        </span>
                      )}
                    </div>

                    {/* Move selector */}
                    <div className="space-y-1">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-secondary-text">Move to:</div>
                      <select
                        value={app.status}
                        onChange={(e) => onStatusChange(app.id, e.target.value)}
                        className="w-full bg-orange-50/30 border border-orange-200/50 rounded-lg p-1 text-[10px] font-bold cursor-pointer"
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
  );
}
