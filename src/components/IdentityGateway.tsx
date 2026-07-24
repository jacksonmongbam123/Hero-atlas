import React, { useState } from "react";
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Lock, 
  Key, 
  ArrowRight, 
  Moon, 
  Sun,
  Loader2 
} from "lucide-react";
import { motion } from "motion/react";

interface IdentityGatewayProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSuccess: (role: string, name: string, token: string, user: any) => void;
}

export default function IdentityGateway({ theme, onToggleTheme, onSuccess }: IdentityGatewayProps) {
  const isMobileApp = typeof window !== "undefined" && window.location.search.includes("platform=mobile");
  const [activeRole, setActiveRole] = useState<"teacher" | "student" | "parent">("teacher");
  const [portalId, setPortalId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (role: "teacher" | "student" | "parent") => {
    setActiveRole(role);
    setErrorMsg(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("https://abms-lkw9.onrender.com/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: portalId,
          password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data.message || `Authorization failed with status ${response.status}.`;
        setErrorMsg(msg);
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        setErrorMsg("Failed to retrieve valid user data from cloud backend.");
        setIsSubmitting(false);
        return;
      }

      const returnedRole = data.user.user_type || data.user.role || "";

      // Strict check: parents can only login parents, students only students, teachers/admins only teachers
      if (activeRole === "teacher" && returnedRole !== "teacher" && returnedRole !== "admin") {
        setErrorMsg(`Access Denied: Selected role is Teacher but your account is registered as ${returnedRole.toUpperCase()}.`);
        setIsSubmitting(false);
        return;
      }

      if (activeRole === "student" && returnedRole !== "student") {
        setErrorMsg(`Access Denied: Selected role is Student but your account is registered as ${returnedRole.toUpperCase()}.`);
        setIsSubmitting(false);
        return;
      }

      if (activeRole === "parent" && returnedRole !== "parent") {
        setErrorMsg(`Access Denied: Selected role is Parent but your account is registered as ${returnedRole.toUpperCase()}.`);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      const name = data.user.name || data.user.nic || data.user.phone || portalId;
      onSuccess(returnedRole, name, data.token || "", data.user);
    } catch (err: any) {
      console.error("Login exception:", err);
      setErrorMsg("Network error: Unable to contact School Portal Backend. Please verify your internet connection.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-portal-main text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-indigo-500/30 transition-colors duration-200 ${isMobileApp ? "pb-[30px]" : ""}`}>
      
      {/* Spacer or very subtle header logo alignment to match Portal dashboard headers */}
      <div className="max-w-md w-full mx-auto flex justify-between items-center py-2">
        <div className="flex items-center gap-2 select-none">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
            Hero Atlas
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-600 font-mono font-bold tracking-wider uppercase bg-slate-950/40 border border-slate-900/60 px-2.5 py-1 rounded-md">
            Portal Gateway
          </span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center py-6">
        
        {/* Title Block */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-black tracking-tight text-slate-100 uppercase sm:text-4xl">
            Identity Gateway
          </h1>
          <p className="text-xs sm:text-sm mt-2 text-slate-400 font-medium leading-relaxed">
            Select your educational division and verify credentials to initialize your secure session.
          </p>
        </div>

        {/* Triple Role Selector Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Teacher Card */}
          <button
            type="button"
            onClick={() => handleRoleChange("teacher")}
            className={`relative rounded-2xl p-4 flex flex-col items-center justify-center transition-all border text-center aspect-[1.1] cursor-pointer ${
              activeRole === "teacher"
                ? theme === "dark"
                  ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/5"
                  : "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-lg shadow-indigo-500/5 font-semibold"
                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:bg-slate-900/50 hover:text-slate-300"
            }`}
          >
            {activeRole === "teacher" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
              activeRole === "teacher"
                ? theme === "dark"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                : "bg-slate-900 border border-slate-800 text-slate-500"
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold tracking-wide ${
              activeRole === "teacher" ? "text-slate-100" : "text-slate-400"
            }`}>
              Teacher
            </span>
          </button>

          {/* Student Card */}
          <button
            type="button"
            onClick={() => handleRoleChange("student")}
            className={`relative rounded-2xl p-4 flex flex-col items-center justify-center transition-all border text-center aspect-[1.1] cursor-pointer ${
              activeRole === "student"
                ? theme === "dark"
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/5"
                  : "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-lg shadow-emerald-500/5 font-semibold"
                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:bg-slate-900/50 hover:text-slate-300"
            }`}
          >
            {activeRole === "student" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
              activeRole === "student"
                ? theme === "dark"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-slate-900 border border-slate-800 text-slate-500"
            }`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold tracking-wide ${
              activeRole === "student" ? "text-slate-100" : "text-slate-400"
            }`}>
              Student
            </span>
          </button>

          {/* Parent Card */}
          <button
            type="button"
            onClick={() => handleRoleChange("parent")}
            className={`relative rounded-2xl p-4 flex flex-col items-center justify-center transition-all border text-center aspect-[1.1] cursor-pointer ${
              activeRole === "parent"
                ? theme === "dark"
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/5"
                  : "bg-amber-50 border-amber-300 text-amber-700 shadow-lg shadow-amber-500/5 font-semibold"
                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:bg-slate-900/50 hover:text-slate-300"
            }`}
          >
            {activeRole === "parent" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
              activeRole === "parent"
                ? theme === "dark"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-slate-900 border border-slate-800 text-slate-500"
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold tracking-wide ${
              activeRole === "parent" ? "text-slate-100" : "text-slate-400"
            }`}>
              Parent
            </span>
          </button>
        </div>

        {/* Secure Form Wrapper */}
        <form 
          onSubmit={handleSignIn}
          className="bg-slate-950/40 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-5 transition-all backdrop-blur-sm"
        >
          {/* Header */}
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-500 select-none">
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>Secure Access ({activeRole})</span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className={`rounded-2xl p-4 text-xs font-medium leading-relaxed border ${
              theme === "dark"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <p className="font-bold mb-0.5">Authorization Failed</p>
              <p className={theme === "dark" ? "text-slate-400 font-normal" : "text-rose-600/90 font-normal"}>
                {errorMsg}
              </p>
            </div>
          )}

          {/* ID Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">
              Portal ID (NIC, Phone, or Reg No)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-600 select-none">
                ID
              </span>
              <input
                type="text"
                required
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl pl-12 pr-4 py-2.5 text-xs font-semibold text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder={
                  activeRole === "teacher" ? "e.g., T101" : 
                  activeRole === "student" ? "e.g., S205" : 
                  "e.g., P903"
                }
                value={portalId}
                onChange={(e) => setPortalId(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">
              Secure Key Phrase
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="password"
                required
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl pl-12 pr-4 py-2.5 text-xs font-semibold text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Portal session...</span>
              </>
            ) : (
              <>
                <span>Sign in to {activeRole} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Text */}
      <footer className="text-center py-6 select-none border-t border-slate-900/40">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
          EduKeeper Hub • Standard Core Executing on Port 3000
        </p>
      </footer>

    </div>
  );
}
