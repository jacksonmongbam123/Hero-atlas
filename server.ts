import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Persistent Database Schema & Manager
const DB_PATH = path.join(process.cwd(), "attendance_db.json");

interface DbClass {
  id: string;
  organization_id: string;
  teacher_id: string;
  name: string;
  code: string;
}

interface DbStudent {
  id: string;
  class_id: string;
  name: string;
  rollNo: string;
}

interface DbLog {
  id: string;
  class_id: string;
  className: string;
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface DbLeave {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  leave_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: string;
  created_at: string;
}

interface DbExtraActivity {
  _id: string;
  extra_activity_type_id: string;
  activity_name: string;
  established_date: string;
  is_active: boolean;
}

interface DbExtraActivityTeacher {
  _id: string;
  extra_activity_id: string;
  teacher_id: string;
  start_date: string;
  end_date: string;
}

interface DbMark {
  _id: string;
  student_id: string;
  student_name?: string;
  subject: string;
  subject_code?: string;
  exam_name: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  percentage: number;
  remarks: string;
  term: string;
  year: string;
}

interface DbFee {
  _id: string;
  student_id: string;
  student_name?: string;
  fee_type: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  status: "Paid" | "Pending" | "Overdue" | "Partial";
  receipt_no?: string;
  transaction_date?: string;
  payment_method?: string;
}

interface AttendanceDb {
  classes: DbClass[];
  students: DbStudent[];
  logs: DbLog[];
  leaves?: DbLeave[];
  extraActivities?: DbExtraActivity[];
  extraActivityTeachers?: DbExtraActivityTeacher[];
  organizations?: any[];
  notifications?: any[];
  student_attendance?: any[];
  marks?: DbMark[];
  m_marks?: DbMark[];
  fees?: DbFee[];
}

function getStudentMarks(db: AttendanceDb, studentIds: string | string[]): DbMark[] {
  const ids = (Array.isArray(studentIds) ? studentIds : [studentIds])
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());
  if (ids.length === 0) return [];

  const marksList = [...(db.m_marks || []), ...(db.marks || [])];
  return marksList.filter(m => {
    const itemTokens = [
      m.student_id, (m as any).studentId, (m as any).student, (m as any).reg_no, (m as any)._id
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    return ids.some(id => itemTokens.includes(id));
  });
}

function getStudentFees(db: AttendanceDb, studentIds: string | string[]): DbFee[] {
  if (!db.fees) return [];
  const ids = (Array.isArray(studentIds) ? studentIds : [studentIds])
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());
  if (ids.length === 0) return [];

  return db.fees.filter(f => {
    const itemTokens = [
      f.student_id, (f as any).studentId, (f as any).student, (f as any).reg_no, (f as any)._id
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    return ids.some(id => itemTokens.includes(id));
  });
}

function loadDb(): AttendanceDb {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      const db = JSON.parse(data);
      if (!db.leaves) {
        db.leaves = [];
      }
      if (!db.marks) {
        db.marks = [];
      }
      if (!db.fees) {
        db.fees = [];
      }
      if (!db.extraActivities || db.extraActivities.length === 0) {
        db.extraActivities = [
          { _id: "act-football", extra_activity_type_id: "sports", activity_name: "Varsity Football Team", established_date: "2018-04-12T00:00:00.000Z", is_active: true },
          { _id: "act-chess", extra_activity_type_id: "boardgames", activity_name: "Strategic Chess Club", established_date: "2020-01-15T00:00:00.000Z", is_active: true },
          { _id: "act-debate", extra_activity_type_id: "academic", activity_name: "National Debate Society", established_date: "2015-09-01T00:00:00.000Z", is_active: true },
          { _id: "act-music", extra_activity_type_id: "art", activity_name: "Symphonic Band & Orchestra", established_date: "2010-08-20T00:00:00.000Z", is_active: true },
          { _id: "act-robotics", extra_activity_type_id: "tech", activity_name: "AI & Robotics Association", established_date: "2022-02-18T00:00:00.000Z", is_active: true }
        ];
      }
      if (!db.extraActivityTeachers || db.extraActivityTeachers.length === 0) {
        db.extraActivityTeachers = [
          { _id: "rel-act-1", extra_activity_id: "act-football", teacher_id: "T101", start_date: "2026-01-01T00:00:00.000Z", end_date: "2026-12-31T00:00:00.000Z" },
          { _id: "rel-act-2", extra_activity_id: "act-chess", teacher_id: "T101", start_date: "2026-03-15T00:00:00.000Z", end_date: "2026-09-15T00:00:00.000Z" }
        ];
      }
      if (!db.organizations || db.organizations.length === 0) {
        db.organizations = [
          {
            _id: "org-hero-1",
            name: "Hero Atlas Academy of Excellence",
            line1: "100 Academic Boulevard",
            line2: "North Wing Campus",
            line3: "Accredited Division",
            city: "Metropolis",
            postcode: "10001",
            key: "ATH-ORG-941"
          }
        ];
      }
      if (!db.notifications || db.notifications.length === 0) {
        db.notifications = [
          {
            _id: "notif-1",
            title: "Faculty Board Briefing",
            message: "All department leads and active instructional faculty are requested to join the Dean in the main assembly hall at 02:00 PM today. We will review safety protocols and HAASC standard compliance metrics.",
            target_type: "teachers",
            target_class_id: "",
            target_student_id: "",
            sender_id: "admin-central",
            organization_id: "ATH-ORG-941",
            date: "2026-07-19T08:00:00.000Z"
          },
          {
            _id: "notif-2",
            title: "Accreditation Site Audit Scheduled",
            message: "The HAASC evaluation committee will conduct their physical onsite campus audit next Tuesday. Please ensure classroom ledger profiles and student rosters are fully synchronized.",
            target_type: "teachers",
            target_class_id: "",
            target_student_id: "",
            sender_id: "admin-central",
            organization_id: "ATH-ORG-941",
            date: "2026-07-18T10:30:00.000Z"
          },
          {
            _id: "notif-3",
            title: "Upgrade Complete: Extra Activities Relational Mapping",
            message: "The relational database mapping schema for Extra-Curricular Activity and Student registries is now fully live and active across all branches.",
            target_type: "teachers",
            target_class_id: "",
            target_student_id: "",
            sender_id: "sys-admin",
            organization_id: "ATH-ORG-941",
            date: "2026-07-17T14:15:00.000Z"
          }
        ];
      }
      return db;
    }
  } catch (err) {
    console.error("Error reading attendance database:", err);
  }
  return {
    classes: [],
    students: [],
    logs: [],
    leaves: [],
    extraActivities: [
      { _id: "act-football", extra_activity_type_id: "sports", activity_name: "Varsity Football Team", established_date: "2018-04-12T00:00:00.000Z", is_active: true },
      { _id: "act-chess", extra_activity_type_id: "boardgames", activity_name: "Strategic Chess Club", established_date: "2020-01-15T00:00:00.000Z", is_active: true },
      { _id: "act-debate", extra_activity_type_id: "academic", activity_name: "National Debate Society", established_date: "2015-09-01T00:00:00.000Z", is_active: true },
      { _id: "act-music", extra_activity_type_id: "art", activity_name: "Symphonic Band & Orchestra", established_date: "2010-08-20T00:00:00.000Z", is_active: true },
      { _id: "act-robotics", extra_activity_type_id: "tech", activity_name: "AI & Robotics Association", established_date: "2022-02-18T00:00:00.000Z", is_active: true }
    ],
    extraActivityTeachers: [
      { _id: "rel-act-1", extra_activity_id: "act-football", teacher_id: "T101", start_date: "2026-01-01T00:00:00.000Z", end_date: "2026-12-31T00:00:00.000Z" },
      { _id: "rel-act-2", extra_activity_id: "act-chess", teacher_id: "T101", start_date: "2026-03-15T00:00:00.000Z", end_date: "2026-09-15T00:00:00.000Z" }
    ],
    organizations: [
      {
        _id: "org-hero-1",
        name: "Hero Atlas Academy of Excellence",
        line1: "100 Academic Boulevard",
        line2: "North Wing Campus",
        line3: "Accredited Division",
        city: "Metropolis",
        postcode: "10001",
        key: "ATH-ORG-941"
      }
    ],
    notifications: [
      {
        _id: "notif-1",
        title: "Faculty Board Briefing",
        message: "All department leads and active instructional faculty are requested to join the Dean in the main assembly hall at 02:00 PM today. We will review safety protocols and HAASC standard compliance metrics.",
        target_type: "teachers",
        target_class_id: "",
        target_student_id: "",
        sender_id: "admin-central",
        organization_id: "ATH-ORG-941",
        date: "2026-07-19T08:00:00.000Z"
      },
      {
        _id: "notif-2",
        title: "Accreditation Site Audit Scheduled",
        message: "The HAASC evaluation committee will conduct their physical onsite campus audit next Tuesday. Please ensure classroom ledger profiles and student rosters are fully synchronized.",
        target_type: "teachers",
        target_class_id: "",
        target_student_id: "",
        sender_id: "admin-central",
        organization_id: "ATH-ORG-941",
        date: "2026-07-18T10:30:00.000Z"
      },
      {
        _id: "notif-3",
        title: "Upgrade Complete: Extra Activities Relational Mapping",
        message: "The relational database mapping schema for Extra-Curricular Activity and Student registries is now fully live and active across all branches.",
        target_type: "teachers",
        target_class_id: "",
        target_student_id: "",
        sender_id: "sys-admin",
        organization_id: "ATH-ORG-941",
        date: "2026-07-17T14:15:00.000Z"
      }
    ]
  };
}

