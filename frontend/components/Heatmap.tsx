"use client";

interface HeatmapData {
  programs: string[];
  heatmap: {
    skill: string;
    counts: number[];
  }[];
}

interface HeatmapProps {
  data: HeatmapData;
  className?: string;
}

export default function Heatmap({ data, className = "" }: HeatmapProps) {
  const getCellColor = (count: number) => {
    if (count === 0) return "bg-white text-secondary-text/30";
    if (count < 5) return "bg-orange-100 text-primary";
    if (count < 15) return "bg-orange-200 text-primary font-bold";
    if (count < 25) return "bg-orange-300 text-primary font-bold";
    return "bg-primary text-white font-extrabold";
  };

  return (
    <div className={`bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow space-y-6 overflow-x-auto ${className}`}>
      <div className="min-w-[600px] space-y-4">
        {/* Header row */}
        <div className="grid grid-cols-4 gap-4 items-center border-b border-orange-100 pb-3 text-center">
          <div className="text-left text-xs font-bold text-secondary-text uppercase">Skill Item</div>
          {data.programs.map((prog, idx) => (
            <div key={idx} className="text-xs font-black text-dark-text uppercase tracking-tight">
              {prog}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {data.heatmap.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 items-center text-center">
              <div className="text-left text-xs font-bold text-secondary-text pr-2">
                {row.skill}
              </div>
              {row.counts.map((count, cIdx) => (
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
  );
}
