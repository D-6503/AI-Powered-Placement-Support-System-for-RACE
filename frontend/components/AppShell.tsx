"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageTransition from "./PageTransition";
import { apiGetMe } from "@/lib/api";

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  role: "student" | "admin";
  actions?: ReactNode;
}

export default function AppShell({
  children,
  title,
  subtitle,
  role,
  actions
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication token
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadMe = async () => {
      try {
        const data = await apiGetMe();
        setUser(data);
      } catch {
        // Fallback user if API offline
        setUser({
          full_name: role === "admin" ? "Dr. Alex Tan" : "Sarah Lim",
          email: role === "admin" ? "admin@reva.edu.in" : "sarah@reva.edu.in"
        });
      }
    };
    loadMe();
  }, [router, role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-background-cream text-dark-text overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        role={role}
        activePath={pathname}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Topbar
          title={title}
          subtitle={subtitle}
          user={user}
          actions={actions}
        />

        {/* Content Wrapper */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto pb-20">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
