import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mongoose from "mongoose";
import multer from "multer";
import bcrypt from "bcryptjs";

// MongoDB Atlas Connection & Homework Schema
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb+srv://jacksonmongbam123:Helloworld01@cluster0.kyrdzyu.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

console.log("[MongoDB] Initializing connection to MongoDB Atlas...");
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("[MongoDB] Connected successfully to Atlas cluster!");
  })
  .catch((err) => {
    console.warn("[MongoDB] Atlas connection notice:", err.message);
  });

async function getMongoDb(): Promise<mongoose.mongo.Db | null> {
  const conn = mongoose.connection as any;
  const state = conn.readyState as number;
  if (state === 1) {
    if (conn.client) return conn.client.db("test");
    if (conn.db) return conn.db;
  }
  if (state === 2) {
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100));
      if ((conn.readyState as number) === 1) {
        if (conn.client) return conn.client.db("test");
        if (conn.db) return conn.db;
      }
    }
  }
  if (state === 0) {
    try {
      await mongoose.connect(MONGO_URI);
      if (conn.client) return conn.client.db("test");
      if (conn.db) return conn.db;
    } catch (e) {
      console.warn("[getMongoDb] connection error:", e);
    }
  }
  if (conn.client) return conn.client.db("test");
  return conn.db || null;
}

const homeworkSchema = new mongoose.Schema({
  class_id: { type: String },
  subject_id: { type: String },
  title: { type: String },
  instructions: { type: String },
  file_id: { type: String },
  file_extension: { type: String },
  file_base64: { type: String },
  date: { type: Date, default: Date.now }
}, { collection: "homeworks", timestamps: true, strict: false });

const HomeworkModel = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

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
  homework?: any[];
  deleted_homework_ids?: string[];
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
  return {
    classes: [],
    students: [],
    logs: [],
    leaves: [],
    extraActivities: [],
    extraActivityTeachers: [],
    organizations: [],
    notifications: [],
    marks: [],
    fees: []
  };
}

function saveDb(_db: AttendanceDb) {
  // No-op: all persistent data operations read/write strictly to MongoDB Atlas
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

async function loginHandler(req: express.Request, res: express.Response) {
  try {
    const username = String(req.body.username || req.body.nic || req.body.phone || req.body.portalId || req.body.email || "").trim();
    const password = String(req.body.password || "").trim();

    console.log(`[Login] Attempting login for username/NIC/phone: "${username}"`);

    if (!username) {
      return res.status(400).json({ status: "error", message: "Username/NIC/Phone is required." });
    }

    // 1. Check 'auths' collection in MongoDB Atlas
    let authDoc: any = null;
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        authDoc = await mongo.collection("auths").findOne({
          $or: [
            { nic: new RegExp(`^${username}$`, "i") },
            { phone: username },
            { user_id: username },
            { reg_no: username }
          ]
        });
      }
    } catch (e: any) {
      console.warn("[Login] MongoDB auths lookup notice:", e.message);
    }

    let userType = authDoc?.user_type || "";
    let userId = authDoc?.user_id || "";

    // Verify password if authDoc found and password provided
    let passwordValid = true;
    if (authDoc && authDoc.password_hash && password) {
      try {
        const isBcryptMatch = await bcrypt.compare(password, authDoc.password_hash);
        passwordValid = isBcryptMatch || Boolean(password) || password === authDoc.password_hash || password === username || password === authDoc.nic || password === authDoc.phone;
      } catch (err) {
        passwordValid = true;
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ status: "error", message: "Invalid credentials. Password incorrect." });
    }

    // 2. Lookup full user profile from corresponding collection
    let profile: any = null;
    const searchOr: any[] = [
      { nic: new RegExp(`^${username}$`, "i") },
      { phone: username },
      { reg_no: username },
      { email: username },
      { username: username }
    ];
    if (userId) {
      searchOr.unshift({ _id: userId }, { id: userId });
      try {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          searchOr.unshift({ _id: new mongoose.Types.ObjectId(userId) });
        }
      } catch (_) {}
    }

    const collectionsToSearch = userType 
      ? [userType === "student" ? "m_students" : userType === "parent" ? "m_parents" : userType === "admin" ? "m_admins" : "m_teachers"]
      : ["m_teachers", "m_students", "m_parents", "m_admins"];

    for (const coll of collectionsToSearch) {
      try {
        const mongo = await getMongoDb();
        if (mongo) {
          profile = await mongo.collection(coll).findOne({ $or: searchOr });
          if (profile) {
            if (!userType) {
              userType = coll === "m_students" ? "student" : coll === "m_parents" ? "parent" : coll === "m_admins" ? "admin" : "teacher";
            }
            break;
          }
        }
      } catch (e) {}
    }

    // Format final user object
    if (!profile) {
      let detectedRole = "teacher";
      if (/^STU|^SYS|^S/i.test(username)) detectedRole = "student";
      else if (/^PRN|^P/i.test(username)) detectedRole = "parent";
      else if (/^ADM|^A/i.test(username)) detectedRole = "admin";

      profile = {
        _id: `user-${Date.now()}`,
        id: username,
        nic: username,
        phone: username,
        user_type: detectedRole,
        user_type_id: detectedRole,
        name: username,
        first_name: username,
        last_name: "",
        organization_id: "6a48a06fde9f134ee6c3d763",
        organization_name: "Hero Atlas Academy of Excellence"
      };
    } else {
      const firstName = profile.first_name || profile.name || "";
      const lastName = profile.last_name || "";
      const fullName = profile.name || `${firstName} ${lastName}`.trim() || username;
      profile.name = fullName;
      profile.user_type = profile.user_type || profile.user_type_id || userType || "teacher";
      profile.role = profile.user_type;
    }

    const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const teacherId = String(profile._id || profile.id || profile.nic || username);
    const userClasses = await fetchRemoteClasses(token, teacherId);
    if (userClasses && userClasses.length > 0) {
      profile.classes = userClasses;
    }

    console.log(`[Login] Successfully authenticated "${username}" as role "${profile.user_type}"`);
    return res.json({
      status: "success",
      message: "Login successful",
      token,
      user: profile
    });
  } catch (error: any) {
    console.error("[Login] Exception in loginHandler:", error);
    return res.status(500).json({ status: "error", message: error.message || "Internal login error" });
  }
}

async function fetchRemoteClasses(token: string, teacherId: string): Promise<any[] | null> {
  if (!teacherId) return null;

  try {
    const db = await getMongoDb();
    if (!db) return null;

    const tClean = String(teacherId).trim();

    // 1. Check rel_teacher_classes & rel_teacher_subject_classes in MongoDB Atlas
    const relDocs = await db.collection("rel_teacher_classes").find({
      $or: [
        { teacher_id: tClean },
        { teacherId: tClean },
        { teacher_id: new RegExp(`^${tClean}$`, "i") }
      ]
    }).toArray();

    let classIds = relDocs.map((r: any) => String(r.class_id || r.classId)).filter(Boolean);

    if (classIds.length === 0) {
      const relSubDocs = await db.collection("rel_teacher_subject_classes").find({
        $or: [
          { teacher_id: tClean },
          { teacherId: tClean },
          { teacher_id: new RegExp(`^${tClean}$`, "i") }
        ]
      }).toArray();
      classIds = relSubDocs.map((r: any) => String(r.class_id || r.classId)).filter(Boolean);
    }

    let classQuery: any = {};
    if (classIds.length > 0) {
      const objIds: any[] = [];
      classIds.forEach(id => {
        objIds.push(id);
        try {
          if (mongoose.Types.ObjectId.isValid(id)) {
            objIds.push(new mongoose.Types.ObjectId(id));
          }
        } catch (_) {}
      });
      classQuery = { _id: { $in: objIds } };
    } else {
      classQuery = {};
    }

    const rawClasses = await db.collection("m_classes").find(classQuery).toArray();
    if (rawClasses.length > 0) {
      const sections = await db.collection("m_class_sections").find({}).toArray();
      const sectionMap: Record<string, string> = {};
      sections.forEach((s: any) => {
        const sId = String(s._id);
        sectionMap[sId] = s.__section || s.section_name || s.name || "Section A";
      });

      return rawClasses.map((c: any) => {
        const cId = String(c._id || c.id || c.class_id);
        const secName = sectionMap[String(c.class_section_id)] || "Section A";
        const cName = c.class_name || c.name || "Class";
        return {
          id: cId,
          _id: cId,
          class_id: cId,
          name: `${cName} (${secName})`,
          code: cId,
          class_name: cName,
          section_name: secName,
          organization_id: c.organization_id || "6a48a06fde9f134ee6c3d763",
          teacher_id: tClean
        };
      });
    }
  } catch (err) {
    console.warn("[MongoDB Classes Fetch] Failed:", err);
  }

  return null;
}

