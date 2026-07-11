import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Terminal, Monitor, MessageSquare, Plus, Book, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import areefMascot from '../../assets/areef_mascot.png';

export default function Sidebar({ toggleMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, userRoles, userRole } = useAuth();
  const path = location.pathname;

  const roles = userRoles && userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
  const isTeacher = roles.includes('teacher') || (!roles.includes('student') && !roles.includes('new'));
  const isStudent = roles.includes('student');

  const [theme, setTheme] = useState(localStorage.getItem('areef_theme') || 'light');
  const [chatHistory, setChatHistory] = useState([]);
  const [hwExpanded, setHwExpanded] = useState(false);
  const [homeworks, setHomeworks] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('areef_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'terminal' : 'light');
  };

  useEffect(() => {
    if (isStudent && user) {
      fetchChatHistory();
      fetchHomeworks();
    }
  }, [isStudent, user]);

  const fetchChatHistory = async () => {
    const { data } = await supabase.from('student_chats')
      .select('id, title, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setChatHistory(data);
  };

  const fetchHomeworks = async () => {
    // In a real scenario, we fetch classes then homeworks. For now, fetch recent homeworks from student's classes.
    const { data: enrollmentData } = await supabase.from('class_students').select('class_id').eq('student_id', user.id);
    if (enrollmentData && enrollmentData.length > 0) {
      const classIds = enrollmentData.map(e => e.class_id);
      const { data } = await supabase.from('homeworks').select('*').in('class_id', classIds).order('created_at', { ascending: false }).limit(5);
      if (data) setHomeworks(data);
    }
  };

  if (isStudent) {
    // ChatGPT Style Sidebar for Student
    return (
      <aside id="layout-menu" className="layout-menu menu-vertical menu bg-dark text-white" style={{ backgroundColor: '#171717 !important' }}>
        <div className="p-3">
          <Link to="/student-dashboard" className="btn btn-outline-light w-100 d-flex justify-content-start align-items-center gap-2" style={{ borderRadius: '8px', border: '1px solid #404040', color: 'white' }}>
            <Plus size={18} />
            <span className="fw-semibold">محادثة جديدة</span>
          </Link>
        </div>

        <div className="menu-inner-shadow"></div>

        <ul className="menu-inner py-1 overflow-auto" style={{ height: 'calc(100vh - 150px)' }}>
          {/* Homeworks Section */}
          <li className="menu-item mt-2">
            <a href="#!" className="menu-link text-white d-flex justify-content-between align-items-center" onClick={() => setHwExpanded(!hwExpanded)}>
              <div className="d-flex align-items-center gap-2">
                <Book size={18} />
                <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>واجباتي المدرسية</span>
              </div>
              {hwExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </a>
            {hwExpanded && (
              <ul className="menu-sub list-unstyled px-3 mt-2">
                {homeworks.length === 0 ? (
                  <li className="text-muted" style={{ fontSize: '0.8rem' }}>لا توجد واجبات حالياً</li>
                ) : (
                  homeworks.map(hw => (
                    <li key={hw.id} className="mb-2">
                      <Link to={`/student-chat/${hw.class_id}`} className="text-white text-decoration-none d-block p-2 hover-bg-secondary rounded" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📝 {hw.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>

          <li className="menu-header small text-uppercase mt-4 mb-2 px-3">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>اليوم</span>
          </li>

          {/* Chat History Section */}
          {chatHistory.length === 0 ? (
            <li className="px-3 text-muted" style={{ fontSize: '0.8rem' }}>لا توجد محادثات سابقة</li>
          ) : (
            chatHistory.map(chat => (
              <li key={chat.id} className="menu-item mb-1 px-2">
                <a href={`/student-dashboard?chat=${chat.id}`} className="menu-link text-white d-flex align-items-center gap-2 p-2 hover-bg-secondary rounded text-decoration-none" style={{ transition: 'background 0.2s' }}>
                  <MessageSquare size={16} className="text-muted" />
                  <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
                </a>
              </li>
            ))
          )}
        </ul>

        {/* Bottom User Area */}
        <div className="p-3 border-top" style={{ borderColor: '#404040 !important' }}>
          <Link to="/profile" className="d-flex align-items-center gap-2 text-white text-decoration-none">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '32px', height: '32px' }}>
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>{user?.user_metadata?.full_name || 'حساب الطالب'}</span>
          </Link>
        </div>
      </aside>
    );
  }

  // Regular Sidebar for Teacher / Admin
  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
      <div className="app-brand demo">
        <Link to="/" className="app-brand-link">
          <span className="app-brand-logo demo">
            <img src={areefMascot} alt="عريف" width="40" height="40" className="rounded-circle" />
          </span>
          <span className="app-brand-text demo menu-text fw-bold ms-3">عريف</span>
        </Link>
        <a href="#!" onClick={toggleMenu} className="layout-menu-toggle menu-link text-large ms-auto d-xl-none">
          <i className="ti tabler-x"></i>
        </a>
      </div>

      <div className="menu-inner-shadow"></div>

      <ul className="menu-inner py-1">
        <li className="menu-header small text-uppercase">
          <span className="menu-header-text">القائمة الرئيسية</span>
        </li>

        {isTeacher && (
          <li className={`menu-item ${path.startsWith('/teacher') ? 'active' : ''}`}>
            <Link to="/teacher-dashboard" className="menu-link">
              <i className="menu-icon tf-icons ti tabler-chalkboard"></i>
              <div>لوحة المعلم</div>
            </Link>
          </li>
        )}

        <li className={`menu-item ${path.startsWith('/curriculum') ? 'active' : ''}`}>
          <Link to="/curriculum" className="menu-link">
            <i className="menu-icon tf-icons ti tabler-book"></i>
            <div>بنك المناهج</div>
          </Link>
        </li>

        {isTeacher && (
          <li className={`menu-item ${path.startsWith('/store') ? 'active' : ''}`}>
            <Link to="/store" className="menu-link">
              <i className="menu-icon tf-icons ti tabler-shopping-cart"></i>
              <div>المتجر</div>
            </Link>
          </li>
        )}

        {isAdmin && (
          <li className={`menu-item ${path.startsWith('/admin') ? 'active' : ''}`}>
            <Link to="/admin" className="menu-link">
              <i className="menu-icon tf-icons ti tabler-settings"></i>
              <div>الإعدادات (المدير)</div>
            </Link>
          </li>
        )}

        <li className="menu-header small text-uppercase mt-4">
          <span className="menu-header-text">الخدمات الإضافية</span>
        </li>

        <li className={`menu-item ${path.startsWith('/profile') ? 'active' : ''}`}>
          <Link to="/profile" className="menu-link">
            <i className="menu-icon tf-icons ti tabler-id"></i>
            <div>الملف الشخصي</div>
          </Link>
        </li>

        <li className={`menu-item ${path.startsWith('/support') ? 'active' : ''}`}>
          <Link to="/support" className="menu-link">
            <i className="menu-icon tf-icons ti tabler-lifebuoy"></i>
            <div>الدعم الفني</div>
          </Link>
        </li>

        <li className="menu-item mt-3">
          <a href="#!" className="menu-link text-warning" onClick={toggleTheme}>
            <i className="menu-icon tf-icons ti tabler-color-swatch"></i>
            <div>{theme === 'terminal' ? 'المظهر العادي' : 'مظهر المبرمجين'}</div>
          </a>
        </li>
      </ul>
    </aside>
  );
}
