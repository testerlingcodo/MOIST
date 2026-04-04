import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
  const { accessToken, user } = useSelector((s) => s.auth);
  if (!accessToken) return <Navigate to="/login" replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
