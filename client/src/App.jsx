import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Membership from './pages/public/Membership';
import Contact from './pages/public/Contact';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import FeeStatus from './pages/student/FeeStatus';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import AdminLogin from './pages/admin/AdminLogin';
import AdminSecurity from './pages/admin/AdminSecurity';

const ProtectedRoute = ({ children, role }) => {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Verifying session...
      </div>
    );
  }
  if (!user) return <Navigate to={role === 'ADMIN' ? '/admin/login' : '/login'} replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/portal'} replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public Routes with standard Navbar/Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/contact" element={<Contact />} />

        {/* Student Portal - Protected */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/fees"
          element={
            <ProtectedRoute role="STUDENT">
              <FeeStatus />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Dashboard Routes - Sidebar Layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="security" element={<AdminSecurity />} />
      </Route>
    </Routes>
  );
}
