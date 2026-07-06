import { useState } from 'react'
import Login from './components/Login'
import TeacherDashboard from './components/TeacherDashboard'
import StudentChat from './components/StudentChat'
import './index.css'

function App() {
  // 'login', 'teacher_dashboard', 'student_chat'
  const [currentView, setCurrentView] = useState('login')

  return (
    <div className="app-container">
      {/* Simple navigation for the prototype to switch between views */}
      <nav style={{ padding: '1rem', background: '#fff', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="btn btn-outline" onClick={() => setCurrentView('login')}>شاشة الدخول</button>
        <button className="btn btn-outline" onClick={() => setCurrentView('teacher_dashboard')}>لوحة المعلم</button>
        <button className="btn btn-outline" onClick={() => setCurrentView('student_chat')}>محادثة الطالب</button>
      </nav>

      <main style={{ padding: '2rem 1rem' }}>
        {currentView === 'login' && <Login onLogin={() => setCurrentView('teacher_dashboard')} />}
        {currentView === 'teacher_dashboard' && <TeacherDashboard />}
        {currentView === 'student_chat' && <StudentChat />}
      </main>
    </div>
  )
}

export default App
