import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Terminal, Monitor, MessageSquare, Plus, Book, Clock, ChevronDown, ChevronUp, Users, LogIn } from 'lucide-react';
import areefMascot from '../../assets/areef_mascot.png';
import { useToast } from '../../contexts/ToastContext';

export default function Sidebar({ toggleMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, userRoles, userRole } = useAuth();
  const path = location.pathname;

  const roles = userRoles && userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
  const isTeacher = roles.includes('teacher') || (!roles.includes('student') && !roles.includes('new'));
  const isStudent = roles.includes('student');

  const { toast } = useToast();
  const [theme, setTheme] = useState(localStorage.getItem('areef_theme') || 'light');
  const [chatHistory, setChatHistory] = useState([]);
  const [classesExpanded, setClassesExpanded] = useState(false);
  const [classes, setClasses] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

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
      fetchClasses();
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

  const fetchClasses = async () => {
    const { data: enrollmentData } = await supabase.from('class_enrollments').select('class_id, classes(*)').eq('student_id', user.id);
    if (enrollmentData && enrollmentData.length > 0) {
      setClasses(enrollmentData.map(e => e.classes));
    } else {
      setClasses([]);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    // Find class by code
    const { data: classData } = await supabase.from('classes').select('id, name').eq('join_code', joinCode.trim().toUpperCase()).single();
    
    if (!classData) {
      toast.error('كود الفصل غير صحيح');
      return;
    }

    // Check if already enrolled
    const { data: existing } = await supabase.from('class_enrollments').select('*').eq('class_id', classData.id).eq('student_id', user.id).single();
    if (existing) {
      toast.error('أنت منضم لهذا الفصل مسبقاً');
      return;
    }

    // Join
    const { error } = await supabase.from('class_enrollments').insert({
      class_id: classData.id,
      student_id: user.id
    });

    if (error) {
      toast.error('حدث خطأ أثناء الانضمام');
    } else {
      toast.success(`تم الانضمام إلى فصل ${classData.name} بنجاح!`);
      setJoinCode('');
      setShowJoinModal(false);
      fetchClasses();
      navigate('/student-dashboard'); // Refresh dashboard state if needed
    }
  };

  if (isStudent) {
    // ChatGPT Style Sidebar for Student
    return (
      <aside id="layout-menu" className="layout-menu menu-vertical menu bg-dark text-white" style={{ backgroundColor: '#171717 !important' }}>
        <div className="p-3">
          <Link to="/student-dashboard" className="btn btn-outline-light w-100 d-flex justify-content-start align-items-center gap-2 mb-2" style={{ borderRadius: '8px', border: '1px solid #404040', color: 'white' }}>
            <Plus size={18} />
            <span className="fw-semibold">محادثة جديدة</span>
          </Link>
          <button onClick={() => setShowJoinModal(true)} className="btn w-100 d-flex justify-content-start align-items-center gap-2" style={{ borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>
            <LogIn size={18} />
            <span className="fw-semibold">الانضمام لفصل</span>
          </button>
        </div>

        <div className="menu-inner-shadow"></div>

        <ul className="menu-inner py-1 overflow-auto" style={{ height: 'calc(100vh - 190px)' }}>
          {/* Classes Section */}
          <li className="menu-item mt-2">
            <a href="#!" className="menu-link text-white d-flex justify-content-between align-items-center" onClick={() => setClassesExpanded(!classesExpanded)}>
              <div className="d-flex align-items-center gap-2">
                <Users size={18} />
                <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>فصولي</span>
              </div>
              {classesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </a>
            {classesExpanded && (
              <ul className="menu-sub list-unstyled px-3 mt-2">
                {classes.length === 0 ? (
                  <li className="text-muted" style={{ fontSize: '0.8rem' }}>لم تنضم لأي فصل</li>
                ) : (
                  classes.map(cls => (
                    <li key={cls.id} className="mb-2">
                      <button onClick={() => navigate(`/student-dashboard?classId=${cls.id}`)} className="btn btn-link text-white text-decoration-none d-block p-2 hover-bg-secondary rounded w-100 text-start" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        🎓 {cls.name}
                      </button>
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

      {/* Join Class Modal for Student Sidebar */}
      {showJoinModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-dark">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">الانضمام لفصل جديد</h5>
                <button type="button" className="btn-close" onClick={() => setShowJoinModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleJoinClass}>
                  <div className="mb-4">
                    <label className="form-label text-muted">أدخل كود الفصل (6 أحرف/أرقام)</label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg text-center fw-bold"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="ABCDEF"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={joinCode.length < 6}>
                    تأكيد الانضمام
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