function saveDb(db: AttendanceDb) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing attendance database:", err);
  }
}

const STUDENT_FIRST_NAMES = ["Ethan", "Marcus", "Sarah", "Sophia", "Lucas", "Elena", "Oliver", "Chloe", "Clara", "Danny", "Rory", "Amy", "Martha", "Donna", "Peter", "Ned", "Mary", "Gwen", "Harry", "Miles", "Ganke", "John", "David", "Jane", "Alice", "Bob"];
const STUDENT_LAST_NAMES = ["Carter", "Vance", "Pendelton", "Miller", "Rostova", "Thompson", "Davis", "Oswald", "Pink", "Williams", "Pond", "Jones", "Noble", "Parker", "Leeds", "Jane", "Stacy", "Osborn", "Morales", "Lee", "Watson", "Smith", "Johnson", "Brown"];

function seedTeacherData(db: AttendanceDb, teacherId: string, organizationId: string, className?: string, classCode?: string) {
  const targetClassName = className || "Grade 11 - Advanced Mathematics";
  const targetClassCode = classCode || "MATH-11A";

  const classId = `class-${teacherId}-${organizationId}-1`;

  // Check if this specific class already exists and already has over 100 students to avoid unneeded re-seeding
  const hasExistingClass = db.classes.some(
    (c) => c.id === classId && c.teacher_id === teacherId && c.organization_id === organizationId && c.name === targetClassName
  );
  const existingStudentsCount = db.students.filter((s) => s.class_id === classId).length;

  if (hasExistingClass && existingStudentsCount >= 100) {
    // Already fully seeded with 100+ students, keep existing records
    return;
  }

  // Otherwise, clear any classes for this teacher to enforce a single assigned classroom section
  db.classes = db.classes.filter(
    (c) => !(c.teacher_id === teacherId && c.organization_id === organizationId)
  );

  const newClass: DbClass = {
    id: classId,
    organization_id: organizationId,
    teacher_id: teacherId,
    name: targetClassName,
    code: targetClassCode,
  };
  db.classes.push(newClass);

  // Clear existing students for this class_id to re-seed cleanly
  db.students = db.students.filter((s) => s.class_id !== classId);

  // Generate 105 students for this class section (more than 100!)
  const studentCount = 105;
  for (let s = 1; s <= studentCount; s++) {
    const fn = STUDENT_FIRST_NAMES[Math.floor(Math.random() * STUDENT_FIRST_NAMES.length)];
    const ln = STUDENT_LAST_NAMES[Math.floor(Math.random() * STUDENT_LAST_NAMES.length)];
    const rollSuffix = String(1000 + s);
    const studentId = `student-${classId}-${s}`;
    const newStudent: DbStudent = {
      id: studentId,
      class_id: classId,
      name: `${fn} ${ln}`,
      rollNo: `ROLL-${organizationId.slice(-4).toUpperCase()}-${rollSuffix}`,
    };
    db.students.push(newStudent);
  }

  // Clear old logs and seed fresh historical logs
  db.logs = db.logs.filter((l) => l.class_id !== classId);
  const dates = ["2026-07-16", "2026-07-17"];
  dates.forEach((date) => {
    const present = 90 + Math.floor(Math.random() * 8);
    const late = Math.floor(Math.random() * 4);
    const absent = studentCount - present - late;

    const newLog: DbLog = {
      id: `log-${classId}-${date}`,
      class_id: classId,
      className: targetClassName,
      date: date,
      present: present,
      absent: absent,
      late: late,
    };
    db.logs.push(newLog);
  });

  saveDb(db);
}

