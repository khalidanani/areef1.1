import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import areefMascot from '../assets/areef_mascot.png';
import { GraduationCap, Presentation } from 'lucide-react';

export default function LandingRoleSelect() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'teacher') navigate('/teacher-dashboard');
      else if (userRole === 'student') navigate('/student-dashboard');
    }
  }, [user, userRole, navigate]);

  const handleSelectRole = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
      <div className="text-center mb-5">
        <img src={areefMascot} alt="عريف" className="img-fluid rounded-circle shadow mb-4" style={{ width: '120px', height: '120px' }} />
        <h1 className="display-5 fw-bold text-primary mb-2">مرحباً بك في عَريـف 👋</h1>
        <p className="lead text-muted">المساعد التعليمي الذكي الأول المدعوم بالذكاء الاصطناعي</p>
      </div>

      <div className="row w-100 max-w-4xl justify-content-center g-4 px-3" style={{ maxWidth: '800px' }}>
        <div className="col-12 col-md-6">
          <div 
            onClick={() => handleSelectRole('student')}
            className="card h-100 border-0 shadow-sm text-center p-5 cursor-pointer hover-shadow transition-all"
            style={{ borderRadius: '24px', backgroundColor: '#ffffff', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
          >
            <div className="mb-4 d-flex justify-content-center">
              <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                <GraduationCap size={40} className="text-primary" />
              </div>
            </div>
            <h3 className="fw-bold mb-3">أنا طالب</h3>
            <p className="text-muted mb-0">ابدأ التعلم وحل الواجبات مع المساعد الذكي الذي يفهمك.</p>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div 
            onClick={() => handleSelectRole('teacher')}
            className="card h-100 border-0 shadow-sm text-center p-5 cursor-pointer hover-shadow transition-all"
            style={{ borderRadius: '24px', backgroundColor: '#ffffff', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
          >
            <div className="mb-4 d-flex justify-content-center">
              <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                <Presentation size={40} className="text-success" />
              </div>
            </div>
            <h3 className="fw-bold mb-3">أنا معلم</h3>
            <p className="text-muted mb-0">أدر فصولك، وأنشئ الواجبات، وتصفح متجر المناهج بكل سهولة.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
