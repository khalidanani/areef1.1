import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './components/Login'
import TeacherDashboard from './components/TeacherDashboard'
import CurriculumBank from './components/CurriculumBank'
import StudentChat from './components/StudentChat'
import StudentDashboard from './components/StudentDashboard'
import RoleSelection from './components/RoleSelection'
import Store from './components/Store'
import AdminSettings from './components/AdminSettings'
import UserProfile from './components/UserProfile'
import Support from './components/Support'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LayoutWrapper from './components/layout/LayoutWrapper'
import './index.css'

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="container-xxl container-p-y text-center mt-5">
        <h2 className="mb-4">يجب تسجيل الدخول للوصول إلى هذه الصفحة</h2>
        <Link to="/" className="btn btn-primary">العودة لتسجيل الدخول</Link>
      </div>
    );
  }
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/role-selection';
  
  if (isAuthPage) {
    return (
      <div className="layout-wrapper layout-content-navbar layout-without-menu">
        <div className="layout-container">
          <div className="layout-page">
            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y d-flex justify-content-center align-items-center">
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/role-selection" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
        <PWAInstallPrompt />
      </div>
    );
  }

  return (
    <LayoutWrapper>
      <Routes>
        <Route path="/teacher-dashboard" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/curriculum" element={<ProtectedRoute><CurriculumBank /></ProtectedRoute>} />
        <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student-chat/:classId" element={<ProtectedRoute><StudentChat /></ProtectedRoute>} />
        <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      </Routes>
      <PWAInstallPrompt />
    </LayoutWrapper>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App;