// Lazy initialization of Gemini client to prevent crash on startup if key is missing
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

async function fetchRemoteClasses(token: string, teacherId: string): Promise<any[] | null> {
  if (!teacherId) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  // Probe candidates for mapping tables (rel_teacher_classes)
  const getUrls = [
    `https://abms-lkw9.onrender.com/get-teacher-classes/${teacherId}`,
    `https://abms-lkw9.onrender.com/get_teacher_classes/${teacherId}`,
    `https://abms-lkw9.onrender.com/teacher/${teacherId}/classes`,
    `https://abms-lkw9.onrender.com/classes/teacher/${teacherId}`,
    `https://abms-lkw9.onrender.com/get-teacher-classes?teacherId=${teacherId}`,
    `https://abms-lkw9.onrender.com/get_teacher_classes?teacherId=${teacherId}`,
    `https://abms-lkw9.onrender.com/get-teacher-classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/get_teacher_classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/teacher-classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/teacher_classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/rel-teacher-classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/rel_teacher_classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/classes?teacher_id=${teacherId}`,
    `https://abms-lkw9.onrender.com/classes`
  ];

  for (const url of getUrls) {
    try {
      console.log(`[Remote Classes Fetch] GET trying: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(4000)
      });

      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let classesList: any[] = [];
          if (Array.isArray(data)) {
            classesList = data;
          } else if (Array.isArray(data.classes)) {
            classesList = data.classes;
          } else if (Array.isArray(data.data)) {
            classesList = data.data;
          } else if (data.user && Array.isArray(data.user.classes)) {
            classesList = data.user.classes;
          }

          if (classesList.length > 0) {
            console.log(`[Remote Classes Fetch] GET Success from ${url} with ${classesList.length} classes`);
            return classesList;
          }
        }
      }
    } catch (e: any) {
      console.error(`[Remote Classes Fetch] GET failed for ${url}:`, e.message);
    }
  }

  // POST Candidates
  const postUrls = [
    { url: "https://abms-lkw9.onrender.com/get-teacher-classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/get_teacher_classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/teacher-classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/teacher_classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/rel-teacher-classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/rel_teacher_classes", body: { teacher_id: teacherId, teacherId } },
    { url: "https://abms-lkw9.onrender.com/classes", body: { teacher_id: teacherId, teacherId } }
  ];

  for (const item of postUrls) {
    try {
      console.log(`[Remote Classes Fetch] POST trying: ${item.url}`);
      const response = await fetch(item.url, {
        method: "POST",
        headers,
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(4000)
      });

      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let classesList: any[] = [];
          if (Array.isArray(data)) {
            classesList = data;
          } else if (Array.isArray(data.classes)) {
            classesList = data.classes;
          } else if (Array.isArray(data.data)) {
            classesList = data.data;
          }

          if (classesList.length > 0) {
            console.log(`[Remote Classes Fetch] POST Success from ${item.url} with ${classesList.length} classes`);
            return classesList;
          }
        }
      }
    } catch (e: any) {
      console.error(`[Remote Classes Fetch] POST failed for ${item.url}:`, e.message);
    }
  }

  return null;
}

async function fetchRemoteStudents(token: string, classId: string, sectionName?: string): Promise<any[] | null> {
  if (!classId) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  // Probe candidates for mapping tables (rel_student_classes) and class sections
  const getUrls = [
    `https://abms-lkw9.onrender.com/get-students-by-class/${classId}`,
    `https://abms-lkw9.onrender.com/get_students_by_class/${classId}`,
    `https://abms-lkw9.onrender.com/students/class/${classId}`,
    `https://abms-lkw9.onrender.com/get-students-by-section/${classId}`,
    `https://abms-lkw9.onrender.com/get_students_by_section/${classId}`,
    `https://abms-lkw9.onrender.com/students/section/${classId}`,
    `https://abms-lkw9.onrender.com/get-students-by-grade/${classId}`,
    `https://abms-lkw9.onrender.com/get_students_by_grade/${classId}`,
    `https://abms-lkw9.onrender.com/students?class_id=${classId}`,
    `https://abms-lkw9.onrender.com/students?section_id=${classId}`,
    `https://abms-lkw9.onrender.com/students?class_section_id=${classId}`,
    `https://abms-lkw9.onrender.com/students?grade_id=${classId}`,
    `https://abms-lkw9.onrender.com/get-students?class_id=${classId}`,
    `https://abms-lkw9.onrender.com/get_students?class_id=${classId}`,
    `https://abms-lkw9.onrender.com/rel-student-classes?class_id=${classId}`,
    `https://abms-lkw9.onrender.com/rel_student_classes?class_id=${classId}`,
    `https://abms-lkw9.onrender.com/students`
  ];

  for (const url of getUrls) {
    try {
      console.log(`[Remote Students Fetch] GET trying: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(4000)
      });

      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let studentsList: any[] = [];
          if (Array.isArray(data)) {
            studentsList = data;
          } else if (Array.isArray(data.students)) {
            studentsList = data.students;
          } else if (Array.isArray(data.data)) {
            studentsList = data.data;
          } else if (data.user && Array.isArray(data.user.students)) {
            studentsList = data.user.students;
          }

          if (studentsList.length > 0) {
            console.log(`[Remote Students Fetch] GET Success from ${url} with ${studentsList.length} students`);
            return studentsList;
          }
        }
      }
    } catch (e: any) {
      console.error(`[Remote Students Fetch] GET failed for ${url}:`, e.message);
    }
  }

  // POST Candidates
  const postUrls = [
    { url: "https://abms-lkw9.onrender.com/get-students-by-class", body: { class_id: classId, classId, section_name: sectionName } },
    { url: "https://abms-lkw9.onrender.com/get_students_by_class", body: { class_id: classId, classId, section_name: sectionName } },
    { url: "https://abms-lkw9.onrender.com/get-students-by-section", body: { section_id: classId, sectionId: classId, class_id: classId, classId } },
    { url: "https://abms-lkw9.onrender.com/get_students_by_section", body: { section_id: classId, sectionId: classId, class_id: classId, classId } },
    { url: "https://abms-lkw9.onrender.com/rel-student-classes", body: { class_id: classId, classId, section_id: classId, sectionId: classId } },
    { url: "https://abms-lkw9.onrender.com/rel_student_classes", body: { class_id: classId, classId, section_id: classId, sectionId: classId } },
    { url: "https://abms-lkw9.onrender.com/get-students", body: { class_id: classId, classId } },
    { url: "https://abms-lkw9.onrender.com/get_students", body: { class_id: classId, classId } },
    { url: "https://abms-lkw9.onrender.com/students", body: { class_id: classId, classId, section: sectionName, grade_id: classId, gradeId: classId } }
  ];

  for (const item of postUrls) {
    try {
      console.log(`[Remote Students Fetch] POST trying: ${item.url}`);
      const response = await fetch(item.url, {
        method: "POST",
        headers,
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(4000)
      });

      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let studentsList: any[] = [];
          if (Array.isArray(data)) {
            studentsList = data;
          } else if (Array.isArray(data.students)) {
            studentsList = data.students;
          } else if (Array.isArray(data.data)) {
            studentsList = data.data;
          }

          if (studentsList.length > 0) {
            console.log(`[Remote Students Fetch] POST Success from ${item.url} with ${studentsList.length} students`);
            return studentsList;
          }
        }
      }
    } catch (e: any) {
      console.error(`[Remote Students Fetch] POST failed for ${item.url}:`, e.message);
    }
  }

  return null;
}

async function saveRemoteAttendance(token: string, classId: string, date: string, records: any[]): Promise<boolean> {
  if (!records || records.length === 0) return false;

  const url = "https://abms-lkw9.onrender.com/class/attendance/add";
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  const posts = records.map(async (r) => {
    const studentId = r.studentId || r.id || r._id || r.student_id || r.studentID;
    if (!studentId) return false;
    const attended = r.status === "present" || r.status === "late" || r.attended === true;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentID: studentId,
          date: date,
          attended: attended
        }),
        signal: AbortSignal.timeout(3000)
      });
      return response.status === 200 || response.status === 201;
    } catch {
      return false;
    }
  });

  const results = await Promise.allSettled(posts);
  return results.some(res => res.status === "fulfilled" && res.value === true);
}

async function fetchRemoteSubjects(token: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  const subjectMap: Record<string, string> = {
    "6a4e597c36600ae4e2fa7f69": "English",
    "6a4e599136600ae4e2fa7f6a": "English",
    "6a4e59a236600ae4e2fa7f6b": "Mathematics",
    "6a4e5b6736600ae4e2fa7f6c": "Science",
    "6a5bb79f3d9d35508b816938": "Mathematics",
    "6a5bb7b53d9d35508b816939": "Computer",
    "6a5bb7ce3d9d35508b81693a": "Social Science",
    "6a5bb7e93d9d35508b81693b": "Alternative English",
    "6a5bb7fe3d9d35508b81693c": "Hindi",
    "6a490787487fc85fde2ef544": "Mathematics"
  };

  try {
    const response = await fetch("https://abms-lkw9.onrender.com/m/subject/retrieve", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(3500)
    });
    if (response.status === 200) {
      const data = await response.json().catch(() => null);
      if (Array.isArray(data)) {
        data.forEach((s: any) => {
          const sId = s._id || s.id || s.subject_id;
          const sName = s.subject || s.subject_name || s.name || s.title;
          if (sId && sName) {
            subjectMap[String(sId)] = String(sName);
          }
        });
      }
    }
  } catch {
    // fallback map is preserved
  }

  return subjectMap;
}

async function fetchRemoteMarks(token: string, studentId: string): Promise<any[] | null> {
  if (!studentId) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  const postUrls = [
    { url: "https://abms-lkw9.onrender.com/m/marks/retrieve", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/m_marks/retrieve", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/get-student-marks", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/get_student_marks", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/rel/studentMarks/retrieve", body: { student_id: studentId, studentId } }
  ];

  let rawList: any[] = [];

  for (const item of postUrls) {
    try {
      const response = await fetch(item.url, {
        method: "POST",
        headers,
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(3500)
      });
      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let list: any[] = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.m_marks)) list = data.m_marks;
          else if (Array.isArray(data.mMarks)) list = data.mMarks;
          else if (Array.isArray(data.marks)) list = data.marks;
          else if (Array.isArray(data.data)) list = data.data;

          if (list.length > 0) {
            rawList = list;
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (rawList.length === 0) {
    const getUrls = [
      `https://abms-lkw9.onrender.com/m_marks?student_id=${studentId}`,
      `https://abms-lkw9.onrender.com/m_marks?studentId=${studentId}`,
      `https://abms-lkw9.onrender.com/student/marks?student_id=${studentId}`
    ];

    for (const url of getUrls) {
      try {
        const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(3500) });
        if (response.status === 200) {
          const data = await response.json().catch(() => null);
          if (data) {
            let list: any[] = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.m_marks)) list = data.m_marks;
            else if (Array.isArray(data.mMarks)) list = data.mMarks;
            else if (Array.isArray(data.marks)) list = data.marks;
            else if (Array.isArray(data.data)) list = data.data;

            if (list.length > 0) {
              rawList = list;
              break;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (rawList.length === 0) return null;

  const subjectMap = await fetchRemoteSubjects(token);
  const isHexObjectId = (str: any) => typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str);

  const enrichedList = rawList.map((item: any) => {
    const subId = item.subject_id || item.subjectId || (typeof item.subject === "string" ? item.subject : "");
    const mappedName = subjectMap[String(subId)];

    let subName = "Mathematics";
    if (item.subject_name && !isHexObjectId(item.subject_name)) {
      subName = item.subject_name;
    } else if (item.subjectName && !isHexObjectId(item.subjectName)) {
      subName = item.subjectName;
    } else if (typeof item.subject === "object" && item.subject !== null) {
      subName = item.subject.subject || item.subject.subject_name || item.subject.name || "Mathematics";
    } else if (mappedName) {
      subName = mappedName;
    } else if (typeof item.subject === "string" && !isHexObjectId(item.subject)) {
      subName = item.subject;
    }

    return {
      ...item,
      subject_id: subId,
      subject_name: subName,
      subjectName: subName,
      subject: subName,
      exam_name: item.exam_name || item.examName || item.test_name || item.examination || item.term || "Term Examination",
      marks_obtained: item.marks_obtained ?? item.obtained_marks ?? item.marksObtained ?? item.mark ?? item.marks ?? item.score ?? 0,
      total_marks: item.total_marks ?? item.totalMarks ?? item.max_marks ?? item.maxMarks ?? item.out_of ?? item.total ?? 100
    };
  });

  return enrichedList;
}

async function fetchRemoteFees(token: string, studentId: string): Promise<any[] | null> {
  if (!studentId) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["Authorization"] = cleanToken;
    headers["x-auth-token"] = token;
  }

  const getUrls = [
    `https://abms-lkw9.onrender.com/get-student-fees/${studentId}`,
    `https://abms-lkw9.onrender.com/get_student_fees/${studentId}`,
    `https://abms-lkw9.onrender.com/student/${studentId}/fees`,
    `https://abms-lkw9.onrender.com/student/fees?student_id=${studentId}`,
    `https://abms-lkw9.onrender.com/student/fees?studentId=${studentId}`,
    `https://abms-lkw9.onrender.com/fees?student_id=${studentId}`,
    `https://abms-lkw9.onrender.com/fees?studentId=${studentId}`,
    `https://abms-lkw9.onrender.com/payments?student_id=${studentId}`
  ];

  for (const url of getUrls) {
    try {
      const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(3500) });
      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let list: any[] = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.fees)) list = data.fees;
          else if (Array.isArray(data.data)) list = data.data;

          if (list.length > 0) return list;
        }
      }
    } catch {
      // ignore
    }
  }

  const postUrls = [
    { url: "https://abms-lkw9.onrender.com/get-student-fees", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/get_student_fees", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/fees", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/payments", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/m/fees/retrieve", body: { student_id: studentId, studentId } },
    { url: "https://abms-lkw9.onrender.com/rel/studentFees/retrieve", body: { student_id: studentId, studentId } }
  ];

  for (const item of postUrls) {
    try {
      const response = await fetch(item.url, {
        method: "POST",
        headers,
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(3500)
      });
      if (response.status === 200) {
        const data = await response.json().catch(() => null);
        if (data) {
          let list: any[] = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.fees)) list = data.fees;
          else if (Array.isArray(data.data)) list = data.data;

          if (list.length > 0) return list;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS for Postman and external requests
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // === STUDENT MARKS AND FEES ENDPOINTS ===
  const getStudentMarksHandler = async (req: any, res: any) => {
    const query = req.query || {};
    const body = req.body || {};
    const data = { ...query, ...body };
    const token = req.headers.authorization || data.token || "";

    const rawIds = [
      data.studentId, data.student_id, data.id, data._id, data.reg_no, data.username, data.phone, data.studentIDs, data.studentID
    ].flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean).map(v => String(v).trim());

    const studentId = rawIds[0] || "";

    if (!studentId && rawIds.length === 0) {
      return res.json([]);
    }

    try {
      const remoteResult = await fetchRemoteMarks(token, studentId);
      if (remoteResult && Array.isArray(remoteResult)) {
        const cleanIds = rawIds.map(v => v.toLowerCase());
        const filtered = remoteResult.filter((item: any) => {
          const itemTokens = [
            item.student_id, item.studentId, item.student, item.reg_no, item.id, item._id
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());
          if (itemTokens.length === 0) return true;
          return cleanIds.some(id => itemTokens.includes(id));
        });
        return res.json(filtered);
      }
    } catch (err) {
      console.warn("[Marks API] Remote fetch failed, using local DB:", err);
    }

    const db = loadDb();
    const marks = getStudentMarks(db, rawIds);
    return res.json(marks);
  };

  const getStudentFeesHandler = async (req: any, res: any) => {
    const query = req.query || {};
    const body = req.body || {};
    const data = { ...query, ...body };
    const token = req.headers.authorization || data.token || "";

    const rawIds = [
      data.studentId, data.student_id, data.id, data._id, data.reg_no, data.username, data.phone, data.studentIDs, data.studentID
    ].flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean).map(v => String(v).trim());

    const studentId = rawIds[0] || "";

    if (!studentId && rawIds.length === 0) {
      return res.json([]);
    }

    try {
      const remoteResult = await fetchRemoteFees(token, studentId);
      if (remoteResult && Array.isArray(remoteResult)) {
        const cleanIds = rawIds.map(v => v.toLowerCase());
        const filtered = remoteResult.filter((item: any) => {
          const itemTokens = [
            item.student_id, item.studentId, item.student, item.reg_no, item.id, item._id
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());
          if (itemTokens.length === 0) return true;
          return cleanIds.some(id => itemTokens.includes(id));
        });
        return res.json(filtered);
      }
    } catch (err) {
      console.warn("[Fees API] Remote fetch failed, using local DB:", err);
    }

    const db = loadDb();
    const fees = getStudentFees(db, rawIds);
    return res.json(fees);
  };

  app.get("/api/student/marks", getStudentMarksHandler);
  app.post("/api/student/marks", getStudentMarksHandler);
  app.get("/api/marks", getStudentMarksHandler);
  app.post("/api/marks", getStudentMarksHandler);
  app.post("/api/m/marks/retrieve", getStudentMarksHandler);
  app.post("/api/rel/studentMarks/retrieve", getStudentMarksHandler);

  app.get("/api/student/fees", getStudentFeesHandler);
  app.post("/api/student/fees", getStudentFeesHandler);
  app.get("/api/fees", getStudentFeesHandler);
  app.post("/api/fees", getStudentFeesHandler);
  app.post("/api/m/fees/retrieve", getStudentFeesHandler);
  app.post("/api/rel/studentFees/retrieve", getStudentFeesHandler);

  // === RELATIONAL PARENT-STUDENTS ENDPOINTS (rel_parent_students) ===
  const getRelParentStudentsHandler = (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    let parentId = String(data.value || data.parent_id || data.parentId || data.id || data._id || "").trim().toLowerCase();
    
    if (data.name === "parent_id" || data.name === "parentId" || data.name === "parent") {
      parentId = String(data.value || "").trim().toLowerCase();
    }

    // Relational mapping table for parent -> student
    const relParentStudentsTable = [
      { _id: "rel-ps-1", parent_id: "p101", student_id: "S205" },
      { _id: "rel-ps-2", parent_id: "p101", student_id: "S206" },
      { _id: "rel-ps-3", parent_id: "p102", student_id: "S207" },
      { _id: "rel-ps-4", parent_id: "parent1", student_id: "S205" },
      { _id: "rel-ps-5", parent_id: "parent1", student_id: "S206" },
      { _id: "rel-ps-6", parent_id: "parent2", student_id: "S207" },
      { _id: "rel-ps-7", parent_id: "6a4d10100000000000000000", student_id: "S205" },
      { _id: "rel-ps-8", parent_id: "6a4d10100000000000000000", student_id: "S206" }
    ];

    if (!parentId) {
      return res.json([]);
    }

    const filtered = relParentStudentsTable.filter(r => r.parent_id.toLowerCase() === parentId);
    return res.json(filtered);
  };

  app.post("/api/rel/parentStudent/find", getRelParentStudentsHandler);
  app.post("/api/rel_parent_students/find", getRelParentStudentsHandler);
  app.post("/api/rel/parentStudent/retrieve", getRelParentStudentsHandler);
  app.post("/api/rel_parent_students/retrieve", getRelParentStudentsHandler);
  app.get("/api/rel/parentStudent", getRelParentStudentsHandler);
  app.get("/api/rel_parent_students", getRelParentStudentsHandler);

  // === ATTENDANCE SYSTEM API (REAL RELATIONAL BACKEND DATABASE) ===
  app.get("/api/attendance/classes", async (req, res) => {
    const { teacherId, organizationId, assignedClass, assignedClassCode, token } = req.query;
    if (!teacherId || !organizationId) {
      return res.status(400).json({ error: "teacherId and organizationId are required query parameters." });
    }

    const tId = String(teacherId);
    const orgId = String(organizationId);
    const className = assignedClass ? String(assignedClass) : undefined;
    const classCode = assignedClassCode ? String(assignedClassCode) : undefined;

    const db = loadDb();

    seedTeacherData(db, tId, orgId, className, classCode);

    // Reload DB after seeding
    const updatedDb = loadDb();
    const teacherClasses = updatedDb.classes.filter(
      (c) => c.teacher_id === tId && c.organization_id === orgId
    );

    res.json(teacherClasses);
  });

  app.get("/api/attendance/students", async (req, res) => {
    const { classId, token, sectionName } = req.query;
    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    const db = loadDb();

    // Default Fallback
    const classStudents = db.students.filter((s) => s.class_id === String(classId));
    res.json(classStudents);
  });

  app.get("/api/attendance/logs", (req, res) => {
    const { teacherId, organizationId } = req.query;
    if (!teacherId || !organizationId) {
      return res.status(400).json({ error: "teacherId and organizationId are required" });
    }

    const tId = String(teacherId);
    const orgId = String(organizationId);

    const db = loadDb();
    const teacherClassIds = db.classes
      .filter((c) => c.teacher_id === tId && c.organization_id === orgId)
      .map((c) => c.id);

    const logs = db.logs.filter((log) => teacherClassIds.includes(log.class_id));
    logs.sort((a, b) => b.date.localeCompare(a.date));

    res.json(logs);
  });

  const saveAttendanceHandler = async (req: any, res: any) => {
    const { classId, className, date, present, absent, late, token, records, skipRemote } = req.body || {};
    if (!classId || !className || !date) {
      return res.status(400).json({ error: "classId, className, and date are required" });
    }

    // Try posting to remote MongoDB backend as well if not skipped
    if (!skipRemote && records && Array.isArray(records) && records.length > 0) {
      try {
        await saveRemoteAttendance(token, classId, date, records);
      } catch (err: any) {
        console.warn("[Server Attendance Proxy] Remote save warning:", err?.message);
      }
    }

    const db = loadDb();

    // Check if an existing log should be updated
    const existingLogIndex = db.logs.findIndex(
      (l) => l.class_id === classId && l.date === date
    );

    const logEntry = {
      id: `log-${classId}-${date}-${Date.now()}`,
      class_id: classId,
      className,
      date,
      present: Number(present) || 0,
      absent: Number(absent) || 0,
      late: Number(late) || 0,
    };

    if (existingLogIndex >= 0) {
      db.logs[existingLogIndex] = {
        ...db.logs[existingLogIndex],
        present: logEntry.present,
        absent: logEntry.absent,
        late: logEntry.late,
      };
    } else {
      db.logs.push(logEntry);
    }

    // Also persist student level attendance records
    if (records && Array.isArray(records)) {
      if (!db.student_attendance) db.student_attendance = [];
      records.forEach((r: any) => {
        const sId = r.studentId || r.id || r._id || r.student_id || r.studentID;
        if (!sId) return;
        const attended = r.status === "present" || r.status === "late" || r.attended === true;
        const idx = db.student_attendance!.findIndex((a: any) => String(a.studentID) === String(sId) && a.date === date);
        const rec = { id: `att-${sId}-${date}`, studentID: String(sId), date, attended };
        if (idx >= 0) db.student_attendance![idx] = rec;
        else db.student_attendance!.push(rec);
      });
    }

    saveDb(db);

    res.json({ success: true, log: logEntry });
  };

  app.post("/api/attendance/save", saveAttendanceHandler);
  app.post("/attendance/save", saveAttendanceHandler);

  // Helper to normalize attendance status
  function parseAttendedStatus(item: any): { attended: boolean; status: "present" | "absent" | "late" } {
    if (item.isPresent === true || item.is_present === true || item.isPresent === "true" || item.is_present === "true") {
      return { attended: true, status: "present" };
    }
    if (item.isPresent === false || item.is_present === false || item.isPresent === "false" || item.is_present === "false") {
      return { attended: false, status: "absent" };
    }
    if (item.attended === true || item.attended === "true" || item.attended === 1 || item.attended === "1") {
      return { attended: true, status: "present" };
    }
    if (item.attended === false || item.attended === "false" || item.attended === 0 || item.attended === "0") {
      return { attended: false, status: "absent" };
    }
    const s = String(item.status || item.attendanceStatus || item.attendance_status || item.state || item.type || "").trim().toLowerCase();
    if (s === "present" || s === "p" || s === "attended" || s === "true" || s === "1") {
      return { attended: true, status: "present" };
    }
    if (s === "late" || s === "l") {
      return { attended: true, status: "late" };
    }
    if (s === "absent" || s === "a" || s === "false" || s === "0") {
      return { attended: false, status: "absent" };
    }
    return { attended: Boolean(item.attended ?? item.status ?? item.isPresent ?? true), status: "present" };
  }

  // Universal attendance ADD handler (supports Postman, single object, array, or wrapped payload)
  const addAttendanceHandler = (req: any, res: any) => {
    const body = req.body || {};
    const query = req.query || {};

    let itemsToProcess: any[] = [];
    if (Array.isArray(body)) {
      itemsToProcess = body;
    } else if (Array.isArray(body.records)) {
      itemsToProcess = body.records;
    } else if (Array.isArray(body.data)) {
      itemsToProcess = body.data;
    } else if (Array.isArray(body.attendance)) {
      itemsToProcess = body.attendance;
    } else if (Array.isArray(body.student_attendance)) {
      itemsToProcess = body.student_attendance;
    } else {
      itemsToProcess = [{ ...query, ...body }];
    }

    const db = loadDb();
    if (!db.student_attendance) db.student_attendance = [];

    const processed: any[] = [];

    itemsToProcess.forEach((item) => {
      const rawSId = String(
        item.studentID || item.studentId || item.student_id || item.student || item.reg_no || item.regNo || item.registrationNo || item.registration_no || item.rollNo || item.roll_no || item.roll || item.id || item._id || item.userId || item.user_id || item.user || ""
      ).trim();
      
      const sId = rawSId || "S101";

      const rawDate = item.date || item.attendanceDate || item.attendance_date || item.dateStr || item.date_str || item.day || item.createdAt || item.created_at || item.timestamp;
      const dateStr = String(rawDate || new Date().toISOString().split("T")[0]).trim().split("T")[0];

      const { attended, status } = parseAttendedStatus(item);

      const rec = {
        id: item.id || `att-${sId}-${dateStr}`,
        studentID: sId,
        studentId: sId,
        student_id: sId,
        date: dateStr,
        attendanceDate: dateStr,
        attended,
        status
      };

      const idx = db.student_attendance.findIndex((a: any) => {
        const itemTokens = [a.studentID, a.studentId, a.student_id, a.id, a._id, a.reg_no].filter(Boolean).map(v => String(v).trim().toLowerCase());
        return itemTokens.includes(sId.toLowerCase()) && String(a.date || a.attendanceDate).split("T")[0] === dateStr;
      });

      if (idx >= 0) {
        db.student_attendance[idx] = { ...db.student_attendance[idx], ...rec };
      } else {
        db.student_attendance.push(rec);
      }
      processed.push(rec);
    });

    saveDb(db);

    res.json({
      success: true,
      message: `Processed ${processed.length} attendance record(s)`,
      count: processed.length,
      records: processed.length === 1 ? processed[0] : processed,
      record: processed.length > 0 ? processed[0] : null
    });
  };

  // Universal Attendance ADD Route Aliases
  app.post("/api/class/attendance/add", addAttendanceHandler);
  app.get("/api/class/attendance/add", addAttendanceHandler);
  app.post("/class/attendance/add", addAttendanceHandler);
  app.get("/class/attendance/add", addAttendanceHandler);
  app.post("/api/attendance/add", addAttendanceHandler);
  app.get("/api/attendance/add", addAttendanceHandler);
  app.post("/attendance/add", addAttendanceHandler);
  app.get("/attendance/add", addAttendanceHandler);
  app.post("/api/attendance", addAttendanceHandler);
  app.get("/api/attendance", addAttendanceHandler);
  app.post("/attendance", addAttendanceHandler);
  app.get("/attendance", addAttendanceHandler);
  app.post("/api/class/attendance", addAttendanceHandler);
  app.get("/api/class/attendance", addAttendanceHandler);
  app.post("/class/attendance", addAttendanceHandler);
  app.get("/class/attendance", addAttendanceHandler);
  app.post("/api/student/attendance", addAttendanceHandler);
  app.get("/api/student/attendance", addAttendanceHandler);
  app.post("/student/attendance", addAttendanceHandler);
  app.get("/student/attendance", addAttendanceHandler);
  app.post("/api/student_attendance", addAttendanceHandler);
  app.get("/api/student_attendance", addAttendanceHandler);
  app.post("/student_attendance", addAttendanceHandler);
  app.get("/student_attendance", addAttendanceHandler);

  // Universal Attendance LOOKUP Handler
  const lookupStudentAttendanceHandler = (req: any, res: any) => {
    const body = req.body || {};
    const query = req.query || {};
    const data = { ...query, ...body };

    const rawIds = data.studentIDs || data.studentID || data.studentId || data.student_id || data.reg_no || data.id || data._id;
    let targetIds: string[] = [];
    if (Array.isArray(rawIds)) {
      targetIds = rawIds.map(v => String(v).trim().toLowerCase());
    } else if (rawIds !== undefined && rawIds !== null && String(rawIds).trim() !== "") {
      targetIds = [String(rawIds).trim().toLowerCase()];
    }

    const dateFilter = data.date || data.attendanceDate || data.attendance_date;
    const cleanDateFilter = dateFilter ? String(dateFilter).trim().split("T")[0] : null;

    const db = loadDb();
    const attList = db.student_attendance || [];

    let matches = attList;

    if (targetIds.length > 0) {
      matches = matches.filter((a: any) => {
        const itemTokens = [
          a.studentID, a.studentId, a.student_id, a.reg_no, a.id, a._id, a.username
        ].filter(Boolean).map(v => String(v).trim().toLowerCase());

        return targetIds.some(tId => itemTokens.includes(tId));
      });
    } else {
      matches = [];
    }

    if (cleanDateFilter) {
      matches = matches.filter((a: any) => {
        const recDate = String(a.date || a.attendanceDate || "").trim().split("T")[0];
        return recDate === cleanDateFilter;
      });
    }

    res.json(matches);
  };

  // Universal Attendance LOOKUP Route Aliases
  app.post("/api/class/attendance/lookup", lookupStudentAttendanceHandler);
  app.get("/api/class/attendance/lookup", lookupStudentAttendanceHandler);
  app.post("/class/attendance/lookup", lookupStudentAttendanceHandler);
  app.get("/class/attendance/lookup", lookupStudentAttendanceHandler);
  app.post("/api/attendance/lookup", lookupStudentAttendanceHandler);
  app.get("/api/attendance/lookup", lookupStudentAttendanceHandler);
  app.post("/attendance/lookup", lookupStudentAttendanceHandler);
  app.get("/attendance/lookup", lookupStudentAttendanceHandler);

  // Universal Attendance STUDENT_MONTH Handler
  const studentMonthAttendanceHandler = (req: any, res: any) => {
    const body = req.body || {};
    const query = req.query || {};
    const data = { ...query, ...body };

    const rawIds = data.studentIDs || data.studentID || data.studentId || data.student_id || data.reg_no || data.id || data._id;
    let targetIds: string[] = [];
    if (Array.isArray(rawIds)) {
      targetIds = rawIds.map(v => String(v).trim().toLowerCase());
    } else if (rawIds !== undefined && rawIds !== null && String(rawIds).trim() !== "") {
      targetIds = [String(rawIds).trim().toLowerCase()];
    }

    const db = loadDb();
    const attList = db.student_attendance || [];

    let matches = attList;

    if (targetIds.length > 0) {
      matches = matches.filter((a: any) => {
        const itemTokens = [
          a.studentID, a.studentId, a.student_id, a.reg_no, a.id, a._id, a.username
        ].filter(Boolean).map(v => String(v).trim().toLowerCase());
        return targetIds.some(tId => itemTokens.includes(tId));
      });
    } else {
      matches = [];
    }

    const year = data.year;
    const month = data.month;
    if (year !== undefined && month !== undefined && String(year) !== "" && String(month) !== "") {
      const monthNum = Number(month) + 1;
      const prefix = `${year}-${String(monthNum).padStart(2, '0')}`;
      matches = matches.filter((a: any) => {
        const recDate = String(a.date || a.attendanceDate || "").trim().split("T")[0];
        return recDate.startsWith(prefix);
      });
    }

    res.json(matches);
  };

  // Universal Attendance STUDENT_MONTH Route Aliases
  app.post("/api/attendance/student_month", studentMonthAttendanceHandler);
  app.get("/api/attendance/student_month", studentMonthAttendanceHandler);
  app.post("/attendance/student_month", studentMonthAttendanceHandler);
  app.get("/attendance/student_month", studentMonthAttendanceHandler);
  app.post("/api/class/attendance/student_month", studentMonthAttendanceHandler);
  app.post("/class/attendance/student_month", studentMonthAttendanceHandler);
  app.get("/api/class/attendance/student_month", studentMonthAttendanceHandler);
  app.get("/class/attendance/student_month", studentMonthAttendanceHandler);

  // API: Register a teacher leave request (local database fallback)
  app.post("/api/rel/teacherLeave/add", (req, res) => {
    const teacher_id = req.body.teacher_id || req.body.teacherId || req.body.teacherID || req.body.teacher || req.body.user_id || "T101";
    const teacher_name = req.body.teacher_name || req.body.teacherName || req.body.name || "Teacher User";
    const leave_date = req.body.leave_date || req.body.leaveDate || req.body.start_date || req.body.startDate || req.body.date || new Date().toISOString().split("T")[0];
    const end_date = req.body.end_date || req.body.endDate || req.body.to_date || req.body.toDate || leave_date;
    const leave_type = req.body.leave_type || req.body.leaveType || req.body.type || req.body.subject || "Absence Application";
    const reason = req.body.reason || req.body.description || req.body.notes || "Not specified";
    const status = req.body.status || "Pending";

    const db = loadDb();
    
    const newLeave: DbLeave = {
      id: `leave-${Date.now()}`,
      teacher_id,
      teacher_name,
      leave_date,
      end_date,
      leave_type,
      reason,
      status,
      created_at: new Date().toISOString()
    };

    if (!db.leaves) {
      db.leaves = [];
    }
    db.leaves.push(newLeave);
    saveDb(db);

    res.status(200).json({
      message: "Added successfully",
      createdRecord: newLeave
    });
  });

  // API: Get teacher leaves list (local database fallback)
  const getTeacherLeavesHandler = (req: any, res: any) => {
    const db = loadDb();
    res.json(db.leaves || []);
  };
  app.get("/api/rel/teacherLeave/retrieve", getTeacherLeavesHandler);
  app.post("/api/rel/teacherLeave/retrieve", getTeacherLeavesHandler);

  // API: Get assigned extra activity teachers list (local database fallback)
  app.post("/api/rel/extraActivityTeacher/retrieve", (req, res) => {
    const db = loadDb();
    res.json(db.extraActivityTeachers || []);
  });

  // API: Get master extra activities list (local database fallback)
  app.post("/api/m/extraActivity/retrieve", (req, res) => {
    const db = loadDb();
    res.json(db.extraActivities || []);
  });

  // API: Get organizations list (local database fallback)
  app.post("/api/m/organization/retrieve", (req, res) => {
    const db = loadDb();
    res.json(db.organizations || []);
  });

  app.post("/api/m/organization/find", (req, res) => {
    const { name, value } = req.body;
    const db = loadDb();
    const list = db.organizations || [];
    if (name && value) {
      res.json(list.filter((org: any) => org[name] === value || org._id === value || org.key === value));
    } else {
      res.json(list);
    }
  });

  // API: Get notifications (local database fallback)
  app.post("/api/m/notification/retrieve", (req, res) => {
    const db = loadDb();
    res.json(db.notifications || []);
  });

  app.post("/api/notification/retrieve", (req, res) => {
    const db = loadDb();
    res.json(db.notifications || []);
  });

  // 1. API: Generate custom superhero via Gemini API
  app.post("/api/generate-hero", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a unique superhero details based on this request or concept: "${prompt}". Return it as a JSON object adhering strictly to the schema.`,
        config: {
          systemInstruction: "You are an expert game designer and superhero writer. Create balanced, creative, and highly detailed superhero files.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full secret or public name of the hero" },
              alias: { type: Type.STRING, description: "Superhero code name / alias (e.g. Iron Man)" },
              power: { type: Type.STRING, description: "Primary signature superpower" },
              category: { 
                type: Type.STRING, 
                description: "Vibe / archetype (Tech, Cosmic, Mystic, Mutant, Science, Vigilante)" 
              },
              description: { type: Type.STRING, description: "One-sentence overview of who they are" },
              headquarters: { type: Type.STRING, description: "Their secret headquarters name (e.g. Sanctum Sanctorum)" },
              coordinates: {
                type: Type.OBJECT,
                description: "2D atlas grid coordinates on a 100x100 canvas (x from 10 to 90, y from 10 to 90)",
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER }
                },
                required: ["x", "y"]
              },
              stats: {
                type: Type.OBJECT,
                description: "Power grid statistics scaled 0-100",
                properties: {
                  durability: { type: Type.INTEGER },
                  strength: { type: Type.INTEGER },
                  speed: { type: Type.INTEGER },
                  energy: { type: Type.INTEGER },
                  intelligence: { type: Type.INTEGER },
                  combat: { type: Type.INTEGER }
                },
                required: ["durability", "strength", "speed", "energy", "intelligence", "combat"]
              },
              backstory: { type: Type.STRING, description: "Compelling 2-3 sentence lore/origin story" }
            },
            required: ["name", "alias", "power", "category", "description", "headquarters", "coordinates", "stats", "backstory"]
          }
        }
      });

      const heroText = response.text;
      if (!heroText) {
        throw new Error("No response text received from Gemini.");
      }

      const parsedHero = JSON.parse(heroText.trim());
      res.json(parsedHero);
    } catch (error: any) {
      console.error("Gemini API Error in generate-hero:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate hero.",
        details: "Ensure your GEMINI_API_KEY is configured in AI Studio Secrets settings."
      });
    }
  });

  // 2. API: App status / health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      currentTime: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
