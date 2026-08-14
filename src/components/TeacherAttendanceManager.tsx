import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Search,
  Filter
} from "lucide-react";

const SCHOOL_BACKEND_URL = "https://abms-lkw9.onrender.com";

const getStoredToken = (): string => {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
};

interface Student {
  _id: string;
  id?: string;
  studentID?: string;
  student_id?: string;
  name: string;
  full_name?: string;
  rollNo: string;
  reg_no?: string;
  nic?: string;
}

interface AttendanceRecord {
  studentID: string;
  date: string;
  attended: boolean;
  status?: "present" | "absent" | "late";
}

interface StudentAttendance {
  studentId: string;
  name: string;
  rollNo: string;
  presentDays: number;
  absentDays: number;
  totalDays: number;
  percentage: string;
  records: Record<string, "present" | "absent" | "late" | "no_record">;
}

interface ClassData {
  id: string;
  name: string;
  code?: string;
  students: Student[];
}

export function TeacherAttendanceManager({
  user,
  teacherClasses = [],
  token,
  isDark = false,
}: {
  user: any;
  teacherClasses?: any[];
  token?: string;
  isDark?: boolean;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceData, setAttendanceData] = useState<Map<string, StudentAttendance>>(new Map());
  const [classesWithStudents, setClassesWithStudents] = useState<ClassData[]>([]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 8 }, (_, i) => 2023 + i);

  const token_val = token || getStoredToken();

  // Fetch students for each class
  const fetchStudentsForClasses = useCallback(async () => {
    if (!teacherClasses || teacherClasses.length === 0) return;

    const classesData: ClassData[] = [];

    for (const cls of teacherClasses) {
      const classId = String(cls._id || cls.id || cls.class_id || "");
      const className = cls.name || cls.class_name || "Class";
      const classCode = cls.code || cls.class_code || classId;

      if (!classId) continue;

      // Check if class already has students embedded
      if (cls.students && Array.isArray(cls.students) && cls.students.length > 0) {
        classesData.push({
          id: classId,
          name: className,
          code: classCode,
          students: cls.students
        });
        continue;
      }

      // Try to fetch students from backend
      try {
        const authHeaders = {
          "Content-Type": "application/json",
          ...(token_val && { "Authorization": `Bearer ${token_val}`, "x-access-token": token_val })
        };

        const response = await fetch(`${SCHOOL_BACKEND_URL}/class/students`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ classID: classId, class_id: classId })
        });

        if (response.ok) {
          const students = await response.json();
          if (Array.isArray(students) && students.length > 0) {
            classesData.push({
              id: classId,
              name: className,
              code: classCode,
              students: students
            });
          } else {
            classesData.push({
              id: classId,
              name: className,
              code: classCode,
              students: []
            });
          }
        } else {
          classesData.push({
            id: classId,
            name: className,
            code: classCode,
            students: []
          });
        }
      } catch (error) {
        console.error(`Error fetching students for class ${classId}:`, error);
        classesData.push({
          id: classId,
          name: className,
          code: classCode,
          students: []
        });
      }
    }

    setClassesWithStudents(classesData);
  }, [teacherClasses, token_val]);

  // Fetch students when component mounts or teacherClasses changes
  useEffect(() => {
    fetchStudentsForClasses();
  }, [fetchStudentsForClasses]);

  // Set default class on mount
  useEffect(() => {
    if (classesWithStudents.length > 0 && !selectedClassId) {
      setSelectedClassId(classesWithStudents[0].id);
    }
  }, [classesWithStudents, selectedClassId]);

  const selectedClass = classesWithStudents.find(c => c.id === selectedClassId);

  // Fetch attendance data for all students in the selected class
  const fetchClassAttendance = useCallback(async () => {
    if (!selectedClassId || !selectedClass?.students || selectedClass.students.length === 0) {
      setAttendanceData(new Map());
      return;
    }

    setLoading(true);
    try {
      const authHeaders = {
        "Content-Type": "application/json",
        ...(token_val && { "Authorization": `Bearer ${token_val}`, "x-access-token": token_val })
      };

      const newAttendanceMap = new Map<string, StudentAttendance>();
      const monthDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const datesInMonth = Array.from({ length: monthDays }, (_, i) =>
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
      );

      console.log(`Fetching attendance for ${selectedClass.students.length} students for ${months[selectedMonth]} ${selectedYear}`);

      // Fetch attendance for each student
      for (const student of selectedClass.students) {
        const studentId = String(student._id || student.id || student.studentID || student.student_id || "");
        const studentName = student.name || student.full_name || "Student";
        const rollNo = student.rollNo || student.reg_no || student.nic || studentId;

        if (!studentId) {
          console.warn("Student missing ID:", student);
          continue;
        }

        const studentRecords: Record<string, "present" | "absent" | "late" | "no_record"> = {};
        let presentCount = 0;
        let absentCount = 0;

        // Query attendance for each date
        for (const date of datesInMonth) {
          try {
            const response = await fetch(`${SCHOOL_BACKEND_URL}/class/attendance/lookup`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({
                studentID: studentId,
                date: date
              })
            });

            if (response.ok) {
              const records = await response.json();
              if (Array.isArray(records) && records.length > 0) {
                const latestRecord = records[records.length - 1];
                const status = String(latestRecord.status || "").toLowerCase();
                const attended = latestRecord.attended;

                if (status === "late" || attended === true || attended === "true" || attended === 1) {
                  studentRecords[date] = "present";
                  presentCount++;
                } else if (status === "absent" || attended === false || attended === "false" || attended === 0) {
                  studentRecords[date] = "absent";
                  absentCount++;
                } else {
                  studentRecords[date] = "no_record";
                }
              } else {
                studentRecords[date] = "no_record";
              }
            }
          } catch (error) {
            studentRecords[date] = "no_record";
          }
        }

        const totalDays = presentCount + absentCount;
        const percentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : "N/A";

        newAttendanceMap.set(studentId, {
          studentId,
          name: studentName,
          rollNo,
          presentDays: presentCount,
          absentDays: absentCount,
          totalDays,
          percentage,
          records: studentRecords
        });
      }

      console.log(`Loaded attendance for ${newAttendanceMap.size} students`);
      setAttendanceData(newAttendanceMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendanceData(new Map());
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedClass, selectedMonth, selectedYear, token_val, months]);

  useEffect(() => {
    fetchClassAttendance();
  }, [fetchClassAttendance]);

  const filteredStudents = Array.from(attendanceData.values()).filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;

    attendanceData.forEach(student => {
      totalPresent += student.presentDays;
      totalAbsent += student.absentDays;
    });

    const total = totalPresent + totalAbsent;
    const percentage = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : "0.0";

    return { totalPresent, totalAbsent, total, percentage };
  }, [attendanceData]);

  if (classesWithStudents.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No classes assigned to this teacher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> Teacher Attendance Registry
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Manage and monitor attendance for <span className="text-slate-200 font-medium">
                {selectedClass?.name || "Select a class"}
              </span>
              {selectedClass && ` (${selectedClass.students.length} students)`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            {/* Class Selection */}
            {classesWithStudents.length > 0 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {classesWithStudents.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} ({cls.students.length})</option>
                ))}
              </select>
            )}

            {/* Month/Year Selection */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleNextMonth}
                className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>
              <button
                onClick={fetchClassAttendance}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Attendance Rate */}
        <div className="bg-slate-950/60 border border-indigo-500/20 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Attendance Rate</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-100 font-mono">{overallStats.percentage}%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden border border-indigo-500/10">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Number(overallStats.percentage))}%` }}
            ></div>
          </div>
        </div>

        {/* Present Count */}
        <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Present</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">{overallStats.totalPresent}</span>
          </div>
        </div>

        {/* Absent Count */}
        <div className="bg-slate-950/60 border border-rose-500/20 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Absent</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-rose-400 font-mono">{overallStats.totalAbsent}</span>
          </div>
        </div>

        {/* Total Records */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Entries</span>
            <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-100 font-mono">{overallStats.total}</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search student name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto animate-spin" />
              <p className="text-sm text-slate-400">Loading attendance data...</p>
            </div>
          </div>
        ) : selectedClass && selectedClass.students.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No students in this class.</p>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No students match your search.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Student Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Roll No</th>
                  <th className="text-center px-4 py-3 font-semibold text-emerald-400">Present</th>
                  <th className="text-center px-4 py-3 font-semibold text-rose-400">Absent</th>
                  <th className="text-center px-4 py-3 font-semibold text-indigo-400">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-300">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-200">{student.name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{student.rollNo}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold">
                        {student.presentDays}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-semibold">
                        {student.absentDays}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300 font-semibold">
                      {student.totalDays}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              Number(student.percentage) >= 75 ? "bg-emerald-500" :
                              Number(student.percentage) >= 50 ? "bg-yellow-500" :
                              "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Number(student.percentage))}%` }}
                          ></div>
                        </div>
                        <span className={`font-semibold font-mono ${
                          Number(student.percentage) >= 75 ? "text-emerald-400" :
                          Number(student.percentage) >= 50 ? "text-yellow-400" :
                          "text-rose-400"
                        }`}>
                          {student.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-500">
        <p>Data is automatically synced with the backend attendance records. {filteredStudents.length} student(s) shown for {months[selectedMonth]} {selectedYear}.</p>
      </div>
    </div>
  );
}

export default TeacherAttendanceManager;
