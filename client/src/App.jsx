import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Membership from './pages/public/Membership';
import Contact from './pages/public/Contact';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import FeeStatus from './pages/student/FeeStatus';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import AdminLogin from './pages/admin/AdminLogin';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
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
        <Route path="/portal" element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/portal/fees" element={
          <ProtectedRoute role="student">
            <FeeStatus />
          </ProtectedRoute>
        } />
      </Route>

      {/* Admin Login - No Layout */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Dashboard Routes - Sidebar Layout */}
      <Route path="/admin" element={
        <ProtectedRoute role="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentManagement />} />
      </Route>
    </Routes>
  );
}
