import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './components/Login'
import RoleSelection from './components/RoleSelection'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LayoutWrapper from './components/layout/LayoutWrapper'
import LoadingScreen from './components/LoadingScreen'
import './index.css'

// Lazy loaded components for performance scaling
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const CurriculumBank = lazy(() => import('./components/CurriculumBank'));
const StudentChat = lazy(() => import('./components/StudentChat'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const Store = lazy(() => import('./components/Store'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Support = lazy(() => import('./components/Support'));

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
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
      <PWAInstallPrompt />
    </LayoutWrapper>
  );
}

import { ToastProvider } from './contexts/ToastContext'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App;
