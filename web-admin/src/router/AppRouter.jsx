import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import LoginPage from '../features/auth/LoginPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import RegisterPage from '../features/auth/RegisterPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import StudentsPage from '../features/students/StudentsPage';
import GradesPage from '../features/grades/GradesPage';
import PaymentsPage from '../features/payments/PaymentsPage';
import SubjectsPage from '../features/subjects/SubjectsPage';
import UsersPage from '../features/users/UsersPage';
import TeachersPage from '../features/teachers/TeachersPage';
import TuitionPage from '../features/tuition/TuitionPage';
import EnrollmentBatchesPage from '../features/enrollment-batches/EnrollmentBatchesPage';
import ApprovalsPage from '../features/approvals/ApprovalsPage';
import EnrolledStudentsPage from '../features/enrolled-students/EnrolledStudentsPage';
import ReportsPage from '../features/reports/ReportsPage';
import AnnouncementsPage from '../features/announcements/AnnouncementsPage';
import TranscriptPage from '../features/transcript/TranscriptPage';
import TeacherClassesPage from '../features/teacher/TeacherClassesPage';
import AuditLogsPage from '../features/audit-logs/AuditLogsPage';
import AcademicSettingsPage from '../features/academic-settings/AcademicSettingsPage';
import CoursesPage from '../features/courses/CoursesPage';
import TeachingLoadPage from '../features/teaching-load/TeachingLoadPage';
import SectionsPage from '../features/sections/SectionsPage';
import EvaluationPage from '../features/evaluation/EvaluationPage';
import RegistrationPage from '../features/registration/RegistrationPage';
import DeanGradesPage from '../features/grades/DeanGradesPage';
import AllGradesPage from '../features/grades/AllGradesPage';
import DocumentRequestsPage from '../features/document-requests/DocumentRequestsPage';
import { logout, setSession } from '../features/auth/authSlice';

function normalizeAdminUser(data) {
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    studentId: data.student_id || data.studentId || null,
  };
}

function AppRouterInner() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (accessToken && user) {
      setReady(true);
      return;
    }

    (async () => {
      try {
        const refreshRes = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const { accessToken: nextAccessToken } = refreshRes.data;
        const meRes = await axios.get('/api/v1/auth/me', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${nextAccessToken}` },
        });
        const nextUser = normalizeAdminUser(meRes.data || {});

        if (!nextUser.role || nextUser.role === 'student') {
          throw new Error('Admin/staff session required');
        }

        dispatch(setSession({ accessToken: nextAccessToken, user: nextUser }));
      } catch {
        await axios.post('/api/v1/auth/logout', {}, { withCredentials: true }).catch(() => {});
        dispatch(logout());
      } finally {
        setReady(true);
      }
    })();
  }, [accessToken, dispatch, user]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-slate-200 border-t-[#7a1324] animate-spin" />
          <p className="text-sm text-slate-500">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar', 'dean', 'teacher']} />}>
            <Route path="/students" element={<StudentsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar']} />}>
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/registration" element={<RegistrationPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['staff', 'teacher', 'dean']} />}>
            <Route path="/grades" element={<GradesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff', 'dean', 'registrar']} />}>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
            <Route path="/enrollment-batches" element={<EnrollmentBatchesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['dean']} />}>
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/dean/grades" element={<DeanGradesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar']} />}>
            <Route path="/all-grades" element={<AllGradesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'dean']} />}>
            <Route path="/teaching-load" element={<TeachingLoadPage />} />
            <Route path="/sections" element={<SectionsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'cashier']} />}>
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/tuition" element={<TuitionPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar', 'dean']} />}>
            <Route path="/subjects" element={<SubjectsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar', 'dean']} />}>
            <Route path="/enrolled-students" element={<EnrolledStudentsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar', 'dean']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar']} />}>
            <Route path="/document-requests" element={<DocumentRequestsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff', 'registrar', 'dean']} />}>
            <Route path="/teachers" element={<TeachersPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar', 'dean']} />}>
            <Route path="/transcript/:studentId" element={<TranscriptPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar']} />}>
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/academic-settings" element={<AcademicSettingsPage />} />
            <Route path="/courses" element={<CoursesPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppRouterInner />
    </BrowserRouter>
  );
}
