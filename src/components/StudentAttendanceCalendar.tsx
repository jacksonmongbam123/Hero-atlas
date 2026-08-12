import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  CalendarDays
} from "lucide-react";

const EMPTY_ARRAY: any[] = [];
const SCHOOL_BACKEND_URL = "https://abms-lkw9.onrender.com";

// Fallback fetch helper prioritizing remote API endpoints (e.g., https://abms-lkw9.onrender.com) then local origin
const getStoredToken = (): string => {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("userToken") || "";
  } catch {
    return "";
  }
};

async function fetchWithFallback(path: string, options?: RequestInit): Promise<any> {
  const windowOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const envApiUrl = (import.meta as any).env?.VITE_API_URL || "";

  const candidates = Array.from(new Set([
    "",
    windowOrigin,
    envApiUrl,
    "https://abms-lkw9.onrender.com"
  ])).filter(c => c !== undefined && c !== null);

  const rawToken = (options?.headers as any)?.Authorization || (options?.headers as any)?.authorization || (options?.headers as any)?.["x-access-token"] || getStoredToken();
  const cleanTok = rawToken ? String(rawToken).replace(/^Bearer\s+/i, "").trim() : "";
  const authHeader = cleanTok ? `Bearer ${cleanTok}` : "";

  const combinedRecords: any[] = [];
  let successObject: any = null;

  for (const baseUrl of candidates) {
    try {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      const urlsToTry: string[] = [];

      if (baseUrl) {
        const trimmedBase = baseUrl.replace(/\/+$/, "");
        if (cleanPath.startsWith("/api/")) {
          urlsToTry.push(`${trimmedBase}${cleanPath}`);
          urlsToTry.push(`${trimmedBase}${cleanPath.slice(4)}`);
        } else {
          urlsToTry.push(`${trimmedBase}${cleanPath}`);
          urlsToTry.push(`${trimmedBase}/api${cleanPath}`);
        }
      } else {
        urlsToTry.push(cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`);
        urlsToTry.push(cleanPath);
      }

      for (const url of urlsToTry) {
        try {
          const mergedHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            ...(options?.headers as any)
          };
          if (cleanTok) {
            if (!mergedHeaders["Authorization"] && !mergedHeaders["authorization"]) {
              mergedHeaders["Authorization"] = authHeader;
            }
            if (!mergedHeaders["x-access-token"]) {
              mergedHeaders["x-access-token"] = cleanTok;
            }
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            ...options,
            headers: mergedHeaders
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            const text = await response.text();
            if (text && !contentType.includes("html") && !text.trim().startsWith("<!") && !text.trim().startsWith("<html")) {
              try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                  if (parsed.length > 0) {
                    combinedRecords.push(...parsed);
                    break;
                  }
                } else if (parsed && typeof parsed === "object") {
                  const list = parsed.records || parsed.data || parsed.attendance || parsed.results || parsed.logs;
                  if (Array.isArray(list) && list.length > 0) {
                    combinedRecords.push(...list);
                    break;
                  } else if (!successObject) {
                    successObject = parsed;
                  }
                }
              } catch {}
            }
          }
        } catch {
          // continue
        }
      }
      if (combinedRecords.length > 0) {
        break;
      }
    } catch {
      // continue
    }
  }

  if (combinedRecords.length > 0) {
    return combinedRecords;
  }
  if (successObject) {
    return successObject;
  }
  return [];
}

export function StudentAttendanceCalendar({
  user,
  parentUser,
  isDark,
  token,
  organizationClasses = EMPTY_ARRAY,
  teacherClasses = EMPTY_ARRAY,
  timetableItems = EMPTY_ARRAY,
  timetableSubjects = EMPTY_ARRAY,
  timetableTeachers = EMPTY_ARRAY,
  organizationDetails
}: {
  user: any;
  parentUser?: any;
  isDark: boolean;
  token?: string;
  organizationClasses?: any[];
  teacherClasses?: any[];
  timetableItems?: any[];
  timetableSubjects?: any[];
  timetableTeachers?: any[];
  organizationDetails?: any;
}) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent" | "late">>({});
  const [loading, setLoading] = useState<boolean>(false);

  const userRole = (user?.user_type || user?.role || "student").toLowerCase();
  const canEdit = userRole === "teacher" || userRole === "admin";
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 8 }, (_, i) => 2023 + i);

  // Keep attendance identifiers separate from profile/display fields. The school
  // backend stores attendance against the MongoDB student id, not the login
  // username, phone number, or display name.
  const studentTokens = useMemo(() => {
    const set = new Set<string>();

    const collectFromObject = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      [
        obj._id,
        obj.user_id,
        obj.studentID,
        obj.student_id,
        obj.studentId,
        obj.id,
        obj.reg_no,
        obj.rollNo,
        obj.username,
        obj.nic,
        obj.phone
      ].forEach(val => {
        if (val !== undefined && val !== null) {
          const s = String(val).trim();
          if (s && s !== "undefined" && s !== "null" && s !== "[object Object]") {
            set.add(s);
          }
        }
      });
    };

    collectFromObject(user);
    collectFromObject(parentUser);

    if (user && Array.isArray(user.students)) {
      user.students.forEach((s: any) => {
        if (typeof s === "object") collectFromObject(s);
        else if (s) set.add(String(s).trim());
      });
    }

    if (user && Array.isArray(user.children)) {
      user.children.forEach((c: any) => {
        if (typeof c === "object") collectFromObject(c);
        else if (c) set.add(String(c).trim());
      });
    }

    if (parentUser && Array.isArray(parentUser.children)) {
      parentUser.children.forEach((c: any) => {
        if (typeof c === "object") collectFromObject(c);
        else if (c) set.add(String(c).trim());
      });
    }

    return Array.from(set);
  }, [user, parentUser]);

  // Always query the canonical backend id first. This prevents production from
  // issuing a request for every profile field and then timing out before the
  // real attendance request completes.
  const primaryStudentId = String(
    user?._id ||
    user?.user_id ||
    user?.student_id ||
    user?.studentID ||
    user?.studentId ||
    studentTokens[0] ||
    user?.id ||
    user?.nic ||
    ""
  ).trim();

  // Fetch attendance for the selected year and month strictly from database
  const fetchMonthAttendance = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const newMap: Record<string, "present" | "absent" | "late"> = {};

    const rawToken = token || user?.token || getStoredToken();
    const cleanTok = rawToken ? String(rawToken).replace(/^Bearer\s+/i, "").trim() : "";
    const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (cleanTok) {
      authHeaders["Authorization"] = `Bearer ${cleanTok}`;
      authHeaders["x-access-token"] = cleanTok;
    }

    const fetchTokens = Array.from(new Set([primaryStudentId, ...studentTokens].filter(Boolean)));
    const latestRecordByDate = new Map<string, { timestamp: number; sequence: number; objectId?: string }>();
    let recordSequence = 0;

    // Helper to format any date representation to YYYY-MM-DD
    const parseToYMD = (val: any): string => {
      if (!val) return "";
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return "";
        const y = val.getUTCFullYear();
        const m = String(val.getUTCMonth() + 1).padStart(2, "0");
        const d = String(val.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const s = String(val).trim();
      if (!s) return "";
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.slice(0, 10);
      }
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        if (s.includes("GMT") || s.includes("UTC") || s.includes("Z") || s.includes("T")) {
          const y = dt.getUTCFullYear();
          const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
          const d = String(dt.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        } else {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const d = String(dt.getDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
      }
      return "";
    };

    const getRecordInfo = (rec: any) => {
      let timestamp = 0;
      for (const value of [rec?.updatedAt, rec?.createdAt, rec?.timestamp]) {
        if (!value) continue;
        const parsed = new Date(value).getTime();
        if (!Number.isNaN(parsed) && parsed > 0) {
          timestamp = parsed;
          break;
        }
      }

      const objectId = String(rec?._id?.$oid || rec?._id || rec?.id || "").trim();
      if (!timestamp && /^[\da-f]{24}$/i.test(objectId)) {
        timestamp = Number.parseInt(objectId.slice(0, 8), 16) * 1000;
      }

      return { timestamp, objectId };
    };

    // Helper to apply status to date. The school backend appends attendance
    // updates, so several records can exist for one student/date. Always use
    // the newest record rather than trusting response order.
    const applyRecord = (rec: any) => {
      if (!rec) return;
      const recSId = String(
        rec.studentID || rec.student_id || rec.studentId || rec.student || rec.reg_no || rec.user_id || rec.id || rec._id || ""
      ).trim().toLowerCase();
      
      const matchesToken = fetchTokens.length === 0 ? true : fetchTokens.some(t => {
        const lowerT = String(t).trim().toLowerCase();
        if (!lowerT || lowerT === "undefined" || lowerT === "null") return false;
        return lowerT === recSId || recSId === lowerT || (recSId.length >= 4 && lowerT.includes(recSId)) || (lowerT.length >= 4 && recSId.includes(lowerT));
      });

      // Do not let an unfiltered fallback response overwrite this student's
      // calendar with another student's attendance.
      if (!matchesToken) return;

      const rawDate = rec.attendanceDate || rec.attendance_date || rec.date;
      const dateStr = parseToYMD(rawDate);

      if (dateStr && dateStr.length >= 10) {
        const sequence = recordSequence++;
        const { timestamp, objectId } = getRecordInfo(rec);
        const previous = latestRecordByDate.get(dateStr);

        if (previous) {
          if (timestamp < previous.timestamp) return;
          if (timestamp === previous.timestamp) {
            if (objectId && previous.objectId && objectId < previous.objectId) return;
            if ((!objectId || !previous.objectId || objectId === previous.objectId) && sequence < previous.sequence) return;
          }
        }
        latestRecordByDate.set(dateStr, { timestamp, sequence, objectId });

        const statusLower = String(rec.status || rec.presence || "").trim().toLowerCase();
        const isLate = statusLower === "late";
        const isAbsent = statusLower === "absent" || rec.attended === false || rec.attended === "false" || rec.attended === 0 || rec.attended === "0";
        const isPresent = statusLower === "present" || statusLower === "p" || rec.attended === true || rec.attended === "true" || rec.attended === 1 || rec.attended === "1";

        if (isLate) {
          newMap[dateStr] = "late";
        } else if (isAbsent) {
          newMap[dateStr] = "absent";
        } else if (isPresent) {
          newMap[dateStr] = "present";
        }
      }
    };

    const fetchSchoolBackendMonth = async () => {
      const monthDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const dates = Array.from({ length: monthDays }, (_, index) => (
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
      ));

      const fetchForId = async (studentId: string) => {
        const requests = dates.map(async date => {
          try {
            const response = await fetch(`${SCHOOL_BACKEND_URL}/class/attendance/lookup`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({ studentID: studentId, date }),
              cache: "no-store"
            });

            if (!response.ok) return [];
            const payload = await response.json().catch(() => []);
            return Array.isArray(payload) ? payload : [];
          } catch {
            return [];
          }
        });

        return (await Promise.all(requests)).flat();
      };

      const allRecords = (await Promise.all(fetchTokens.map(id => fetchForId(id)))).flat();
      allRecords.forEach((record: any) => applyRecord(record));
    };

    try {
      // 1. Query Hero-atlas local/proxy Mongo endpoint (reads MongoDB Atlas directly with expanded student token aliases)
      try {
        const monthRes = await fetchWithFallback("/api/attendance/student_month", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            studentIDs: fetchTokens,
            year: selectedYear,
            month: selectedMonth + 1
          })
        });
        if (Array.isArray(monthRes) && monthRes.length > 0) {
          monthRes.forEach((r: any) => applyRecord(r));
        }
      } catch (e) {
        console.warn("[StudentMonth API] notice:", e);
      }

      // 2. Query school backend / Render lookup route for ALL fetchTokens across the month
      await fetchSchoolBackendMonth();

      setAttendanceMap(prev => {
        const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
        Object.entries(prev).forEach(([d, status]) => {
          if (!d.startsWith(monthPrefix) && status) {
            newMap[d] = status as "present" | "absent" | "late";
          }
        });

        const prevKeys = Object.keys(prev);
        const newKeys = Object.keys(newMap);
        if (prevKeys.length === newKeys.length) {
          const hasChanged = newKeys.some(k => prev[k] !== newMap[k]);
          if (!hasChanged) {
            return prev;
          }
        }
        return { ...newMap };
      });
    } catch (err) {
      console.error("Error fetching month attendance:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, primaryStudentId, token, user, studentTokens]);

  const fetchMonthAttendanceRef = useRef(fetchMonthAttendance);
  useEffect(() => {
    fetchMonthAttendanceRef.current = fetchMonthAttendance;
  });

  useEffect(() => {
    // Initial mount or month change fetch
    fetchMonthAttendanceRef.current(false);

    const triggerBackgroundFetch = () => {
      fetchMonthAttendanceRef.current(true);
    };

    // Fast 2s background polling for real-time live synchronization with MongoDB Atlas
    const interval = setInterval(triggerBackgroundFetch, 2000);

    // Instant update on custom event, focus, or visibility change
    const handleImmediateUpdate = () => {
      fetchMonthAttendanceRef.current(false);
    };

    window.addEventListener("attendance_updated", handleImmediateUpdate);
    window.addEventListener("focus", handleImmediateUpdate);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handleImmediateUpdate();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance_updated", handleImmediateUpdate);
      window.removeEventListener("focus", handleImmediateUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedYear, selectedMonth, primaryStudentId]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleDayClick = async (dateStr: string) => {
    setSelectedDayDetail(dateStr);

    // Students and Parents CANNOT post attendance to the database. Attendance editing is strictly for teachers/admins.
    if (!canEdit) {
      return;
    }

    const currentStatus = attendanceMap[dateStr];
    let nextStatus: "present" | "absent" | "late" = "present";
    if (currentStatus === "present") nextStatus = "absent";
    else if (currentStatus === "absent") nextStatus = "late";
    else if (currentStatus === "late") nextStatus = "present";

    // 1. Optimistic UI state update
    setAttendanceMap(prev => ({
      ...prev,
      [dateStr]: nextStatus
    }));

    // 2. Persist to MongoDB Atlas via backend API
    const authToken = token || user?.token || "";
    const primaryId = primaryStudentId || "S101";
    try {
      await fetchWithFallback("/class/attendance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken ? (authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`) : ""
        },
        body: JSON.stringify({
          studentID: primaryId,
          studentIDs: studentTokens,
          date: dateStr,
          attended: nextStatus === "present" || nextStatus === "late",
          status: nextStatus
        })
      });
      window.dispatchEvent(new Event("attendance_updated"));
    } catch (e) {
      console.warn("Day status toggle error:", e);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Calendar calculations
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...

  // Calculate statistics for current month strictly from real database records in attendanceMap
  let presentCount = 0;
  let absentCount = 0;
  let totalLogged = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const st = attendanceMap[dateStr];
    if (st === "present" || st === "late") {
      presentCount++;
      totalLogged++;
    } else if (st === "absent") {
      absentCount++;
      totalLogged++;
    }
  }

  const attendancePercentage = totalLogged > 0 ? ((presentCount / totalLogged) * 100).toFixed(1) : "100.0";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm space-y-6 shadow-xl">
      {/* Calendar Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Monthly Attendance Registry
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Tracking verified attendance history for <span className="text-slate-200 font-medium">{user?.name || user?.username || "Student"}</span> ({primaryStudentId})
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col items-start sm:items-end gap-3">
          {/* Month/Year Selection Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer font-mono"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today & Refresh Buttons Below */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={fetchMonthAttendance}
              disabled={loading}
              title="Refresh Attendance"
              className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Redesigned Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Attendance Rate Card */}
        <div className="bg-slate-950/60 border border-indigo-500/20 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Attendance Rate</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">{attendancePercentage}%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden border border-indigo-500/10">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(attendancePercentage) || 0))}%` }}
            ></div>
          </div>
        </div>

        {/* Present Card */}
        <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Present</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{presentCount}</span>
            <span className="text-xs text-slate-400 font-medium">Days</span>
          </div>
          <div className="w-full bg-emerald-950/40 border border-emerald-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: totalLogged > 0 ? `${(presentCount / totalLogged) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        {/* Absent Card */}
        <div className="bg-slate-950/60 border border-rose-500/20 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Absent</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">{absentCount}</span>
            <span className="text-xs text-slate-400 font-medium">Days</span>
          </div>
          <div className="w-full bg-rose-950/40 border border-rose-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: totalLogged > 0 ? `${(absentCount / totalLogged) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        {/* Total Logged Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Logged</span>
            <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">{totalLogged}</span>
            <span className="text-xs text-slate-400 font-medium">Days</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-700/50">
            <div className="bg-slate-400 h-full rounded-full w-full"></div>
          </div>
        </div>
      </div>

      {/* Simple Calendar Grid */}
      <div className="space-y-2">
        {/* Day of Week Labels */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
            <div
              key={dayName}
              className={`text-xs font-semibold py-1 ${
                idx === 0 || idx === 6 ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty offset days */}
          {Array.from({ length: firstDayWeekday }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square rounded-none bg-slate-950/20 border border-slate-900/40 opacity-20"></div>
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const weekday = (firstDayWeekday + idx) % 7;
            const isWeekend = weekday === 0 || weekday === 6;
            const isToday =
              today.getFullYear() === selectedYear &&
              today.getMonth() === selectedMonth &&
              today.getDate() === dayNum;

            const status = attendanceMap[dateStr];
            const isSelected = selectedDayDetail === dateStr;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                title={
                  canEdit
                    ? `Click to toggle status for ${dateStr} (Current: ${status || "None"})`
                    : `Date: ${dateStr} - Status: ${status ? status.toUpperCase() : "No record"}`
                }
                className={`aspect-square p-0 flex flex-col justify-between relative select-none bg-slate-950/40 border transition-all ${
                  isSelected ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-slate-800/60"
                } rounded-xl overflow-hidden ${
                  canEdit
                    ? "hover:border-indigo-500/50 active:scale-95 cursor-pointer group"
                    : "cursor-pointer hover:border-slate-700/80"
                }`}
              >
                {/* Small Date Number */}
                <div className="w-full flex items-center justify-between text-xs font-semibold font-mono pt-1.5 px-2">
                  <span className={isToday ? "text-indigo-400 font-bold" : isWeekend ? "text-slate-500" : "text-slate-300"}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Today"></span>
                  )}
                </div>

                {/* Thin Barline at bottom of date */}
                <div className="w-full flex justify-center items-end mt-auto">
                  {status === "present" ? (
                    <div className="w-full h-1 bg-emerald-500 rounded-none" title="Present"></div>
                  ) : status === "absent" ? (
                    <div className="w-full h-1 bg-rose-500 rounded-none" title="Absent"></div>
                  ) : status === "late" ? (
                    <div className="w-full h-1 bg-amber-500 rounded-none" title="Late"></div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspection Detail Card */}
      {selectedDayDetail && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              attendanceMap[selectedDayDetail] === "present" ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" :
              attendanceMap[selectedDayDetail] === "absent" ? "bg-rose-500 shadow-sm shadow-rose-500/50" :
              attendanceMap[selectedDayDetail] === "late" ? "bg-amber-500 shadow-sm shadow-amber-500/50" : "bg-slate-600"
            }`} />
            <div>
              <p className="text-xs font-bold text-slate-200 font-mono">
                Attendance Record: {selectedDayDetail}
              </p>
              <p className="text-[11px] text-slate-400">
                Status: <span className="font-semibold text-slate-100 capitalize">{attendanceMap[selectedDayDetail] || "No Record Logged"}</span>
                {!canEdit && <span className="text-slate-500 ml-2">(Student Read-Only View)</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDayDetail(null)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Minimal Footer Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-1 bg-emerald-500 rounded-sm"></span> Present
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-1 bg-rose-500 rounded-sm"></span> Absent
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-1 bg-amber-500 rounded-sm"></span> Late
          </span>
        </div>
        {!canEdit && (
          <span className="text-[10px] text-slate-500 italic">
            Note: Attendance ledger is managed by class instructors. Students view verified records only.
          </span>
        )}
      </div>
    </div>
  );
}

export default StudentAttendanceCalendar;
