"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetAdminStudents, apiGetLiveFeed, apiNominateStudent } from "@/lib/api";
import { toast } from "sonner";
import { 
  Users, Search, Filter, GraduationCap, Mail, Phone, Award, Briefcase, 
  ChevronRight, ArrowLeft, Loader2, UserCheck, Shield, ExternalLink, UserPlus
} from "lucide-react";
import RevaLogo from "@/components/RevaLogo";
import confetti from "canvas-confetti";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("All");

  // Nominate modal state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [nominateNotes, setNominateNotes] = useState("");
  const [nominating, setNominating] = useState(false);

  useEffect(() => {
    loadStudents();
    loadJobs();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await apiGetAdminStudents();
      setStudents(data || []);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await apiGetLiveFeed({ limit: 100 });
      setJobs(data?.jobs || []);
    } catch (err) {
      console.error("Failed to load active jobs for nomination:", err);
    }
  };

  const filteredStudents = students.filter(std => {
    const matchesSearch = 
      std.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      std.email?.toLowerCase().includes(search.toLowerCase()) ||
      std.srn?.toLowerCase().includes(search.toLowerCase());
    
    const matchesProgram = programFilter === "All" || std.program === programFilter;
    return matchesSearch && matchesProgram;
  });

  const handleNominateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedJobId) {
      toast.error("Please select a job mandate to nominate this student.");
      return;
    }

    setNominating(true);
    try {
      await apiNominateStudent(selectedStudent.id, selectedJobId, nominateNotes);
      toast.success(`Successfully nominated ${selectedStudent.full_name} for the selected vacancy!`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setSelectedStudent(null);
      setSelectedJobId(null);
      setNominateNotes("");
      loadStudents();
    } catch {
      toast.error("Failed to submit nomination.");
    } finally {
      setNominating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-cream text-dark-text p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Header Navigation */}
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
              <span className="text-xs text-secondary-text font-bold">• Student Roster</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-tight mt-1">
              Cohort Candidates & Student Directory
            </h1>
          </div>
        </div>

        {/* Quick Admin Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/dashboard" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Dashboard
          </Link>
          <Link href="/admin/students" className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-primary text-white shadow-xs">
            Student Roster
          </Link>
          <Link href="/admin/recruiter-directory" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            Corporate Partners
          </Link>
          <Link href="/admin/salary-analytics" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
            CTC Analytics
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-text" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email, SRN..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-bold text-secondary-text">Program:</span>
            {["All", "AI & Analytics", "Cybersecurity", "Cloud Architecture"].map(p => (
              <button
                key={p}
                onClick={() => setProgramFilter(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  programFilter === p
                    ? "bg-[#0C2340] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs font-bold text-secondary-text">Loading student cohort directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-orange-200 mx-auto" />
            <p className="text-sm font-bold text-dark-text">No student records match the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-orange-50/50 border-b border-orange-100 text-[10px] uppercase font-black tracking-wider text-secondary-text">
                <tr>
                  <th className="py-4 px-6">Student Candidate</th>
                  <th className="py-4 px-4">SRN / Cohort</th>
                  <th className="py-4 px-4">Specialization Track</th>
                  <th className="py-4 px-4">Readiness Score</th>
                  <th className="py-4 px-4">Apps / Interviews</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredStudents.map((std) => {
                  const score = std.readiness_score || 82.5;
                  const scoreColor = 
                    score >= 80 ? "bg-green-100 text-green-700 border-green-200" :
                    score >= 65 ? "bg-orange-100 text-orange-700 border-orange-200" :
                    "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={std.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                            {std.full_name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <div className="font-extrabold text-dark-text text-sm">{std.full_name}</div>
                            <div className="text-[11px] text-secondary-text flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{std.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-slate-800">{std.srn || `R24AI${std.id}`}</div>
                        <div className="text-[10px] text-secondary-text font-semibold">{std.cohort || "Batch 2026"}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-orange-100/70 text-primary text-[10px] font-black uppercase">
                          {std.program || "AI & Analytics"}
                        </span>
                        <div className="text-[10px] text-secondary-text mt-1 truncate max-w-[140px]">
                          {std.course || "M.Tech"}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${scoreColor}`}>
                          {score.toFixed(1)}% Match
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                            {std.applications_count || 0} Apps
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                            {std.interviews_count || 0} Calls
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedStudent(std)}
                          className="bg-primary hover:bg-primary/95 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Nominate Student
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nominate Student Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-dark-text">Nominate Candidate</h3>
                <p className="text-xs text-secondary-text font-semibold">Nominate {selectedStudent.full_name} ({selectedStudent.srn}) for an active vacancy</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-dark-text p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleNominateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Select Corporate Job Mandate</label>
                <select
                  value={selectedJobId || ""}
                  onChange={(e) => setSelectedJobId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:outline-none text-xs font-semibold bg-white"
                  required
                >
                  <option value="">-- Choose Corporate Vacancy --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} @ {j.company} ({j.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-wider">Placement Officer Recommendation Notes</label>
                <textarea
                  value={nominateNotes}
                  onChange={(e) => setNominateNotes(e.target.value)}
                  placeholder="e.g. Recommended by Placement Cell. Highly proficient in Python, SQL and MLOps."
                  rows={3}
                  className="w-full p-3 rounded-2xl border border-orange-200 focus:outline-none text-xs font-semibold bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nominating}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {nominating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Nomination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
