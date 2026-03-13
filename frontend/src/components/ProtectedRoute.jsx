import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute — redirects to login if user is not authenticated.
 * Also enforces role-based access: if `requiredRole` is set,
 * users with a different role are bounced to their own dashboard.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Not logged in at all
  if (!token) {
    const loginPath = requiredRole === 'doctor'
      ? '/doctor/login'
      : requiredRole === 'pharmacy'
      ? '/pharmacy/login'
      : '/patient/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (requiredRole && role !== requiredRole) {
    const dashPath = role === 'doctor'
      ? '/doctor/dashboard'
      : role === 'pharmacy'
      ? '/pharmacy/dashboard'
      : '/patient/dashboard';
    return <Navigate to={dashPath} replace />;
  }

  return children;
}