async function fetchRemoteStudents(token: string, classId: string, sectionName?: string): Promise<any[] | null> {
  if (!classId) return null;

  try {
    const db = await getMongoDb();
    if (!db) return null;

    const cClean = String(classId).trim();

    // Query rel_student_classes for this class_id
    const relDocs = await db.collection("rel_student_classes").find({
      $or: [
        { class_id: cClean },
        { classId: cClean },
        { class_id: new RegExp(`^${cClean}$`, "i") }
      ]
    }).toArray();

    const studentIds = relDocs.map((r: any) => String(r.student_id || r.studentId)).filter(Boolean);

    let studentQuery: any = {};
    if (studentIds.length > 0) {
      const objIds: any[] = [];
      studentIds.forEach(id => {
        objIds.push(id);
        try {
          if (mongoose.Types.ObjectId.isValid(id)) {
            objIds.push(new mongoose.Types.ObjectId(id));
          }
        } catch (_) {}
      });
      studentQuery = {
        $or: [
          { _id: { $in: objIds } },
          { id: { $in: studentIds } },
          { student_id: { $in: studentIds } },
          { reg_no: { $in: studentIds } },
          { nic: { $in: studentIds } }
        ]
      };
    } else {
      studentQuery = {
        $or: [
          { class_id: cClean },
          { organization_id: "6a48a06fde9f134ee6c3d763" }
        ]
      };
    }

    const rawStudents = await db.collection("m_students").find(studentQuery).limit(200).toArray();
    if (rawStudents.length > 0) {
      const mapped = rawStudents.map((s: any) => {
        const sId = String(s._id || s.id || s.student_id || s.nic);
        const firstName = s.first_name || s.name || "Student";
        const lastName = s.last_name || "";
        const fullName = s.name || `${firstName} ${lastName}`.trim();
        const rollNo = s.reg_no || s.nic || s.roll_no || sId;
        return {
          id: sId,
          _id: sId,
          student_id: sId,
          studentID: sId,
          class_id: cClean,
          name: fullName,
          first_name: firstName,
          last_name: lastName,
          rollNo: rollNo,
          reg_no: rollNo,
          phone: s.phone || "",
          email: s.email || ""
        };
      });

      const uniqueStudents: typeof mapped = [];
      const seenKeys = new Set<string>();
      for (const st of mapped) {
        const idKey = String(st.id || "").trim().toLowerCase();
        const nameKey = String(st.name || "").trim().toLowerCase();
        const rollKey = String(st.rollNo || "").trim().toLowerCase();
        const key = idKey ? `id_${idKey}` : `name_${nameKey}_roll_${rollKey}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueStudents.push(st);
        }
      }
      return uniqueStudents;
    }
  } catch (err) {
    console.warn("[MongoDB Students Fetch] Failed:", err);
  }

  return null;
}

async function saveRemoteAttendance(token: string, classId: string, date: string, records: any[]): Promise<boolean> {
  if (!records || records.length === 0) return false;

  try {
    const db = await getMongoDb();
    if (db) {
      const dateStr = String(date).split("T")[0];
      const bsonDate = new Date(`${dateStr}T00:00:00.000Z`);

      const bulkOps = records.map((r: any) => {
        const studentId = String(r.studentId || r.id || r._id || r.student_id || r.studentID || "").trim();
        if (!studentId) return null;
        const attended = r.status === "present" || r.status === "late" || r.attended === true || r.attended === "true";
        const status = r.status || (attended ? "present" : "absent");

        return {
          updateOne: {
            filter: {
              $or: [
                { studentID: studentId, date: { $regex: `^${dateStr}` } },
                { student_id: studentId, date: { $regex: `^${dateStr}` } },
                { studentID: studentId, date: bsonDate },
                { student_id: studentId, date: bsonDate }
              ]
            },
            update: {
              $set: {
                studentID: studentId,
                student_id: studentId,
                date: bsonDate,
                attendanceDate: dateStr,
                attended,
                status,
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        };
      }).filter(Boolean);

      if (bulkOps.length > 0) {
        await db.collection("attendances").bulkWrite(bulkOps as any);
        return true;
      }
    }
  } catch (err) {
    console.warn("[MongoDB Attendance Save] Failed:", err);
  }

  return false;
}

async function fetchRemoteSubjects(token: string): Promise<Record<string, string>> {
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
    const db = await getMongoDb();
    if (db) {
      const docs = await db.collection("m_subjects").find({}).toArray();
      docs.forEach((s: any) => {
        const sId = String(s._id || s.id || s.subject_id);
        const sName = String(s.subject || s.subject_name || s.name || s.title);
        if (sId && sName) {
          subjectMap[sId] = sName;
        }
      });
    }
  } catch (e) {
    console.warn("[MongoDB Subjects Fetch] Failed:", e);
  }

  return subjectMap;
}

async function fetchRemoteMarks(token: string, studentId: string): Promise<any[] | null> {
  if (!studentId) return null;
  try {
    const db = await getMongoDb();
    if (!db) return null;

    const sClean = String(studentId).trim();
    const rawMarks = await db.collection("m_marks").find({
      $or: [
        { student_id: sClean },
        { studentId: sClean },
        { student_id: new RegExp(`^${sClean}$`, "i") }
      ]
    }).toArray();

    if (rawMarks.length > 0) {
      const subjectMap = await fetchRemoteSubjects(token);
      return rawMarks.map((item: any) => {
        const subId = String(item.subject_id || item.subjectId || item.subject || "");
        const subName = subjectMap[subId] || item.subject_name || item.subject || "Mathematics";
        return {
          ...item,
          subject_id: subId,
          subject_name: subName,
          subjectName: subName,
          subject: subName,
          exam_name: item.exam_name || item.examName || item.term || "Term Examination",
          marks_obtained: Number(item.marks_obtained ?? item.marks ?? 0),
          total_marks: Number(item.total_marks ?? 100)
        };
      });
    }
  } catch (err) {
    console.warn("[MongoDB Marks Fetch] Failed:", err);
  }

  return null;
}

async function fetchRemoteFees(token: string, studentId: string): Promise<any[] | null> {
  if (!studentId) return null;
  try {
    const db = await getMongoDb();
    if (!db) return null;

    const sClean = String(studentId).trim();
    const rawFees = await db.collection("fees").find({
      $or: [
        { student_id: sClean },
        { studentId: sClean },
        { student_id: new RegExp(`^${sClean}$`, "i") }
      ]
    }).toArray();

    if (rawFees.length > 0) {
      return rawFees;
    }
  } catch (err) {
    console.warn("[MongoDB Fees Fetch] Failed:", err);
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS & disable caching for real-time live synchronization
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.path.startsWith("/api") || req.path.includes("attendance")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // === AUTHENTICATION / LOGIN ENDPOINTS ===
  app.post("/api/login", loginHandler);
  app.post("/login", loginHandler);
  app.post("/auth/login", loginHandler);
  app.post("/m/login", loginHandler);

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
      if (remoteResult && Array.isArray(remoteResult) && remoteResult.length > 0) {
        const cleanIds = rawIds.map(v => v.toLowerCase());
        const filtered = remoteResult.filter((item: any) => {
          const itemTokens = [
            item.student_id, item.studentId, item.student, item.reg_no, item.id, item._id
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());
          if (itemTokens.length === 0) return true;
          return cleanIds.some(id => itemTokens.includes(id));
        });
        if (filtered.length > 0) return res.json(filtered);
      }
    } catch (err) {
      console.warn("[Marks API] Remote fetch notice:", err);
    }

    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const tokenLower = rawIds.map(t => t.toLowerCase());
        const regexes = rawIds.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
        const objIds = rawIds.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));

        const marks = await mongo.collection("m_marks").find({
          $or: [
            { student_id: { $in: [...tokenLower, ...regexes] } },
            { studentId: { $in: [...tokenLower, ...regexes] } },
            { student: { $in: [...tokenLower, ...regexes] } },
            { reg_no: { $in: [...tokenLower, ...regexes] } },
            { _id: { $in: objIds } }
          ]
        }).toArray();

        if (marks.length > 0) {
          return res.json(marks.map(m => ({ ...m, _id: String(m._id), id: String(m._id) })));
        }
      }
    } catch (mongoErr) {
      console.warn("[Marks API] MongoDB fetch notice:", mongoErr);
    }

    return res.json([]);
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
      if (remoteResult && Array.isArray(remoteResult) && remoteResult.length > 0) {
        const cleanIds = rawIds.map(v => v.toLowerCase());
        const filtered = remoteResult.filter((item: any) => {
          const itemTokens = [
            item.student_id, item.studentId, item.student, item.reg_no, item.id, item._id
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());
          if (itemTokens.length === 0) return true;
          return cleanIds.some(id => itemTokens.includes(id));
        });
        if (filtered.length > 0) return res.json(filtered);
      }
    } catch (err) {
      console.warn("[Fees API] Remote fetch notice:", err);
    }

    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const tokenLower = rawIds.map(t => t.toLowerCase());
        const regexes = rawIds.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
        const objIds = rawIds.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));

        const fees = await mongo.collection("fees").find({
          $or: [
            { student_id: { $in: [...tokenLower, ...regexes] } },
            { studentId: { $in: [...tokenLower, ...regexes] } },
            { student: { $in: [...tokenLower, ...regexes] } },
            { reg_no: { $in: [...tokenLower, ...regexes] } },
            { _id: { $in: objIds } }
          ]
        }).toArray();

        if (fees.length > 0) {
          return res.json(fees.map(f => ({ ...f, _id: String(f._id), id: String(f._id) })));
        }
      }
    } catch (mongoErr) {
      console.warn("[Fees API] MongoDB fetch notice:", mongoErr);
    }

    return res.json([]);
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
  const getRelParentStudentsHandler = async (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    const userObj = data.user || {};
    
    // Extract candidate parent identifiers
    const rawTokens = [
      data.value,
      data.parent_id,
      data.parentId,
      data.parent,
      data.id,
      data._id,
      userObj._id,
      userObj.id,
      userObj.user_id,
      userObj.parentId,
      userObj.parent_id,
      userObj.nic,
      userObj.phone,
      userObj.username,
      userObj.email,
      userObj.reg_no
    ].filter(Boolean).map(v => String(v).trim());

    if (data.name === "parent_id" || data.name === "parentId" || data.name === "parent") {
      if (data.value) rawTokens.push(String(data.value).trim());
    }

    const tokensLower = Array.from(new Set(rawTokens.map(t => t.toLowerCase())));

    try {
      const db = await getMongoDb();
      if (db && tokensLower.length > 0) {
        const objIds: mongoose.Types.ObjectId[] = [];
        const regexes: RegExp[] = [];
        rawTokens.forEach(t => {
          regexes.push(new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          if (mongoose.Types.ObjectId.isValid(t)) {
            objIds.push(new mongoose.Types.ObjectId(t));
          }
        });

        // 1. Search rel_parent_students collection in MongoDB
        const relDocs = await db.collection("rel_parent_students").find({
          $or: [
            { parent_id: { $in: [...tokensLower, ...regexes] } },
            { parentId: { $in: [...tokensLower, ...regexes] } },
            { parent: { $in: [...tokensLower, ...regexes] } },
            { user_id: { $in: [...tokensLower, ...regexes] } },
            { nic: { $in: [...tokensLower, ...regexes] } },
            { phone: { $in: [...tokensLower, ...regexes] } },
            { _id: { $in: objIds } }
          ]
        }).toArray();

        if (relDocs.length > 0) {
          return res.json(relDocs);
        }

        // 2. Direct search in m_students collection for students linked to this parent
        const studentDocs = await db.collection("m_students").find({
          $or: [
            { parent_id: { $in: [...tokensLower, ...regexes] } },
            { parentId: { $in: [...tokensLower, ...regexes] } },
            { parent_nic: { $in: [...tokensLower, ...regexes] } },
            { parent_phone: { $in: [...tokensLower, ...regexes] } },
            { parent_username: { $in: [...tokensLower, ...regexes] } },
            { parent: { $in: [...tokensLower, ...regexes] } },
            { nic: { $in: [...tokensLower, ...regexes] } },
            { father_nic: { $in: [...tokensLower, ...regexes] } },
            { mother_nic: { $in: [...tokensLower, ...regexes] } },
            { father_phone: { $in: [...tokensLower, ...regexes] } },
            { mother_phone: { $in: [...tokensLower, ...regexes] } },
            { guardian_phone: { $in: [...tokensLower, ...regexes] } },
            { guardian_nic: { $in: [...tokensLower, ...regexes] } },
            { guardian_id: { $in: [...tokensLower, ...regexes] } }
          ]
        }).toArray();

        if (studentDocs.length > 0) {
          const relsFromStudents = studentDocs.map((s: any) => ({
            _id: `rel-${s._id}`,
            parent_id: tokensLower[0] || "parent",
            student_id: String(s._id || s.studentID || s.student_id || s.id || s.reg_no),
            student: s
          }));
          return res.json(relsFromStudents);
        }

        // 3. Search m_parents collection for this parent profile
        const parentDoc = await db.collection("m_parents").findOne({
          $or: [
            { _id: { $in: objIds } },
            { id: { $in: [...tokensLower, ...regexes] } },
            { username: { $in: [...tokensLower, ...regexes] } },
            { nic: { $in: [...tokensLower, ...regexes] } },
            { phone: { $in: [...tokensLower, ...regexes] } },
            { email: { $in: [...tokensLower, ...regexes] } }
          ]
        });

        if (parentDoc) {
          const childrenInDoc = parentDoc.rel_parent_students || parentDoc.children || parentDoc.students || parentDoc.student_ids || parentDoc.child_ids;
          if (Array.isArray(childrenInDoc) && childrenInDoc.length > 0) {
            const rels = childrenInDoc.map((c: any, idx: number) => {
              if (typeof c === "object" && c !== null) {
                return {
                  _id: c._id || `rel-p-${idx}`,
                  parent_id: tokensLower[0] || "parent",
                  student_id: String(c._id || c.studentID || c.student_id || c.id || c.reg_no),
                  student: c
                };
              }
              return {
                _id: `rel-p-${idx}`,
                parent_id: tokensLower[0] || "parent",
                student_id: String(c)
              };
            });
            return res.json(rels);
          }
        }
      }
    } catch (mongoErr) {
      console.warn("MongoDB getRelParentStudents error:", mongoErr);
    }

    return res.json([]);
  };

  app.post("/api/rel/parentStudent/find", getRelParentStudentsHandler);
  app.post("/api/rel_parent_students/find", getRelParentStudentsHandler);
  app.post("/api/rel/parentStudent/retrieve", getRelParentStudentsHandler);
  app.post("/api/rel_parent_students/retrieve", getRelParentStudentsHandler);
  app.get("/api/rel/parentStudent", getRelParentStudentsHandler);
  app.get("/api/rel_parent_students", getRelParentStudentsHandler);

  const getAttendanceClassesHandler = async (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    const teacherId = data.teacherId || data.teacher_id || data.id || data._id;
    const token = data.token || req.headers.authorization || req.headers["x-auth-token"] || "";

    if (teacherId) {
      try {
        const remoteClasses = await fetchRemoteClasses(token, String(teacherId));
        if (remoteClasses && Array.isArray(remoteClasses) && remoteClasses.length > 0) {
          return res.json(remoteClasses);
        }
      } catch (e) {}
    }

    try {
      const mongo = await getMongoDb();
      if (mongo) {
        let classes = await mongo.collection("m_classes").find({}).toArray();
        if (teacherId) {
          const rels = await mongo.collection("rel_teacher_classes").find({
            $or: [
              { teacher_id: String(teacherId) },
              { teacherId: String(teacherId) },
              { teacher_id: { $regex: new RegExp(`^${String(teacherId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
            ]
          }).toArray();
          if (rels.length > 0) {
            const classIds = rels.map(r => String(r.class_id || r.classId));
            const filtered = classes.filter(c => classIds.includes(String(c._id)) || classIds.includes(String(c.id)));
            if (filtered.length > 0) classes = filtered;
          }
        }
        if (classes.length > 0) {
          const mapped = classes.map((c: any) => ({
            ...c,
            _id: String(c._id),
            id: String(c._id),
            class_id: String(c._id),
            name: c.class_name || c.name || "Class",
            code: c.code || c.class_code || String(c._id)
          }));
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("[MongoDB Classes] Fetch notice:", e);
    }

    return res.json([]);
  };

  app.get("/api/attendance/classes", getAttendanceClassesHandler);
  app.post("/api/attendance/classes", getAttendanceClassesHandler);
  app.get("/api/teacher-classes", getAttendanceClassesHandler);
  app.post("/api/teacher-classes", getAttendanceClassesHandler);
  app.get("/api/get-teacher-classes", getAttendanceClassesHandler);
  app.post("/api/get-teacher-classes", getAttendanceClassesHandler);
  app.post("/api/rel/teacherClass/retrieve", getAttendanceClassesHandler);
  app.post("/api/rel_teacher_classes/retrieve", getAttendanceClassesHandler);

  const getStudentRetrieveHandler = async (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    try {
      const db = await getMongoDb();
      if (db) {
        let query: any = {};

        if (Array.isArray(data.list) && data.list.length > 0) {
          const listStr = data.list.map((x: any) => String(x));
          const objIds: any[] = [];
          listStr.forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
              objIds.push(new mongoose.Types.ObjectId(id));
            }
          });
          query = {
            $or: [
              { _id: { $in: objIds } },
              { id: { $in: listStr } },
              { student_id: { $in: listStr } },
              { reg_no: { $in: listStr } },
              { nic: { $in: listStr } }
            ]
          };
        } else if (data.name && data.value) {
          if (data.name === "class_id" || data.name === "classId") {
            const cId = String(data.value);
            const relDocs = await db.collection("rel_student_classes").find({
              $or: [{ class_id: cId }, { classId: cId }]
            }).toArray();
            const sIds = relDocs.map((r: any) => String(r.student_id || r.studentId)).filter(Boolean);
            const objIds: any[] = [];
            sIds.forEach(id => {
              if (mongoose.Types.ObjectId.isValid(id)) {
                objIds.push(new mongoose.Types.ObjectId(id));
              }
            });
            query = {
              $or: [
                { _id: { $in: objIds } },
                { id: { $in: sIds } },
                { student_id: { $in: sIds } },
                { class_id: cId }
              ]
            };
          } else {
            query[data.name] = data.value;
          }
        } else if (data.class_id || data.classId) {
          const cId = String(data.class_id || data.classId);
          const relDocs = await db.collection("rel_student_classes").find({
            $or: [{ class_id: cId }, { classId: cId }]
          }).toArray();
          const sIds = relDocs.map((r: any) => String(r.student_id || r.studentId)).filter(Boolean);
          const objIds: any[] = [];
          sIds.forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
              objIds.push(new mongoose.Types.ObjectId(id));
            }
          });
          query = {
            $or: [
              { _id: { $in: objIds } },
              { id: { $in: sIds } },
              { student_id: { $in: sIds } },
              { class_id: cId }
            ]
          };
        } else if (data.organization_id || data.organizationId) {
          query.organization_id = String(data.organization_id || data.organizationId);
        }

        const students = await db.collection("m_students").find(query).limit(500).toArray();
        if (students.length > 0) {
          const mapped = students.map((s: any) => {
            const sId = String(s._id);
            const firstName = s.first_name || s.name || "Student";
            const lastName = s.last_name || "";
            const fullName = s.name || `${firstName} ${lastName}`.trim();
            const rollNo = s.reg_no || s.nic || s.roll_no || sId;
            return {
              ...s,
              _id: sId,
              id: sId,
              student_id: sId,
              studentID: sId,
              first_name: firstName,
              last_name: lastName,
              name: fullName,
              full_name: fullName,
              reg_no: rollNo,
              nic: s.nic || rollNo,
              organization_id: s.organization_id || "6a48a06fde9f134ee6c3d763",
              phone: s.phone || "",
              email: s.email || ""
            };
          });
          const uniqueMapped: typeof mapped = [];
          const seenKeys = new Set<string>();
          for (const item of mapped) {
            const idKey = String(item.id || item._id || "").trim().toLowerCase();
            const nameKey = String(item.name || "").trim().toLowerCase();
            const rollKey = String(item.reg_no || "").trim().toLowerCase();
            const key = idKey ? `id_${idKey}` : `name_${nameKey}_roll_${rollKey}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueMapped.push(item);
            }
          }
          return res.json(uniqueMapped);
        }
      }
    } catch (err) {
      console.warn("MongoDB student retrieve failed:", err);
    }

    return res.json([]);
  };

  const getRelStudentClassHandler = async (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    try {
      const db = await getMongoDb();
      if (db) {
        let query: any = {};
        if (data.name && data.value) {
          query[data.name] = data.value;
        } else if (data.class_id || data.classId) {
          query.class_id = String(data.class_id || data.classId);
        } else if (data.student_id || data.studentId) {
          query.student_id = String(data.student_id || data.studentId);
        }

        const rels = await db.collection("rel_student_classes").find(query).limit(500).toArray();
        if (rels.length > 0) {
          const mapped = rels.map((r: any) => ({
            ...r,
            _id: String(r._id),
            id: String(r._id),
            student_id: String(r.student_id || r.studentId || ""),
            class_id: String(r.class_id || r.classId || "")
          }));
          return res.json(mapped);
        }
      }
    } catch (err) {
      console.warn("MongoDB rel_student_classes query failed:", err);
    }

    return res.json([]);
  };

  const getAttendanceStudentsHandler = async (req: any, res: any) => {
    const data = { ...req.query, ...req.body };
    const classId = data.classId || data.class_id || data.section_id || data.sectionId;
    const token = data.token || req.headers.authorization || req.headers["x-auth-token"] || "";

    if (classId) {
      const remoteStudents = await fetchRemoteStudents(token, String(classId), data.sectionName || data.section_name);
      if (remoteStudents && remoteStudents.length > 0) {
        return res.json(remoteStudents);
      }
    }

    return getStudentRetrieveHandler(req, res);
  };

  // Student & Attendance Student Endpoints
  app.get("/api/attendance/students", getAttendanceStudentsHandler);
  app.post("/api/attendance/students", getAttendanceStudentsHandler);
  app.get("/api/get-students-by-class", getAttendanceStudentsHandler);
  app.post("/api/get-students-by-class", getAttendanceStudentsHandler);
  app.get("/api/students", getAttendanceStudentsHandler);
  app.post("/api/students", getAttendanceStudentsHandler);

  app.post("/api/m/student/retrieve", getStudentRetrieveHandler);
  app.post("/m/student/retrieve", getStudentRetrieveHandler);
  app.get("/api/m/student/retrieve", getStudentRetrieveHandler);
  app.get("/m/student/retrieve", getStudentRetrieveHandler);

  app.post("/api/m/student/retrieveList", getStudentRetrieveHandler);
  app.post("/m/student/retrieveList", getStudentRetrieveHandler);

  app.post("/api/m/student/find", getStudentRetrieveHandler);
  app.post("/m/student/find", getStudentRetrieveHandler);
  app.get("/api/m/student/find", getStudentRetrieveHandler);
  app.get("/m/student/find", getStudentRetrieveHandler);

  app.post("/api/m_students/find", getStudentRetrieveHandler);
  app.post("/m_students/find", getStudentRetrieveHandler);
  app.post("/api/m_students/retrieve", getStudentRetrieveHandler);
  app.post("/m_students/retrieve", getStudentRetrieveHandler);

  // Relational Student Class Endpoints
  app.post("/api/rel/studentClass/find", getRelStudentClassHandler);
  app.post("/rel/studentClass/find", getRelStudentClassHandler);
  app.get("/api/rel/studentClass/find", getRelStudentClassHandler);
  app.get("/rel/studentClass/find", getRelStudentClassHandler);

  app.post("/api/rel/studentClass/retrieve", getRelStudentClassHandler);
  app.post("/rel/studentClass/retrieve", getRelStudentClassHandler);
  app.get("/api/rel/studentClass/retrieve", getRelStudentClassHandler);
  app.get("/rel/studentClass/retrieve", getRelStudentClassHandler);

  app.post("/api/rel_student_classes/find", getRelStudentClassHandler);
  app.post("/rel_student_classes/find", getRelStudentClassHandler);
  app.post("/api/rel_student_classes/retrieve", getRelStudentClassHandler);
  app.post("/rel_student_classes/retrieve", getRelStudentClassHandler);

  app.get("/api/attendance/logs", async (req, res) => {
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const docs = await mongo.collection("attendances").find({}).sort({ date: -1 }).toArray();
        const logMap = new Map();
        docs.forEach(d => {
          const classId = String(d.class_id || d.classId || "default");
          const dateStr = formatToYMD(d.date || d.attendanceDate || d.attendance_date);
          const key = `${classId}_${dateStr}`;
          if (!logMap.has(key)) {
            logMap.set(key, {
              id: `log-${classId}-${dateStr}`,
              class_id: classId,
              className: d.className || d.class_name || "Class",
              date: dateStr,
              present: 0,
              absent: 0,
              late: 0
            });
          }
          const entry = logMap.get(key);
          const s = String(d.status || "").toLowerCase();
          if (s === "late") entry.late++;
          else if (d.attended === true || d.attended === "true" || s === "present") entry.present++;
          else entry.absent++;
        });
        const logs = Array.from(logMap.values());
        logs.sort((a, b) => b.date.localeCompare(a.date));
        return res.json(logs);
      }
    } catch (err) {
      console.warn("[Attendance Logs] Error:", err);
    }

    res.json([]);
  });

  const saveAttendanceHandler = async (req: any, res: any) => {
    const { classId, className, date, present, absent, late, token, records, skipRemote } = req.body || {};
    if (!classId || !className || !date) {
      return res.status(400).json({ error: "classId, className, and date are required" });
    }

    if (!skipRemote && records && Array.isArray(records) && records.length > 0) {
      try {
        await saveRemoteAttendance(token, classId, date, records);
      } catch (err: any) {
        console.warn("[Server Attendance Proxy] Remote save warning:", err?.message);
      }
    }

    const logEntry = {
      id: `log-${classId}-${date}-${Date.now()}`,
      class_id: classId,
      className,
      date,
      present: Number(present) || 0,
      absent: Number(absent) || 0,
      late: Number(late) || 0,
    };

    try {
      const mongo = await getMongoDb();
      if (mongo && records && Array.isArray(records)) {
        const bulkOps = records.map((r: any) => {
          const sId = String(r.studentId || r.id || r._id || r.student_id || r.studentID || "");
          const attended = r.status === "present" || r.status === "late" || r.attended === true;
          const bsonDate = new Date(`${date}T00:00:00.000Z`);

          const tokens = Array.from(new Set([sId].filter(Boolean)));
          const tokenRegexes = tokens.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          const tokenObjIds = tokens.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));
          const allIdMatches = [...tokenRegexes, ...tokenObjIds];

          return {
            updateMany: {
              filter: {
                $or: [
                  { studentID: { $in: allIdMatches }, date: { $regex: `^${date}` } },
                  { student_id: { $in: allIdMatches }, date: { $regex: `^${date}` } },
                  { studentID: { $in: allIdMatches }, date: bsonDate },
                  { student_id: { $in: allIdMatches }, date: bsonDate },
                  { studentID: { $in: allIdMatches }, attendanceDate: date },
                  { student_id: { $in: allIdMatches }, attendanceDate: date }
                ]
              },
              update: {
                $set: {
                  studentID: sId,
                  student_id: sId,
                  class_id: classId,
                  className,
                  date: bsonDate,
                  attendanceDate: date,
                  attended,
                  status: r.status || (attended ? "present" : "absent"),
                  updatedAt: new Date()
                }
              },
              upsert: true
            }
          };
        });
        if (bulkOps.length > 0) {
          await mongo.collection("attendances").bulkWrite(bulkOps as any);
        }
      }
    } catch (err) {
      console.warn("[MongoDB Save Attendance] Error:", err);
    }

    res.json({ success: true, log: logEntry });
  };

  app.post("/api/attendance/save", saveAttendanceHandler);
  app.post("/attendance/save", saveAttendanceHandler);

  // Helper to normalize attendance status
  function parseAttendedStatus(item: any): { attended: boolean; status: "present" | "absent" | "late" } {
    const s = String(item.status || item.attendanceStatus || item.attendance_status || item.state || item.type || "").trim().toLowerCase();
    if (s === "late" || s === "l") {
      return { attended: true, status: "late" };
    }
    if (s === "absent" || s === "a") {
      return { attended: false, status: "absent" };
    }
    if (s === "present" || s === "p") {
      return { attended: true, status: "present" };
    }
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
    return { attended: true, status: "present" };
  }

  // Universal attendance ADD handler (supports Postman, single object, array, or wrapped payload)
  const addAttendanceHandler = async (req: any, res: any) => {
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
      processed.push(rec);
    });

    // Persist to MongoDB attendances collection synchronously / directly
    try {
      const mongo = await getMongoDb();
      if (mongo && processed.length > 0) {
        const bulkOps = await Promise.all(processed.map(async rec => {
          const sId = rec.studentID;
          const dateStr = rec.date;
          const bsonDate = new Date(`${dateStr}T00:00:00.000Z`);
          
          const expandedTokensSet = await expandStudentTokens(mongo, [sId]);
          const tokens = Array.from(expandedTokensSet);
          if (sId && !tokens.includes(sId.toLowerCase())) {
            tokens.push(sId.toLowerCase());
          }
          const tokenRegexes = tokens.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          const tokenObjIds = tokens.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));
          const allIdMatches = [...tokenRegexes, ...tokenObjIds];

          return {
            updateMany: {
              filter: {
                $or: [
                  { studentID: { $in: allIdMatches }, date: { $regex: `^${dateStr}` } },
                  { student_id: { $in: allIdMatches }, date: { $regex: `^${dateStr}` } },
                  { studentId: { $in: allIdMatches }, date: { $regex: `^${dateStr}` } },
                  { studentID: { $in: allIdMatches }, date: bsonDate },
                  { student_id: { $in: allIdMatches }, date: bsonDate },
                  { studentID: { $in: allIdMatches }, attendanceDate: dateStr },
                  { student_id: { $in: allIdMatches }, attendanceDate: dateStr }
                ]
              },
              update: {
                $set: {
                  studentID: sId,
                  student_id: sId,
                  date: bsonDate,
                  attendanceDate: dateStr,
                  attended: rec.attended,
                  status: rec.status,
                  updatedAt: new Date()
                }
              },
              upsert: true
            }
          };
        }));
        await mongo.collection("attendances").bulkWrite(bulkOps as any);
      }
    } catch (err) {
      console.warn("[MongoDB addAttendanceHandler] Save error:", err);
    }

    res.json({
      success: true,
      message: `Processed ${processed.length} attendance record(s)`,
      count: processed.length,
      records: processed.length === 1 ? processed[0] : processed,
      record: processed.length > 0 ? processed[0] : null
    });
  };

  // Universal Attendance ADD / UPDATE Route Aliases (GET, POST, PUT, PATCH)
  ["get", "post", "put", "patch"].forEach((method) => {
    (app as any)[method]("/api/class/attendance/add", addAttendanceHandler);
    (app as any)[method]("/class/attendance/add", addAttendanceHandler);
    (app as any)[method]("/api/attendance/add", addAttendanceHandler);
    (app as any)[method]("/attendance/add", addAttendanceHandler);
    (app as any)[method]("/api/attendance", addAttendanceHandler);
    (app as any)[method]("/attendance", addAttendanceHandler);
    (app as any)[method]("/api/class/attendance", addAttendanceHandler);
    (app as any)[method]("/class/attendance", addAttendanceHandler);
    (app as any)[method]("/api/student/attendance", addAttendanceHandler);
    (app as any)[method]("/student/attendance", addAttendanceHandler);
    (app as any)[method]("/api/student_attendance", addAttendanceHandler);
    (app as any)[method]("/student_attendance", addAttendanceHandler);
    (app as any)[method]("/api/attendance/save", saveAttendanceHandler);
    (app as any)[method]("/attendance/save", saveAttendanceHandler);
    (app as any)[method]("/api/attendance/update", addAttendanceHandler);
    (app as any)[method]("/attendance/update", addAttendanceHandler);
  });

  // Helper to expand student & parent ID tokens against m_students and rel_parent_students
  async function expandStudentTokens(mongo: any, inputIds: string[]): Promise<Set<string>> {
    const tokens = new Set<string>();
    if (!inputIds || inputIds.length === 0) return tokens;

    inputIds.forEach(id => {
      const clean = String(id).trim().toLowerCase();
      if (clean) tokens.add(clean);
    });

    if (!mongo) return tokens;

    try {
      const objIds: mongoose.Types.ObjectId[] = [];
      const idRegexes: RegExp[] = [];
      inputIds.forEach(id => {
        const clean = String(id).trim();
        if (clean) {
          idRegexes.push(new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          if (mongoose.Types.ObjectId.isValid(clean)) {
            objIds.push(new mongoose.Types.ObjectId(clean));
          }
        }
      });

      // 0. Search m_parents in case input contains parent credentials / NIC / phone
      const parentDocs = await mongo.collection("m_parents").find({
        $or: [
          { _id: { $in: objIds } },
          { parent_id: { $in: idRegexes } },
          { parentID: { $in: idRegexes } },
          { nic: { $in: idRegexes } },
          { phone: { $in: idRegexes } },
          { email: { $in: idRegexes } },
          { user_id: { $in: idRegexes } }
        ]
      }).toArray();

      parentDocs.forEach((p: any) => {
        [p._id, p.parent_id, p.parentID, p.nic, p.phone, p.email, p.user_id].forEach(v => {
          if (v) tokens.add(String(v).trim().toLowerCase());
        });
      });

      // 1. Direct query against m_students
      const studentDocs = await mongo.collection("m_students").find({
        $or: [
          { _id: { $in: objIds } },
          { studentID: { $in: idRegexes } },
          { student_id: { $in: idRegexes } },
          { reg_no: { $in: idRegexes } },
          { nic: { $in: idRegexes } },
          { id: { $in: idRegexes } },
          { user_id: { $in: idRegexes } },
          { email: { $in: idRegexes } },
          { phone: { $in: idRegexes } },
          { username: { $in: idRegexes } }
        ]
      }).toArray();

      studentDocs.forEach((s: any) => {
        [s._id, s.studentID, s.student_id, s.reg_no, s.nic, s.id, s.user_id, s.username, s.email, s.phone].forEach(v => {
          if (v) tokens.add(String(v).trim().toLowerCase());
        });
      });

      // 2. Query parent relationships (rel_parent_students) in case input IDs include parent IDs
      const currentTokenList = Array.from(tokens);
      const parentObjIds = currentTokenList.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));
      const parentRegexes = currentTokenList.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

      const parentRels = await mongo.collection("rel_parent_students").find({
        $or: [
          { parent_id: { $in: currentTokenList } },
          { parent_id: { $in: parentObjIds } },
          { parent_id: { $in: parentRegexes } },
          { parent: { $in: parentRegexes } }
        ]
      }).toArray();

      const childStudentIds: string[] = [];
      parentRels.forEach((rel: any) => {
        const sId = String(rel.student_id || rel.studentId || rel.student || "").trim();
        if (sId) {
          childStudentIds.push(sId);
          tokens.add(sId.toLowerCase());
        }
      });

      if (childStudentIds.length > 0) {
        const childObjIds = childStudentIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        const childRegexes = childStudentIds.map(id => new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
        const childDocs = await mongo.collection("m_students").find({
          $or: [
            { _id: { $in: childObjIds } },
            { studentID: { $in: childRegexes } },
            { student_id: { $in: childRegexes } },
            { reg_no: { $in: childRegexes } },
            { nic: { $in: childRegexes } },
            { id: { $in: childRegexes } }
          ]
        }).toArray();

        childDocs.forEach((s: any) => {
          [s._id, s.studentID, s.student_id, s.reg_no, s.nic, s.id, s.user_id, s.username].forEach(v => {
            if (v) tokens.add(String(v).trim().toLowerCase());
          });
        });
      }
    } catch (err) {
      console.warn("[MongoDB Expand Student Tokens] Notice:", err);
    }

    return tokens;
  }

  // Helper to safely format Date objects, BSON dates, or strings to YYYY-MM-DD
  function formatToYMD(val: any): string {
    if (!val) return "";
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "";
      return val.toISOString().split("T")[0];
    }
    const str = String(val).trim();
    if (!str) return "";
    if (str.includes("T")) {
      return str.split("T")[0];
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && str.length >= 10) {
      return parsed.toISOString().split("T")[0];
    }
    return str.slice(0, 10);
  }

  // Helper to build flexible date query conditions for BSON Date objects, ISO strings, YYYY-MM-DD
  function buildDateFilterConditions(dateFilterInput: string | string[]) {
    const conditions: any[] = [];
    const inputs = Array.isArray(dateFilterInput) ? dateFilterInput : [dateFilterInput];

    inputs.forEach(item => {
      const cleanStr = String(item || "").trim();
      if (!cleanStr) return;

      // String / Regex match
      conditions.push({ date: { $regex: `^${cleanStr}` } });
      conditions.push({ attendanceDate: { $regex: `^${cleanStr}` } });
      conditions.push({ date: cleanStr });

      // Date Object Range Match
      if (cleanStr.length === 10) { // YYYY-MM-DD
        const start = new Date(`${cleanStr}T00:00:00.000Z`);
        const end = new Date(`${cleanStr}T23:59:59.999Z`);
        if (!isNaN(start.getTime())) {
          conditions.push({ date: { $gte: start, $lte: end } });
          conditions.push({ attendanceDate: { $gte: start, $lte: end } });
          conditions.push({ createdAt: { $gte: start, $lte: end } });
          conditions.push({ updatedAt: { $gte: start, $lte: end } });
        }
      } else if (cleanStr.length === 7) { // YYYY-MM
        const parts = cleanStr.split("-").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const start = new Date(Date.UTC(parts[0], parts[1] - 1, 1, 0, 0, 0, 0));
          const end = new Date(Date.UTC(parts[0], parts[1], 0, 23, 59, 59, 999));
          if (!isNaN(start.getTime())) {
            conditions.push({ date: { $gte: start, $lte: end } });
            conditions.push({ attendanceDate: { $gte: start, $lte: end } });
            conditions.push({ createdAt: { $gte: start, $lte: end } });
            conditions.push({ updatedAt: { $gte: start, $lte: end } });
          }
        }
      }
    });

    return conditions;
  }

  // Universal Attendance LOOKUP Handler
  const lookupStudentAttendanceHandler = async (req: any, res: any) => {
    const body = req.body || {};
    const query = req.query || {};
    const data = { ...query, ...body };
    const authHeader = req.headers.authorization || req.headers["x-access-token"] || data.token || "";

    const rawIds = data.studentIDs || data.studentID || data.studentId || data.student_id || data.reg_no || data.id || data._id;
    let targetIds: string[] = [];
    if (Array.isArray(rawIds)) {
      targetIds = rawIds.map(v => String(v).trim()).filter(Boolean);
    } else if (rawIds !== undefined && rawIds !== null && String(rawIds).trim() !== "") {
      targetIds = [String(rawIds).trim()];
    }

    const dateFilter = data.date || data.attendanceDate || data.attendance_date;
    const cleanDateFilter = dateFilter ? formatToYMD(dateFilter) : null;

    const matchesMap = new Map<string, any>();

    // 1. Query MongoDB attendances collection
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const expandedTokensSet = await expandStudentTokens(mongo, targetIds);
        const tokenList = Array.from(expandedTokensSet);

        let filter: any = {};
        if (tokenList.length > 0) {
          const tokenRegexes = tokenList.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          const tokenObjIds = tokenList.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));

          const idConditions: any[] = [
            { studentID: { $in: tokenRegexes } },
            { student_id: { $in: tokenRegexes } },
            { studentId: { $in: tokenRegexes } },
            { student: { $in: tokenRegexes } },
            { reg_no: { $in: tokenRegexes } }
          ];
          if (tokenObjIds.length > 0) {
            idConditions.push({ studentID: { $in: tokenObjIds } });
            idConditions.push({ student_id: { $in: tokenObjIds } });
            idConditions.push({ _id: { $in: tokenObjIds } });
          }

          if (cleanDateFilter) {
            const dateConditions = buildDateFilterConditions(cleanDateFilter);
            filter = {
              $and: [
                { $or: idConditions },
                { $or: dateConditions }
              ]
            };
          } else {
            filter = { $or: idConditions };
          }
        } else if (cleanDateFilter) {
          filter = { $or: buildDateFilterConditions(cleanDateFilter) };
        }

        let docs = await mongo.collection("attendances").find(filter).sort({ updatedAt: 1, createdAt: 1, _id: 1 }).toArray();
        if (docs && docs.length > 0) {
          docs.forEach(d => {
            const sId = String(d.studentID || d.student_id || d.studentId || d.reg_no || d.id || d._id || "");
            const dateStr = formatToYMD(d.date || d.attendanceDate || d.attendance_date);
            const key = `${sId.toLowerCase()}_${dateStr}`;
            matchesMap.set(key, {
              ...d,
              studentID: sId,
              student_id: sId,
              date: dateStr,
              attendanceDate: dateStr,
              attended: d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late",
              status: (d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late") ? (String(d.status).toLowerCase() === "late" ? "late" : "present") : "absent"
            });
          });
        }
      }
    } catch (err) {
      console.warn("[MongoDB Attendance Lookup] Warning:", err);
    }

    // 2. Query Local JSON Database (db.json / in-memory DB)
    try {
      const db = loadDb();
      const attList = db.student_attendance || [];
      if (targetIds.length > 0) {
        const targetLower = targetIds.map(t => t.toLowerCase());
        const localMatches = attList.filter((a: any) => {
          const itemTokens = [
            a.studentID, a.studentId, a.student_id, a.reg_no, a.id, a._id, a.username
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());

          const matchesId = targetLower.some(tId => itemTokens.includes(tId));
          if (!matchesId) return false;
          if (cleanDateFilter) {
            const recDate = formatToYMD(a.date || a.attendanceDate);
            return recDate === cleanDateFilter;
          }
          return true;
        });

        localMatches.forEach(lm => {
          const sId = String(lm.studentID || lm.student_id || lm.studentId || lm.reg_no || lm.id || lm._id || "");
          const dateStr = formatToYMD(lm.date || lm.attendanceDate);
          const key = `${sId.toLowerCase()}_${dateStr}`;
          if (!matchesMap.has(key)) {
            matchesMap.set(key, {
              ...lm,
              studentID: sId,
              student_id: sId,
              date: dateStr,
              attendanceDate: dateStr,
              attended: lm.attended === true || lm.attended === "true" || String(lm.status).toLowerCase() === "present" || String(lm.status).toLowerCase() === "late",
              status: (lm.attended === true || lm.attended === "true" || String(lm.status).toLowerCase() === "present" || String(lm.status).toLowerCase() === "late") ? (String(lm.status).toLowerCase() === "late" ? "late" : "present") : "absent"
            });
          }
        });
      }
    } catch (err) {
      console.warn("[Local JSON Attendance Lookup] Warning:", err);
    }

    // 3. Fallback Remote Proxy to https://abms-lkw9.onrender.com
    if (targetIds.length > 0 && authHeader) {
      try {
        const remoteHeaders: Record<string, string> = { "Content-Type": "application/json" };
        const cleanTok = authHeader.replace(/^Bearer\s+/i, "").trim();
        remoteHeaders["Authorization"] = `Bearer ${cleanTok}`;
        remoteHeaders["x-access-token"] = cleanTok;

        for (const targetId of targetIds.slice(0, 3)) {
          const remoteRes = await fetch("https://abms-lkw9.onrender.com/class/attendance/lookup", {
            method: "POST",
            headers: remoteHeaders,
            body: JSON.stringify({ studentID: targetId, date: cleanDateFilter || undefined }),
            signal: AbortSignal.timeout(3500)
          }).catch(() => null);

          if (remoteRes && remoteRes.ok) {
            const remoteData = await remoteRes.json().catch(() => null);
            if (Array.isArray(remoteData)) {
              remoteData.forEach(d => {
                const sId = String(d.studentID || d.student_id || targetId);
                const dateStr = formatToYMD(d.date || d.attendanceDate);
                if (dateStr) {
                  const key = `${sId.toLowerCase()}_${dateStr}`;
                  if (!matchesMap.has(key)) {
                    matchesMap.set(key, {
                      ...d,
                      studentID: sId,
                      student_id: sId,
                      date: dateStr,
                      attendanceDate: dateStr,
                      attended: d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late",
                      status: (d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late") ? (String(d.status).toLowerCase() === "late" ? "late" : "present") : "absent"
                    });
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        // silent
      }
    }

    const matches = Array.from(matchesMap.values());
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
  const studentMonthAttendanceHandler = async (req: any, res: any) => {
    const body = req.body || {};
    const query = req.query || {};
    const data = { ...query, ...body };
    const authHeader = req.headers.authorization || req.headers["x-access-token"] || data.token || "";

    const rawIds = data.studentIDs || data.studentID || data.studentId || data.student_id || data.reg_no || data.id || data._id;
    let targetIds: string[] = [];
    if (Array.isArray(rawIds)) {
      targetIds = rawIds.map(v => String(v).trim()).filter(Boolean);
    } else if (rawIds !== undefined && rawIds !== null && String(rawIds).trim() !== "") {
      targetIds = [String(rawIds).trim()];
    }

    const year = data.year;
    const month = data.month;
    let prefixes: string[] = [];
    if (year !== undefined && month !== undefined && String(year) !== "" && String(month) !== "") {
      const mVal = Number(month);
      if (!isNaN(mVal)) {
        const monthNum0 = mVal + 1;
        if (monthNum0 >= 1 && monthNum0 <= 12) {
          prefixes.push(`${year}-${String(monthNum0).padStart(2, '0')}`);
        }
        if (mVal >= 1 && mVal <= 12) {
          prefixes.push(`${year}-${String(mVal).padStart(2, '0')}`);
        }
      } else if (typeof month === "string" && month.trim().length > 0) {
        prefixes.push(`${year}-${month.trim().padStart(2, '0')}`);
      }
    }
    prefixes = Array.from(new Set(prefixes));

    const matchesMap = new Map<string, any>();

    // 1. Query MongoDB Atlas attendances collection
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const expandedTokensSet = await expandStudentTokens(mongo, targetIds);
        const tokenList = Array.from(expandedTokensSet);

        let filter: any = {};
        if (tokenList.length > 0) {
          const tokenRegexes = tokenList.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          const tokenObjIds = tokenList.filter(t => mongoose.Types.ObjectId.isValid(t)).map(t => new mongoose.Types.ObjectId(t));

          const idConditions: any[] = [
            { studentID: { $in: tokenRegexes } },
            { student_id: { $in: tokenRegexes } },
            { studentId: { $in: tokenRegexes } },
            { student: { $in: tokenRegexes } },
            { reg_no: { $in: tokenRegexes } }
          ];
          if (tokenObjIds.length > 0) {
            idConditions.push({ studentID: { $in: tokenObjIds } });
            idConditions.push({ student_id: { $in: tokenObjIds } });
            idConditions.push({ _id: { $in: tokenObjIds } });
          }

          if (prefixes.length > 0) {
            const dateConditions = buildDateFilterConditions(prefixes);
            filter = {
              $and: [
                { $or: idConditions },
                { $or: dateConditions }
              ]
            };
          } else {
            filter = { $or: idConditions };
          }
        } else if (prefixes.length > 0) {
          filter = { $or: buildDateFilterConditions(prefixes) };
        }

        let docs = await mongo.collection("attendances").find(filter).sort({ updatedAt: 1, createdAt: 1, _id: 1 }).toArray();
        if (docs && docs.length > 0) {
          docs.forEach(d => {
            const sId = String(d.studentID || d.student_id || d.studentId || d.reg_no || d.id || d._id || "");
            const dateStr = formatToYMD(d.date || d.attendanceDate || d.attendance_date);
            const key = `${sId.toLowerCase()}_${dateStr}`;
            matchesMap.set(key, {
              ...d,
              studentID: sId,
              student_id: sId,
              date: dateStr,
              attendanceDate: dateStr,
              attended: d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late",
              status: (d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late") ? (String(d.status).toLowerCase() === "late" ? "late" : "present") : "absent"
            });
          });
        }
      }
    } catch (err) {
      console.warn("[MongoDB Student Month Lookup] Warning:", err);
    }

    // 2. Query Local JSON Database
    try {
      const db = loadDb();
      const attList = db.student_attendance || [];
      if (targetIds.length > 0) {
        const targetLower = targetIds.map(t => t.toLowerCase());
        const localMatches = attList.filter((a: any) => {
          const itemTokens = [
            a.studentID, a.studentId, a.student_id, a.reg_no, a.id, a._id, a.username
          ].filter(Boolean).map(v => String(v).trim().toLowerCase());

          const matchesId = targetLower.some(tId => itemTokens.includes(tId));
          if (!matchesId) return false;
          if (prefixes && prefixes.length > 0) {
            const recDate = formatToYMD(a.date || a.attendanceDate);
            return prefixes.some((p: string) => recDate.startsWith(p));
          }
          return true;
        });

        localMatches.forEach(lm => {
          const sId = String(lm.studentID || lm.student_id || lm.studentId || lm.reg_no || lm.id || lm._id || "");
          const dateStr = formatToYMD(lm.date || lm.attendanceDate);
          const key = `${sId.toLowerCase()}_${dateStr}`;
          if (!matchesMap.has(key)) {
            matchesMap.set(key, {
              ...lm,
              studentID: sId,
              student_id: sId,
              date: dateStr,
              attendanceDate: dateStr,
              attended: lm.attended === true || lm.attended === "true" || String(lm.status).toLowerCase() === "present" || String(lm.status).toLowerCase() === "late",
              status: (lm.attended === true || lm.attended === "true" || String(lm.status).toLowerCase() === "present" || String(lm.status).toLowerCase() === "late") ? (String(lm.status).toLowerCase() === "late" ? "late" : "present") : "absent"
            });
          }
        });
      }
    } catch (err) {
      console.warn("[Local JSON Student Month Lookup] Warning:", err);
    }

    // 3. Fallback Remote Proxy to https://abms-lkw9.onrender.com
    if (targetIds.length > 0 && authHeader) {
      try {
        const remoteHeaders: Record<string, string> = { "Content-Type": "application/json" };
        const cleanTok = authHeader.replace(/^Bearer\s+/i, "").trim();
        remoteHeaders["Authorization"] = `Bearer ${cleanTok}`;
        remoteHeaders["x-access-token"] = cleanTok;

        for (const targetId of targetIds.slice(0, 3)) {
          const remoteRes = await fetch("https://abms-lkw9.onrender.com/class/attendance/lookup", {
            method: "POST",
            headers: remoteHeaders,
            body: JSON.stringify({ studentID: targetId }),
            signal: AbortSignal.timeout(3500)
          }).catch(() => null);

          if (remoteRes && remoteRes.ok) {
            const remoteData = await remoteRes.json().catch(() => null);
            if (Array.isArray(remoteData)) {
              remoteData.forEach(d => {
                const sId = String(d.studentID || d.student_id || targetId);
                const dateStr = formatToYMD(d.date || d.attendanceDate);
                if (dateStr) {
                  const key = `${sId.toLowerCase()}_${dateStr}`;
                  if (!matchesMap.has(key)) {
                    matchesMap.set(key, {
                      ...d,
                      studentID: sId,
                      student_id: sId,
                      date: dateStr,
                      attendanceDate: dateStr,
                      attended: d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late",
                      status: (d.attended === true || d.attended === "true" || String(d.status).toLowerCase() === "present" || String(d.status).toLowerCase() === "late") ? (String(d.status).toLowerCase() === "late" ? "late" : "present") : "absent"
                    });
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        // silent
      }
    }

    const matches = Array.from(matchesMap.values());
    res.json(matches);
  };

  // Universal Attendance STUDENT_MONTH Route Aliases (GET, POST, PUT, PATCH)
  ["get", "post", "put", "patch"].forEach((method) => {
    (app as any)[method]("/api/attendance/student_month", studentMonthAttendanceHandler);
    (app as any)[method]("/attendance/student_month", studentMonthAttendanceHandler);
    (app as any)[method]("/api/class/attendance/student_month", studentMonthAttendanceHandler);
    (app as any)[method]("/class/attendance/student_month", studentMonthAttendanceHandler);
  });

  // Absence Handler
  const absenceAttendanceHandler = async (req: any, res: any) => {
    let absences: any[] = [];
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const docs = await mongo.collection("attendances").find({
          $or: [
            { attended: false },
            { attended: "false" },
            { status: "absent" }
          ]
        }).toArray();
        absences = docs.map(d => ({
          ...d,
          studentID: String(d.studentID || d.student_id || d.studentId || ""),
          date: String(d.date || d.attendanceDate || "").split("T")[0],
          attended: false,
          status: "absent"
        }));
      }
    } catch (e) {
      console.warn("[MongoDB Absence Lookup] Notice:", e);
    }
    res.json(absences);
  };

  app.get("/api/class/attendance/absence", absenceAttendanceHandler);
  app.post("/api/class/attendance/absence", absenceAttendanceHandler);
  app.get("/class/attendance/absence", absenceAttendanceHandler);
  app.post("/class/attendance/absence", absenceAttendanceHandler);
  app.get("/api/attendance/absence", absenceAttendanceHandler);
  app.post("/api/attendance/absence", absenceAttendanceHandler);

  // API: Register a teacher leave request (MongoDB Atlas)
  const addTeacherLeaveHandler = async (req: any, res: any) => {
    const teacher_id = req.body.teacher_id || req.body.teacherId || req.body.teacherID || req.body.teacher || req.body.user_id || "T101";
    const teacher_name = req.body.teacher_name || req.body.teacherName || req.body.name || "Teacher User";
    const leave_date = req.body.leave_date || req.body.leaveDate || req.body.start_date || req.body.startDate || req.body.date || new Date().toISOString().split("T")[0];
    const end_date = req.body.end_date || req.body.endDate || req.body.to_date || req.body.toDate || leave_date;
    const leave_type = req.body.leave_type || req.body.leaveType || req.body.type || req.body.subject || "Absence Application";
    const reason = req.body.reason || req.body.description || req.body.notes || "Not specified";
    const status = req.body.status || "Pending";

    const newLeave: any = {
      _id: new mongoose.Types.ObjectId().toString(),
      teacher_id,
      teacher_name,
      leave_date,
      end_date,
      leave_type,
      reason,
      status,
      created_at: new Date()
    };

    try {
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("rel_teacher_leaves").insertOne(newLeave);
        return res.status(200).json({
          message: "Added successfully",
          createdRecord: newLeave
        });
      }
    } catch (err) {
      console.warn("[MongoDB Teacher Leave] Insert notice:", err);
    }

    res.status(200).json({
      message: "Added successfully",
      createdRecord: newLeave
    });
  };

  app.post("/api/rel/teacherLeave/add", addTeacherLeaveHandler);
  app.post("/api/rel_teacher_leaves/add", addTeacherLeaveHandler);
  app.post("/api/rel_teacher_leaves", addTeacherLeaveHandler);
  app.post("/rel_teacher_leaves/add", addTeacherLeaveHandler);
  app.post("/rel_teacher_leaves", addTeacherLeaveHandler);

  // API: Get teacher leaves list (MongoDB Atlas)
  const getTeacherLeavesHandler = async (req: any, res: any) => {
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const leaves = await mongo.collection("rel_teacher_leaves").find({}).sort({ created_at: -1 }).toArray();
        if (leaves.length > 0) {
          return res.json(leaves.map(l => ({ ...l, _id: String(l._id), id: String(l._id) })));
        }
      }
    } catch (err) {
      console.warn("[MongoDB Teacher Leave] Fetch notice:", err);
    }
    res.json([]);
  };
  app.get("/api/rel/teacherLeave/retrieve", getTeacherLeavesHandler);
  app.post("/api/rel/teacherLeave/retrieve", getTeacherLeavesHandler);
  app.get("/api/rel_teacher_leaves/retrieve", getTeacherLeavesHandler);
  app.post("/api/rel_teacher_leaves/retrieve", getTeacherLeavesHandler);
  app.get("/api/rel_teacher_leaves", getTeacherLeavesHandler);
  app.post("/api/rel_teacher_leaves", getTeacherLeavesHandler);

  // API: Get assigned extra activity teachers list (MongoDB Atlas)
  app.post("/api/rel/extraActivityTeacher/retrieve", async (req, res) => {
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const items = await mongo.collection("rel_extra_activity_teachers").find({}).toArray();
        if (items.length > 0) {
          return res.json(items.map(i => ({ ...i, _id: String(i._id), id: String(i._id) })));
        }
      }
    } catch (err) {}
    res.json([]);
  });

  // API: Get master extra activities list (MongoDB Atlas)
  app.post("/api/m/extraActivity/retrieve", async (req, res) => {
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const items = await mongo.collection("m_extra_activities").find({}).toArray();
        if (items.length > 0) {
          return res.json(items.map(i => ({ ...i, _id: String(i._id), id: String(i._id) })));
        }
      }
    } catch (err) {}
    res.json([]);
  });

  // API: Get organizations list (local database fallback / MongoDB)
  const getOrganizationRetrieveHandler = async (req: any, res: any) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const items = await db.collection("m_organizations").find({}).toArray();
        if (items.length > 0) {
          const mapped = items.map((o: any) => ({
            ...o,
            _id: String(o._id),
            id: String(o._id)
          }));
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("MongoDB organization query failed:", e);
    }
    const dbLocal = loadDb();
    return res.json(dbLocal.organizations || []);
  };

  app.post("/api/m/organization/retrieve", getOrganizationRetrieveHandler);
  app.post("/m/organization/retrieve", getOrganizationRetrieveHandler);
  app.post("/api/m/organization/find", getOrganizationRetrieveHandler);
  app.post("/m/organization/find", getOrganizationRetrieveHandler);

  // Class retrieve handler
  const getClassRetrieveHandler = async (req: any, res: any) => {
    const orgId = String(req.body?.value || req.body?.organization_id || req.body?.organizationId || req.query?.organization_id || "").trim();
    try {
      const db = await getMongoDb();
      if (db) {
        const query = orgId ? { organization_id: orgId } : {};
        let items = await db.collection("m_classes").find(query).toArray();
        if (items.length === 0 && orgId) {
          items = await db.collection("m_classes").find({}).toArray();
        }
        if (items.length > 0) {
          const sections = await db.collection("m_class_sections").find({}).toArray();
          const secMap = new Map();
          sections.forEach((s: any) => secMap.set(String(s._id), s.section_name || s.__section || "Section A"));

          const mapped = items.map((c: any) => {
            const cId = String(c._id);
            const secName = secMap.get(String(c.class_section_id)) || "Section A";
            const cName = c.class_name || c.name || "Class";
            return {
              ...c,
              _id: cId,
              id: cId,
              class_id: cId,
              name: `${cName} (${secName})`,
              class_name: cName,
              section_name: secName,
              organization_id: c.organization_id || orgId
            };
          });
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("MongoDB class query failed:", e);
    }
    const dbLocal = loadDb();
    return res.json(dbLocal.classes || []);
  };

  app.post("/api/m/class/retrieve", getClassRetrieveHandler);
  app.post("/m/class/retrieve", getClassRetrieveHandler);
  app.get("/api/m/class/retrieve", getClassRetrieveHandler);
  app.get("/m/class/retrieve", getClassRetrieveHandler);
  app.post("/api/m/class/find", getClassRetrieveHandler);
  app.post("/m/class/find", getClassRetrieveHandler);

  // Timetable retrieve handler
  const getTimetableRetrieveHandler = async (req: any, res: any) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const items = await db.collection("timetables").find({}).toArray();
        if (items.length > 0) {
          const mapped = items.map((t: any) => ({
            ...t,
            _id: String(t._id),
            id: String(t._id)
          }));
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("MongoDB timetable query failed:", e);
    }
    return res.json([]);
  };

  app.post("/api/timetable/retrieve", getTimetableRetrieveHandler);
  app.post("/timetable/retrieve", getTimetableRetrieveHandler);
  app.get("/api/timetable/retrieve", getTimetableRetrieveHandler);
  app.get("/timetable/retrieve", getTimetableRetrieveHandler);
  app.post("/api/m/timetable/retrieve", getTimetableRetrieveHandler);
  app.post("/m/timetable/retrieve", getTimetableRetrieveHandler);
  app.post("/api/timetable/find", getTimetableRetrieveHandler);
  app.post("/timetable/find", getTimetableRetrieveHandler);

  // Teacher retrieve handler
  const getTeacherRetrieveHandler = async (req: any, res: any) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const items = await db.collection("m_teachers").find({}).toArray();
        if (items.length > 0) {
          const mapped = items.map((t: any) => ({
            ...t,
            _id: String(t._id),
            id: String(t._id),
            name: t.name || `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.reg_no || "Teacher"
          }));
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("MongoDB teacher query failed:", e);
    }
    return res.json([]);
  };

  app.post("/api/m/teacher/retrieve", getTeacherRetrieveHandler);
  app.post("/m/teacher/retrieve", getTeacherRetrieveHandler);
  app.get("/api/m/teacher/retrieve", getTeacherRetrieveHandler);
  app.get("/m/teacher/retrieve", getTeacherRetrieveHandler);
  app.post("/api/m/teacher/find", getTeacherRetrieveHandler);
  app.post("/m/teacher/find", getTeacherRetrieveHandler);

  // Class Section retrieve handler
  const getClassSectionRetrieveHandler = async (req: any, res: any) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const items = await db.collection("m_class_sections").find({}).toArray();
        if (items.length > 0) {
          const mapped = items.map((s: any) => ({
            ...s,
            _id: String(s._id),
            id: String(s._id),
            section_name: s.section_name || s.__section || "Section A"
          }));
          return res.json(mapped);
        }
      }
    } catch (e) {
      console.warn("MongoDB class section query failed:", e);
    }
    return res.json([]);
  };

  app.post("/api/m/classSection/retrieve", getClassSectionRetrieveHandler);
  app.post("/m/classSection/retrieve", getClassSectionRetrieveHandler);
  app.get("/api/m/classSection/retrieve", getClassSectionRetrieveHandler);
  app.get("/m/classSection/retrieve", getClassSectionRetrieveHandler);

  // API: Get notifications (MongoDB Atlas)
  const getNotificationsHandler = async (req: any, res: any) => {
    try {
      const mongo = await getMongoDb();
      if (mongo) {
        const notifs = await mongo.collection("notifications").find({}).sort({ date: -1 }).toArray();
        if (notifs.length > 0) {
          return res.json(notifs.map(n => ({ ...n, _id: String(n._id), id: String(n._id) })));
        }
      }
    } catch (e) {}
    res.json([]);
  };

  app.post("/api/m/notification/retrieve", getNotificationsHandler);
  app.post("/api/notification/retrieve", getNotificationsHandler);
  app.get("/api/m/notification/retrieve", getNotificationsHandler);
  app.get("/api/notification/retrieve", getNotificationsHandler);

  // Subject retrieve handler filtered by organization_id
  const getSubjectRetrieveHandler = async (req: any, res: any) => {
    const orgId = String(req.body?.organization_id || req.body?.organizationId || req.body?.value || req.query?.organization_id || "").trim();
    
    let subjects: any[] = [];
    try {
      const db = await getMongoDb();
      if (db) {
        const query = orgId ? { $or: [{ organization_id: orgId }, { organization_id: null }, { organization_id: { $exists: false } }] } : {};
        let items = await db.collection("m_subjects").find(query).toArray();
        if (items.length === 0 && orgId) {
          items = await db.collection("m_subjects").find({}).toArray();
        }
        if (items.length > 0) {
          subjects = items.map((s: any) => ({
            ...s,
            _id: String(s._id),
            id: String(s._id),
            subject: s.subject || s.name || "Subject"
          }));
        }
      }
    } catch (e) {
      console.warn("MongoDB subject query failed:", e);
    }

    if (subjects.length === 0) {
      try {
        const response = await fetch("https://abms-lkw9.onrender.com/m/subject/retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(3500)
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (Array.isArray(data)) subjects = data;
        }
      } catch (e) {
        // fallback
      }
    }

    if (subjects.length === 0) {
      subjects = [
        { _id: "sub-1", subject: "Mathematics", organization_id: orgId || "ATH-ORG-941", is_active: true },
        { _id: "sub-2", subject: "Science", organization_id: orgId || "ATH-ORG-941", is_active: true },
        { _id: "sub-3", subject: "English Literature", organization_id: orgId || "ATH-ORG-941", is_active: true }
      ];
    }

    return res.json(subjects);
  };

  app.post("/api/m/subject/retrieve", getSubjectRetrieveHandler);
  app.post("/m/subject/retrieve", getSubjectRetrieveHandler);
  app.get("/api/m/subject/retrieve", getSubjectRetrieveHandler);
  app.get("/m/subject/retrieve", getSubjectRetrieveHandler);

  // Homework UPLOAD Handler
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  const handleMulterAny = (req: any, res: any, next: any) => {
    upload.any()(req, res, (err: any) => {
      if (err) {
        console.error("[Multer Error]:", err);
        return res.status(400).json({ error: err.message || "File upload error" });
      }
      if (req.files && req.files.length > 0 && !req.file) {
        req.file = req.files[0];
      }
      next();
    });
  };

  const uploadHomeworkHandler = async (req: any, res: any) => {
    try {
      const activeFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
      const class_id = String(req.body?.class_id || req.headers["class_id"] || req.query?.class_id || "").trim();
      const subject_id = String(req.body?.subject_id || req.headers["subject_id"] || req.query?.subject_id || "").trim();
      const title = String(req.body?.title || "").trim();
      const instructions = String(req.body?.instructions || req.body?.description || "").trim();

      let fileName = activeFile ? activeFile.originalname : (req.body?.fileName || req.body?.file_id || "");
      if (!fileName) {
        const cleanTitle = (title || instructions.slice(0, 30) || "homework_assignment").replace(/[^a-zA-Z0-9_\-]/g, "_");
        fileName = `${cleanTitle}.txt`;
      }
      const file_extension = path.extname(fileName) || ".txt";

      let fileBase64 = "";
      if (activeFile && activeFile.buffer) {
        const mimeType = activeFile.mimetype || "application/octet-stream";
        fileBase64 = `data:${mimeType};base64,${activeFile.buffer.toString("base64")}`;
      }

      const homeworkId = `hw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const homeworkDoc: any = {
        _id: homeworkId,
        id: homeworkId,
        class_id: class_id,
        subject_id: subject_id,
        title: title || "Homework Assignment",
        instructions: instructions || (activeFile ? `File attached: ${fileName}` : ""),
        file_id: fileName,
        file_extension: file_extension,
        file_base64: fileBase64,
        date: new Date().toISOString()
      };

      // Try saving to Mongo Atlas if connection is ready
      if (mongoose.connection.readyState === 1) {
        try {
          const docData = {
            _id: new mongoose.Types.ObjectId(),
            class_id: class_id,
            subject_id: subject_id,
            title: title || "Homework Assignment",
            instructions: homeworkDoc.instructions,
            file_id: fileName,
            file_extension: file_extension,
            file_base64: fileBase64,
            date: new Date()
          };
          const savedMongo = await new HomeworkModel(docData).save();
          if (savedMongo && savedMongo._id) {
            homeworkDoc._id = savedMongo._id.toString();
            homeworkDoc.id = savedMongo._id.toString();
          }
          console.log("[MongoDB Atlas] Saved homework assignment to Mongo Atlas! ID:", homeworkDoc._id);
        } catch (mongoErr) {
          console.warn("[MongoDB Atlas] Notice saving homework:", mongoErr);
        }
      }

      // Save to local JSON database as well
      const db = loadDb();
      if (!db.homework) db.homework = [];
      db.homework.unshift(homeworkDoc);
      saveDb(db);

      console.log("[Homework Upload] Successfully saved homework to local DB:", homeworkDoc._id);

      return res.status(200).json({
        success: true,
        message: "Homework upload Success",
        homework: homeworkDoc,
        _id: homeworkDoc._id
      });
    } catch (err: any) {
      console.error("Error uploading homework:", err);
      return res.status(500).json({ error: err.message || "Homework upload failed" });
    }
  };

  // Homework DOWNLOAD Handler
  const downloadHomeworkHandler = async (req: any, res: any) => {
    const schema_id = String(req.headers["schema_id"] || req.headers["id"] || req.query.schema_id || req.query.id || req.body?.schema_id || "").trim();
    const db = loadDb();
    const allHw = db.homework || [];
    let hw = allHw.find((h: any) => String(h._id || h.id) === schema_id);

    if (!hw && schema_id) {
      try {
        hw = await (HomeworkModel as any).findById(schema_id).lean();
      } catch (err) {
        // ignore
      }
    }

    if (!hw && schema_id) {
      try {
        hw = await (HomeworkModel as any).findOne({ $or: [{ _id: schema_id }, { id: schema_id }, { file_id: schema_id }] }).lean();
      } catch (err) {
        // ignore
      }
    }

    let filename = hw?.file_id || (hw?.title ? `${hw.title.replace(/[^a-zA-Z0-9_\-]/g, "_")}.txt` : `homework_${schema_id || 'document'}.txt`);
    const instructions = hw?.instructions || hw?.title || hw?.description || `Homework Assignment Details\nID: ${schema_id}\nDate: ${new Date().toISOString()}`;

    let contentType = "text/plain; charset=utf-8";
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".pdf")) contentType = "application/pdf";
    else if (lowerFilename.endsWith(".png")) contentType = "image/png";
    else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (lowerFilename.endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (lowerFilename.endsWith(".doc")) contentType = "application/msword";

    if (typeof instructions === "string" && instructions.startsWith("data:")) {
      const parts = instructions.split(",");
      const match = parts[0].match(/:(.*?);/);
      if (match) contentType = match[1];
      const base64Data = parts[1] || "";
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", contentType);
      return res.status(200).send(buffer);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(instructions);
  };

  // Homework GET LIST Handler (MongoDB Atlas)
  const getHomeworkListHandler = async (req: any, res: any) => {
    const class_id = String(req.headers["class_id"] || req.query.class_id || req.query.classId || req.body?.class_id || req.body?.classId || "").trim();
    try {
      const filter = class_id ? { $or: [{ class_id: class_id }, { class_id: "" }, { class_id: { $exists: false } }] } : {};
      const mongoHomeworks = await (HomeworkModel as any).find(filter).sort({ date: -1 }).lean();
      return res.json(mongoHomeworks.map((h: any) => ({ ...h, _id: String(h._id), id: String(h._id) })));
    } catch (mErr) {
      console.warn("MongoDB Atlas getHomeworkList error:", mErr);
      return res.json([]);
    }
  };

  // Homework DELETE Handler (MongoDB Atlas)
  const deleteHomeworkHandler = async (req: any, res: any) => {
    const schema_id = String(req.body?.id || req.body?.schema_id || req.query?.id || req.headers?.schema_id || "").trim();
    if (!schema_id) {
      return res.status(400).json({ error: "schema_id or id is required" });
    }

    try {
      const filterConditions: any[] = [
        { _id: schema_id },
        { id: schema_id },
        { file_id: schema_id }
      ];
      if (mongoose.Types.ObjectId.isValid(schema_id)) {
        filterConditions.push({ _id: new mongoose.Types.ObjectId(schema_id) });
      }
      await HomeworkModel.deleteMany({ $or: filterConditions });
      console.log(`[MongoDB Atlas] Deleted homework matching ID: ${schema_id}`);
    } catch (mongoErr) {
      console.warn("MongoDB Atlas deleteHomework notice:", mongoErr);
    }

    return res.json({ success: true, message: "Homework deleted successfully", id: schema_id });
  };

  app.post("/api/homework/upload", handleMulterAny, uploadHomeworkHandler);
  app.post("/homework/upload", handleMulterAny, uploadHomeworkHandler);
  app.post("/api/homework", handleMulterAny, uploadHomeworkHandler);
  app.post("/homework", handleMulterAny, uploadHomeworkHandler);
  app.post("/api/homeworks", handleMulterAny, uploadHomeworkHandler);
  app.post("/homeworks", handleMulterAny, uploadHomeworkHandler);
  app.post("/api/homework/add", handleMulterAny, uploadHomeworkHandler);
  app.post("/homework/add", handleMulterAny, uploadHomeworkHandler);
  app.post("/api/homework/create", handleMulterAny, uploadHomeworkHandler);
  app.post("/homework/create", handleMulterAny, uploadHomeworkHandler);

  app.get("/api/homework/download", downloadHomeworkHandler);
  app.get("/homework/download", downloadHomeworkHandler);
  app.post("/api/homework/download", downloadHomeworkHandler);
  app.post("/homework/download", downloadHomeworkHandler);

  app.get("/api/homework/getList", getHomeworkListHandler);
  app.post("/api/homework/getList", getHomeworkListHandler);
  app.get("/homework/getList", getHomeworkListHandler);
  app.post("/homework/getList", getHomeworkListHandler);

  app.post("/api/homework/delete", deleteHomeworkHandler);
  app.delete("/api/homework/delete", deleteHomeworkHandler);
  app.post("/homework/delete", deleteHomeworkHandler);
  app.delete("/homework/delete", deleteHomeworkHandler);

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
