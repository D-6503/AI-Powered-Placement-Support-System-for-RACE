"use client";

import { ReactNode } from "react";
import { User, Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  user?: {
    full_name?: string;
    email?: string;
  };
  actions?: ReactNode;
}

export default function Topbar({
  title,
  subtitle,
  user,
  actions
}: TopbarProps) {
  return (
    <header className="h-20 border-b border-orange-100/80 bg-card-cream/80 backdrop-blur-md sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between gap-6">
      <div>
        <h2 className="text-xl font-black text-dark-text tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs font-semibold text-secondary-text mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        {/* Simple Notification bell */}
        <button className="p-2.5 rounded-xl bg-white border border-orange-200 hover:bg-orange-50/50 text-secondary-text hover:text-primary transition-all shadow-xs relative cursor-pointer">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* User Info Capsule */}
        <div className="flex items-center gap-3 bg-white border border-orange-200 rounded-xl px-4 py-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-dark-text leading-tight">
              {user?.full_name || "Guest Account"}
            </div>
            <div className="text-[9px] font-semibold text-secondary-text leading-none mt-0.5">
              {user?.email || "offline"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
