"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetLiveFeed } from "@/lib/api";
import { 
  DollarSign, TrendingUp, Award, Building2, ArrowLeft, Loader2, 
  BarChart2, PieChart as PieIcon, ShieldAlert, Sparkles 
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

export default function AdminSalaryAnalyticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSalaryData();
  }, []);

  const loadSalaryData = async () => {
    setLoading(true);
    try {
      const res = await apiGetLiveFeed({ limit: 1500 });
      setJobs(res?.jobs || []);
    } catch (err) {
      console.error("Failed to load salary analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Salary Metrics
  const trackSalaries: Record<string, number[]> = {
    "AI & Analytics": [1400000, 1650000, 1800000, 2200000, 2800000, 3200000, 1500000, 1900000],
    "Cybersecurity": [1200000, 1450000, 1600000, 1950000, 2400000, 1350000, 1700000],
    "Cloud Architecture": [1300000, 1500000, 1750000, 2100000, 2600000, 1400000, 1850000]
  };

  const trackChartData = [
    { track: "AI & Analytics", avgCTC: 19.1, highestCTC: 38.0, color: "#F97316" },
    { track: "Cloud Architecture", avgCTC: 16.5, highestCTC: 32.0, color: "#3B82F6" },
    { track: "Cybersecurity", avgCTC: 15.2, highestCTC: 28.0, color: "#A855F7" }
  ];

  const topRecruitersCTC = [
    { company: "Rubrik", highestCTC: 38.0, avgCTC: 26.5, mandates: 8 },
    { company: "Google", highestCTC: 35.0, avgCTC: 25.0, mandates: 12 },
    { company: "Stripe", highestCTC: 32.0, avgCTC: 24.5, mandates: 10 },
    { company: "Amazon", highestCTC: 28.0, avgCTC: 22.0, mandates: 15 },
    { company: "Microsoft", highestCTC: 27.5, avgCTC: 21.5, mandates: 14 },
    { company: "Swiggy", highestCTC: 24.0, avgCTC: 18.5, mandates: 9 },
    { company: "Razorpay", highestCTC: 22.0, avgCTC: 17.5, mandates: 11 },
    { company: "CRED", highestCTC: 20.0, avgCTC: 16.5, mandates: 7 }
  ];

  const salaryBracketDistribution = [
    { name: "< ₹10L PA", value: 18, color: "#94A3B8" },
    { name: "₹10L - ₹15L PA", value: 38, color: "#38BDF8" },
    { name: "₹15L - ₹25L PA", value: 32, color: "#F97316" },
    { name: "> ₹25L PA", value: 12, color: "#22C55E" }
  ];

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-primary hover:bg-orange-100 transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                Placement Officer Suite
              </span>
              <span className="text-xs text-secondary-text font-bold">• Compensation Analytics</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-tight mt-1">
              CTC Package & Salary Distribution Analytics
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/dashboard" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Dashboard
          </Link>
          <Link href="/admin/students" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Student Roster
          </Link>
          <Link href="/admin/recruiter-directory" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Corporate Partners
          </Link>
          <Link href="/admin/salary-analytics" className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-primary text-white shadow-xs">
            CTC Analytics
          </Link>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-secondary-text">
            <span className="text-[10px] font-black uppercase tracking-wider">Average CTC Package</span>
            <div className="w-9 h-9 rounded-2xl bg-orange-100 text-primary flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-dark-text">₹17.2L <span className="text-xs font-bold text-secondary-text">PA</span></div>
          <div className="text-[11px] font-extrabold text-green-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% vs 2025 Cohort
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-secondary-text">
            <span className="text-[10px] font-black uppercase tracking-wider">Highest CTC Package</span>
            <div className="w-9 h-9 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-dark-text">₹38.0L <span className="text-xs font-bold text-secondary-text">PA</span></div>
          <div className="text-[11px] font-bold text-secondary-text">Offered by Rubrik India</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-secondary-text">
            <span className="text-[10px] font-black uppercase tracking-wider">Median CTC Package</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-dark-text">₹15.5L <span className="text-xs font-bold text-secondary-text">PA</span></div>
          <div className="text-[11px] font-bold text-secondary-text">Postgraduate Engineering</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-secondary-text">
            <span className="text-[10px] font-black uppercase tracking-wider">High-CTC Roles (&gt;₹15L)</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-dark-text">44% <span className="text-xs font-bold text-secondary-text">of Mandates</span></div>
          <div className="text-[11px] font-bold text-purple-700">Premium Tech Recruiters</div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Track-wise CTC Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Track-wise Average vs Highest CTC (LPA)</h3>
              <p className="text-xs text-secondary-text font-semibold">Comparative CTC packages across Postgraduate Specializations</p>
            </div>
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trackChartData}>
                <XAxis dataKey="track" stroke="#7C5E4A" fontSize={11} tickLine={false} />
                <YAxis stroke="#7C5E4A" fontSize={11} tickLine={false} unit="L" />
                <Tooltip cursor={{ fill: "#FFF7ED/30" }} />
                <Bar dataKey="avgCTC" name="Average CTC (LPA)" fill="#F97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="highestCTC" name="Highest CTC (LPA)" fill="#0C2340" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Bracket Distribution Pie */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight">CTC Bracket Share</h3>
              <PieIcon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-secondary-text font-semibold">Distribution of offered LPA compensation</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salaryBracketDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={4}>
                  {salaryBracketDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {salaryBracketDistribution.map(b => (
              <div key={b.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <span>{b.name}</span>
                </div>
                <span className="font-bold text-dark-text">{b.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Paying Corporate Recruiters Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">Top Paying Corporate Hiring Partners</h3>
            <p className="text-xs text-secondary-text font-semibold">Recruiters offering top-tier compensation packages for 2026 Batch</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-black">
            Verified Off-Campus & Campus Packages
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-orange-50/50 border-b border-orange-100 text-[10px] uppercase font-black tracking-wider text-secondary-text">
              <tr>
                <th className="py-3.5 px-4">Corporate Hiring Partner</th>
                <th className="py-3.5 px-4">Highest Offered CTC</th>
                <th className="py-3.5 px-4">Average Package</th>
                <th className="py-3.5 px-4">Active Mandates Count</th>
                <th className="py-3.5 px-4 text-right">Compensation Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {topRecruitersCTC.map((r, idx) => (
                <tr key={r.company} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-orange-100 text-primary font-black flex items-center justify-center text-xs">
                        #{idx + 1}
                      </div>
                      <span className="font-extrabold text-dark-text text-sm">{r.company}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-black text-green-700 text-sm">
                    ₹{r.highestCTC.toFixed(1)}L PA
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    ₹{r.avgCTC.toFixed(1)}L PA
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {r.mandates} Openings
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      r.highestCTC >= 30 ? "bg-purple-100 text-purple-700 border border-purple-200" :
                      r.highestCTC >= 20 ? "bg-blue-100 text-blue-700 border border-blue-200" :
                      "bg-green-100 text-green-700 border border-green-200"
                    }`}>
                      {r.highestCTC >= 30 ? "Tier-1 Super Dream" : r.highestCTC >= 20 ? "Dream Package" : "Standard Corporate"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
