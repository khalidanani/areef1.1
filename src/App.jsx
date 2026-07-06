import { useState } from 'react'
import Login from './components/Login'
import TeacherDashboard from './components/TeacherDashboard'
import StudentChat from './components/StudentChat'
import { useAuth } from './contexts/AuthContext'
import './index.css'

function App() {
  const { user, loading, signOut } = useAuth()
  const [currentView, setCurrentView] = useState('teacher_dashboard')

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>جاري التحميل...</div>
  }

  // إذا لم يكن مسجلاً، اظهر فقط شاشة تسجيل الدخول
  if (!user) {
    return (
      <div className="app-container">
        <main style={{ padding: '2rem 1rem' }}>
          <Login />
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Simple navigation for the prototype to switch between views */}
      <nav style={{ padding: '1rem', background: '#fff', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="btn btn-outline" onClick={() => setCurrentView('login')}>شاشة الدخول</button>
        <button className="btn btn-outline" onClick={() => setCurrentView('teacher_dashboard')}>لوحة المعلم</button>
        <button className="btn btn-outline" onClick={() => setCurrentView('student_chat')}>محادثة الطالب</button>
        <button className="btn btn-outline" onClick={signOut} style={{ color: 'red', borderColor: 'red' }}>تسجيل الخروج</button>
      </nav>

      <main style={{ padding: '2rem 1rem' }}>
        {currentView === 'teacher_dashboard' && <TeacherDashboard />}
        {currentView === 'student_chat' && <StudentChat />}
      </main>
    </div>
  )
}

export default App
