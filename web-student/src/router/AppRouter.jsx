import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from '../components/layout/Layout';
import LoginPage from '../features/auth/LoginPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import EnrollmentPage from '../features/enrollment/EnrollmentPage';
import GradesPage from '../features/grades/GradesPage';
import ProfilePage from '../features/profile/ProfilePage';
import AnnouncementsPage from '../features/announcements/AnnouncementsPage';
import StudentPaymentsPage from '../features/payments/StudentPaymentsPage';
import PaymentSuccessPage from '../features/payments/PaymentSuccessPage';
import PaymentFailedPage from '../features/payments/PaymentFailedPage';
import ProspectusPage from '../features/grades/ProspectusPage';
import DocumentRequestsPage from '../features/document-requests/DocumentRequestsPage';

function RequireAuth({ children }) {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(122,19,36,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7a1324" strokeWidth={2} className="w-8 h-8">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-black" style={{ color: '#7a1324' }}>Access Denied</h2>
          <p className="text-slate-500 text-sm mt-2">This portal is for students only. Please use the admin portal.</p>
        </div>
      </div>
    );
  }
  return children;
}

function GuestOnly({ children }) {
  const { user } = useSelector((s) => s.auth);
  if (user?.role === 'student') return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/payment-failed" element={<PaymentFailedPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/enrollment" element={<EnrollmentPage />} />
                <Route path="/grades" element={<GradesPage />} />
                <Route path="/prospectus" element={<ProspectusPage />} />
                <Route path="/payments" element={<StudentPaymentsPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/document-requests" element={<DocumentRequestsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
