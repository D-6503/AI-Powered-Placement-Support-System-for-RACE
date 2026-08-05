"use client";

import { ReactNode } from "react";
import { Bot, X, Sparkles } from "lucide-react";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  advice?: string;
  actions?: ReactNode;
  className?: string;
}

export default function AssistantPanel({
  open,
  onClose,
  title = "AI Placement Advisor",
  subtitle = "Real-Time Recommendations",
  advice = "We parsed your profile structure and identified key matches. Add Git & Version Control and Software Engineering accomplishments to increase your fit index for active job postings by 18%!",
  actions,
  className = ""
}: AssistantPanelProps) {
  if (!open) return null;

  return (
    <div className={`bg-card-cream border border-orange-100 rounded-3xl p-6 premium-shadow flex flex-col justify-between h-fit space-y-6 transition-all ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-dark-text">{title}</h3>
              <p className="text-[10px] font-bold text-secondary-text uppercase tracking-wider">{subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-orange-100/50 text-secondary-text hover:text-dark-text transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="bg-background-cream rounded-2xl p-4 text-xs font-semibold leading-relaxed border border-orange-100/30 text-secondary-text relative overflow-hidden">
          <Sparkles className="absolute right-2 bottom-2 w-4 h-4 text-primary/15" />
          {advice}
        </div>
      </div>

      {actions && (
        <div className="space-y-2 pt-2">
          {actions}
        </div>
      )}
    </div>
  );
}
