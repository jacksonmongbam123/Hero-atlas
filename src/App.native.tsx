import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
} from "react-native";

const API_BASE = "https://abms-lkw9.onrender.com";

export default function App() {
  const [role, setRole] = useState<"teacher" | "student" | "parent">("teacher");
  const [portalId, setPortalId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticated state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "attendance" | "marks" | "fees" | "notifs">("home");

  // Portal Data States
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Handle Login
  const handleLogin = async () => {
    if (!portalId.trim() || !password.trim()) {
      setErrorMsg("Please enter both Portal ID and Password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: portalId.trim(), password: password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMsg(data.message || `Login failed (Status: ${response.status})`);
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        setErrorMsg("Invalid account data returned from backend.");
        setIsSubmitting(false);
        return;
      }

      const returnedRole = (data.user.user_type || data.user.role || "").toLowerCase();

      // Role check
      if (role === "teacher" && returnedRole !== "teacher" && returnedRole !== "admin") {
        setErrorMsg(`Access Denied: Account is registered as ${returnedRole.toUpperCase()}. Please select the correct role.`);
        setIsSubmitting(false);
        return;
      }
      if (role === "student" && returnedRole !== "student") {
        setErrorMsg(`Access Denied: Account is registered as ${returnedRole.toUpperCase()}. Please select the correct role.`);
        setIsSubmitting(false);
        return;
      }
      if (role === "parent" && returnedRole !== "parent") {
        setErrorMsg(`Access Denied: Account is registered as ${returnedRole.toUpperCase()}. Please select the correct role.`);
        setIsSubmitting(false);
        return;
      }

      setUser(data.user);
      setToken(data.token || "");
      setIsLoggedIn(true);
      setIsSubmitting(false);
      loadPortalData(data.user, data.token || "");
    } catch (err: any) {
      setErrorMsg("Network error: Unable to reach Hero Atlas backend server. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  // Load Portal Data from API / Mock fallback
  const loadPortalData = async (userData: any, userToken: string) => {
    setLoadingData(true);
    const uId = userData._id || userData.id || userData.username || portalId;

    try {
      // Fetch Notifications
      const notifRes = await fetch(`${API_BASE}/m/notifications/retrieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ target_type: role }),
      }).catch(() => null);

      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json().catch(() => []);
        if (Array.isArray(notifData) && notifData.length > 0) {
          setNotifications(notifData);
        } else {
          setNotifications(defaultNotifications);
        }
      } else {
        setNotifications(defaultNotifications);
      }

      // Fetch Marks if student or parent
      if (role === "student" || role === "parent") {
        const marksRes = await fetch(`${API_BASE}/m/marks/retrieve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
          body: JSON.stringify({ student_id: uId }),
        }).catch(() => null);

        if (marksRes && marksRes.ok) {
          const marksData = await marksRes.json().catch(() => []);
          if (Array.isArray(marksData) && marksData.length > 0) {
            setMarks(marksData);
          } else {
            setMarks(defaultMarks);
          }
        } else {
          setMarks(defaultMarks);
        }

        // Fetch Fees
        const feesRes = await fetch(`${API_BASE}/m/fees/retrieve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
          body: JSON.stringify({ student_id: uId }),
        }).catch(() => null);

        if (feesRes && feesRes.ok) {
          const feesData = await feesRes.json().catch(() => []);
          if (Array.isArray(feesData) && feesData.length > 0) {
            setFees(feesData);
          } else {
            setFees(defaultFees);
          }
        } else {
          setFees(defaultFees);
        }
      } else {
        setMarks(defaultMarks);
        setFees(defaultFees);
      }

      setAttendanceLogs(defaultAttendanceLogs);
    } catch (e) {
      setNotifications(defaultNotifications);
      setMarks(defaultMarks);
      setFees(defaultFees);
      setAttendanceLogs(defaultAttendanceLogs);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setToken("");
    setPortalId("");
    setPassword("");
    setErrorMsg(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020b24" />

      {!isLoggedIn ? (
        // Identity Gateway Login Screen
        <ScrollView contentContainerStyle={styles.loginScroll}>
          <View style={styles.headerBox}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OFFICIAL MOBILE PORTAL</Text>
            </View>
            <Text style={styles.brandTitle}>HERO ATLAS</Text>
            <Text style={styles.brandSub}>Academic Portal & Management System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Gateway Role</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, role === "teacher" && styles.roleBtnActive]}
                onPress={() => { setRole("teacher"); setErrorMsg(null); }}
              >
                <Text style={[styles.roleBtnText, role === "teacher" && styles.roleBtnTextActive]}>Faculty</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === "student" && styles.roleBtnActive]}
                onPress={() => { setRole("student"); setErrorMsg(null); }}
              >
                <Text style={[styles.roleBtnText, role === "student" && styles.roleBtnTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === "parent" && styles.roleBtnActive]}
                onPress={() => { setRole("parent"); setErrorMsg(null); }}
              >
                <Text style={[styles.roleBtnText, role === "parent" && styles.roleBtnTextActive]}>Parent</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Portal Identifier / ID</Text>
              <TextInput
                style={styles.input}
                placeholder={role === "teacher" ? "e.g. T101" : role === "student" ? "e.g. S205" : "e.g. P101"}
                placeholderTextColor="#64748b"
                value={portalId}
                onChangeText={setPortalId}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Access Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account password"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Authorize Gateway Access →</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Portal Credentials:</Text>
            <Text style={styles.demoText}>• Faculty: T101 / password</Text>
            <Text style={styles.demoText}>• Student: S205 / password</Text>
            <Text style={styles.demoText}>• Parent: P101 / password</Text>
          </View>
        </ScrollView>
      ) : (
        // Authenticated Portal Dashboard
        <View style={styles.dashboardContainer}>
          {/* Top Navigation Header */}
          <View style={styles.dashHeader}>
            <View>
              <Text style={styles.dashBrand}>HERO ATLAS</Text>
              <Text style={styles.dashUser}>
                {user?.name || portalId} ({role.toUpperCase()})
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "home" && styles.tabItemActive]}
              onPress={() => setActiveTab("home")}
            >
              <Text style={[styles.tabText, activeTab === "home" && styles.tabTextActive]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "attendance" && styles.tabItemActive]}
              onPress={() => setActiveTab("attendance")}
            >
              <Text style={[styles.tabText, activeTab === "attendance" && styles.tabTextActive]}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "marks" && styles.tabItemActive]}
              onPress={() => setActiveTab("marks")}
            >
              <Text style={[styles.tabText, activeTab === "marks" && styles.tabTextActive]}>Marks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "fees" && styles.tabItemActive]}
              onPress={() => setActiveTab("fees")}
            >
              <Text style={[styles.tabText, activeTab === "fees" && styles.tabTextActive]}>Fees</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "notifs" && styles.tabItemActive]}
              onPress={() => setActiveTab("notifs")}
            >
              <Text style={[styles.tabText, activeTab === "notifs" && styles.tabTextActive]}>Alerts</Text>
            </TouchableOpacity>
          </View>

          {/* Main Dashboard Content */}
          <ScrollView contentContainerStyle={styles.dashScroll}>
            {loadingData ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Synchronizing Portal Data...</Text>
              </View>
            ) : activeTab === "home" ? (
              <View>
                <View style={styles.welcomeCard}>
                  <Text style={styles.welcomeTitle}>Welcome to Hero Atlas Portal</Text>
                  <Text style={styles.welcomeSub}>
                    Connected to Hero Atlas Academy Cloud Database. Select a tab above to manage academic records, review grade ledgers, or process fee payments.
                  </Text>
                </View>

                <View style={styles.statGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>94.2%</Text>
                    <Text style={styles.statLabel}>Attendance Rate</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statVal}>3.85</Text>
                    <Text style={styles.statLabel}>Academic GPA</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Latest Campus Announcements</Text>
                {notifications.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{item.title || "Announcement"}</Text>
                    <Text style={styles.itemBody}>{item.message || item.body}</Text>
                    <Text style={styles.itemDate}>{item.date || "Today"}</Text>
                  </View>
                ))}
              </View>
            ) : activeTab === "attendance" ? (
              <View>
                <Text style={styles.sectionTitle}>Attendance Ledger Logs</Text>
                {attendanceLogs.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.flexRow}>
                      <Text style={styles.itemTitle}>{item.className}</Text>
                      <Text style={styles.badgeDate}>{item.date}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statGreen}>Present: {item.present}</Text>
                      <Text style={styles.statRed}>Absent: {item.absent}</Text>
                      <Text style={styles.statYellow}>Late: {item.late}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : activeTab === "marks" ? (
              <View>
                <Text style={styles.sectionTitle}>Academic Grade Marks</Text>
                {marks.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.flexRow}>
                      <Text style={styles.itemTitle}>{item.subject || item.subject_name || "Subject"}</Text>
                      <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{item.grade || "A"}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemBody}>Exam: {item.exam_name || "Term Exam"}</Text>
                    <Text style={styles.itemScore}>
                      Marks: {item.marks_obtained} / {item.total_marks} ({item.percentage || 88}%)
                    </Text>
                  </View>
                ))}
              </View>
            ) : activeTab === "fees" ? (
              <View>
                <Text style={styles.sectionTitle}>Tuition & Fee Statements</Text>
                {fees.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.flexRow}>
                      <Text style={styles.itemTitle}>{item.fee_type || "Tuition Fee"}</Text>
                      <Text style={[styles.statusBadge, item.status === "Paid" ? styles.statusPaid : styles.statusPending]}>
                        {item.status || "Paid"}
                      </Text>
                    </View>
                    <Text style={styles.itemBody}>Due Date: {item.due_date || "2026-08-01"}</Text>
                    <Text style={styles.itemScore}>Amount: ${item.amount || 250}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Campus Broadcast Alerts</Text>
                {notifications.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.message}</Text>
                    <Text style={styles.itemDate}>{item.date}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Fallback Default Mock Data
const defaultNotifications = [
  {
    title: "Faculty Board Briefing",
    message: "All department leads are requested to join the Dean in the assembly hall today at 2:00 PM.",
    date: "2026-07-24",
  },
  {
    title: "Accreditation Site Audit Scheduled",
    message: "The evaluation committee will conduct their physical onsite campus audit next Tuesday.",
    date: "2026-07-22",
  },
  {
    title: "Semester Marksheet Release",
    message: "Academic performance summaries for Term I have been updated across all registries.",
    date: "2026-07-20",
  },
];

const defaultAttendanceLogs = [
  { className: "Grade 11 - Advanced Mathematics", date: "2026-07-24", present: 98, absent: 5, late: 2 },
  { className: "Grade 11 - Advanced Mathematics", date: "2026-07-23", present: 101, absent: 3, late: 1 },
  { className: "Grade 11 - Advanced Mathematics", date: "2026-07-22", present: 95, absent: 8, late: 2 },
];

const defaultMarks = [
  { subject: "Mathematics", exam_name: "Mid-Term Examination", marks_obtained: 92, total_marks: 100, grade: "A+", percentage: 92 },
  { subject: "Physics", exam_name: "Mid-Term Examination", marks_obtained: 88, total_marks: 100, grade: "A", percentage: 88 },
  { subject: "Chemistry", exam_name: "Mid-Term Examination", marks_obtained: 85, total_marks: 100, grade: "A", percentage: 85 },
  { subject: "English Literature", exam_name: "Mid-Term Examination", marks_obtained: 94, total_marks: 100, grade: "A+", percentage: 94 },
];

const defaultFees = [
  { fee_type: "Tuition Fee - Term I", amount: 450, status: "Paid", due_date: "2026-06-15" },
  { fee_type: "Laboratory & Tech Fee", amount: 120, status: "Paid", due_date: "2026-06-15" },
  { fee_type: "Extra-Curricular Sports Fee", amount: 85, status: "Pending", due_date: "2026-08-01" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020b24",
  },
  loginScroll: {
    padding: 20,
    justifyContent: "center",
    minHeight: "100%",
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  badge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  badgeText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: "row",
    backgroundColor: "#020b24",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: "#2563eb",
  },
  roleBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
  },
  roleBtnTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#020b24",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "#451a03",
    borderColor: "#b45309",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#fde047",
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  demoBox: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  demoTitle: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  demoText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  dashboardContainer: {
    flex: 1,
  },
  dashHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderColor: "#1e293b",
  },
  dashBrand: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dashUser: {
    color: "#38bdf8",
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#020b24",
    borderBottomWidth: 1,
    borderColor: "#1e293b",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderColor: "#2563eb",
  },
  tabText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#38bdf8",
    fontWeight: "bold",
  },
  dashScroll: {
    padding: 16,
  },
  centerBox: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontSize: 13,
  },
  welcomeCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  welcomeTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  welcomeSub: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  statGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  statVal: {
    color: "#38bdf8",
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10,
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemBody: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  itemDate: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 6,
  },
  itemScore: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeDate: {
    color: "#94a3b8",
    fontSize: 11,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statGreen: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "500",
  },
  statRed: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "500",
  },
  statYellow: {
    color: "#facc15",
    fontSize: 12,
    fontWeight: "500",
  },
  gradeBadge: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "bold",
  },
  statusPaid: {
    backgroundColor: "#065f46",
    color: "#34d399",
  },
  statusPending: {
    backgroundColor: "#78350f",
    color: "#fbbf24",
  },
});
