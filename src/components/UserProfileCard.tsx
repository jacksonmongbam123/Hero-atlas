import React from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  BadgeCheck, 
  LogOut, 
  ShieldCheck, 
  Hash, 
  Award,
  CircleDot
} from "lucide-react";

interface UserProfileCardProps {
  user: any;
  onLogout: () => void;
}

export default function UserProfileCard({ user, onLogout }: UserProfileCardProps) {
  if (!user) return null;

  // Derive display name
  const firstName = user.first_name || "";
  const middleName = user.middle_name || "";
  const lastName = user.last_name || "";
  const fullName = `${firstName} ${middleName} ${lastName}`.trim() || user.name || "Portal User";
  
  const role = user.user_type || user.role || "user";
  const portalId = user.nic || user.reg_no || user.phone || "N/A";

  // Role style colors
  const roleStyles = {
    teacher: {
      bg: "bg-indigo-600/10 border-indigo-500/30 text-indigo-400",
      badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      accent: "text-indigo-400"
    },
    student: {
      bg: "bg-emerald-600/10 border-emerald-500/30 text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      accent: "text-emerald-400"
    },
    parent: {
      bg: "bg-amber-600/10 border-amber-500/30 text-amber-400",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      accent: "text-amber-400"
    },
    admin: {
      bg: "bg-rose-600/10 border-rose-500/30 text-rose-400",
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      accent: "text-rose-400"
    }
  }[role.toLowerCase() as "teacher" | "student" | "parent" | "admin"] || {
    bg: "bg-slate-600/10 border-slate-500/30 text-slate-400",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    accent: "text-slate-400"
  };

  // Format date if present
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-slate-900/30 border border-slate-800/60 rounded-3xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm select-none mt-6">
      
      {/* Background radial accent glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${roleStyles.bg}`}>
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Profile</span>
            <h3 className="text-sm font-bold text-slate-200 tracking-tight leading-none mt-0.5">
              {fullName}
            </h3>
          </div>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleStyles.badge}`}>
          {role}
        </span>
      </div>

      {/* Profile Details Grid */}
      <div className="space-y-3.5 mb-5 text-[11px] text-slate-400">
        
        {/* Dynamic Items */}
        <div className="grid grid-cols-2 gap-3">
          {/* Portal ID / NIC */}
          <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-2.5 flex items-start gap-2">
            <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Portal ID / NIC</p>
              <p className="font-mono text-slate-300 font-bold mt-0.5 truncate">{portalId}</p>
            </div>
          </div>

          {/* Phone Number */}
          <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-2.5 flex items-start gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Contact Phone</p>
              <p className="text-slate-300 font-semibold mt-0.5 truncate">{user.phone || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Full Details Block */}
        <div className="bg-slate-950/20 border border-slate-800/40 rounded-xl p-3 space-y-2.5">
          {/* Email */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-slate-500">
              <Mail className="w-3.5 h-3.5" />
              Email Address:
            </span>
            <span className="text-slate-300 font-medium font-mono select-all truncate max-w-[150px]">
              {user.email || "N/A"}
            </span>
          </div>

          {/* Gender / Sex */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-slate-500">
              <CircleDot className="w-3.5 h-3.5" />
              Gender / Sex:
            </span>
            <span className="text-slate-300 font-medium capitalize">
              {user.sex || "N/A"}
            </span>
          </div>

          {/* Date of Birth */}
          {user.dob && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                Date of Birth:
              </span>
              <span className="text-slate-300 font-medium">
                {formatDate(user.dob)}
              </span>
            </div>
          )}

          {/* Reg Date if Student/Teacher */}
          {user.reg_date && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 text-slate-500">
                <Award className="w-3.5 h-3.5" />
                Enrollment Date:
              </span>
              <span className="text-slate-300 font-medium font-mono text-[10px]">
                {formatDate(user.reg_date)}
              </span>
            </div>
          )}

          {/* Active Session Badge */}
          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800/60">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              VERIFIED SECURE SESSION
            </span>
            <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">
              PORT 3000
            </span>
          </div>
        </div>

      </div>

      {/* Logout Action */}
      <div style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 24px))" }}>
        <button
          onClick={onLogout}
          className="w-full bg-white/5 hover:bg-white/10 text-red-500 hover:text-red-400 font-medium py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-red-500" />
          <span>Logout from Session</span>
        </button>
      </div>

    </div>
  );
}
