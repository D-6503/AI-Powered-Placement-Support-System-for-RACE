"use client";

interface SkillGapCardProps {
  skill: string;
  demandWeight: number;
  priority: "High" | "Medium" | "Low";
  className?: string;
}

export default function SkillGapCard({
  skill,
  demandWeight,
  priority,
  className = ""
}: SkillGapCardProps) {
  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "High": return "bg-red-50 text-error-color border-red-100";
      case "Medium": return "bg-amber-50 text-warning-color border-amber-100";
      default: return "bg-green-50 text-success-color border-green-100";
    }
  };

  return (
    <div className={`p-4 bg-background-cream border border-orange-100/50 rounded-2xl flex items-center justify-between transition-all hover:border-orange-200 ${className}`}>
      <div className="space-y-1">
        <div className="font-bold text-sm text-dark-text">{skill}</div>
        <div className="text-[10px] text-secondary-text font-bold">
          Demand Weight: {Math.round(demandWeight * 100)}%
        </div>
      </div>
      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${getPriorityStyle(priority)}`}>
        {priority}
      </span>
    </div>
  );
}
