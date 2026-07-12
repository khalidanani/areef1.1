import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import areefMascot from '../assets/areef_mascot.png';
import { GraduationCap, Presentation, ArrowRight } from 'lucide-react';

export default function SelectLoginRole() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className={`select-role-root w-100 ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`} style={{ maxWidth: '500px', margin: '0 auto' }}>
      <style>{`
        .select-role-root {
          font-family: 'Cairo', 'Tajawal', sans-serif;
        }
        .theme-light {
          --text-main: #1e293b;
          --text-muted: #64748b;
          --card-bg: rgba(255, 255, 255, 0.9);
          --card-border: rgba(0, 0, 0, 0.08);
          --shadow-color: rgba(37, 99, 235, 0.08);
        }
        .theme-dark {
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --card-bg: #1e293b;
          --card-border: rgba(255, 255, 255, 0.08);
          --shadow-color: rgba(0, 0, 0, 0.3);
        }
        .role-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 8px 24px var(--shadow-color);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--text-main);
        }
        .role-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(43, 108, 203, 0.15);
        }
        .role-card.student:hover {
          border-color: #2b6ccb;
        }
        .role-card.teacher:hover {
          border-color: #10b981;
        }
      `}</style>

      <div className="card text-center border-0 bg-transparent">
        <div className="card-body p-4">
          {/* Logo */}
          <div className="mb-4">
            <img src={areefMascot} alt="عريف" className="img-fluid rounded-circle shadow-sm" style={{ width: '90px', height: '90px' }} />
          </div>
          
          <h4 className="fw-bold mb-2">تسجيل الدخول إلى عريف</h4>
          <p className="text-muted mb-4 small">يرجى تحديد هويتك للانتقال إلى بوابة الدخول المناسبة</p>

          {/* Options */}
          <div className="d-flex flex-column gap-3 mb-4">
            {/* Student Card */}
            <div 
              onClick={() => handleSelectRole('student')}
              className="role-card student p-4 d-flex align-items-center gap-3 text-start"
            >
              <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                <GraduationCap size={30} className="text-primary" />
              </div>
              <div>
                <h5 className="fw-bold mb-1 text-primary">بوابة الطالب</h5>
                <p className="text-muted mb-0 small">حل الواجبات، المذاكرة الذكية، وكسب المكافآت</p>
              </div>
            </div>

            {/* Teacher Card */}
            <div 
              onClick={() => handleSelectRole('teacher')}
              className="role-card teacher p-4 d-flex align-items-center gap-3 text-start"
            >
              <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                <Presentation size={30} className="text-success" />
              </div>
              <div>
                <h5 className="fw-bold mb-1 text-success">بوابة المعلم</h5>
                <p className="text-muted mb-0 small">إدارة الفصول، بنك المناهج، وتصحيح الواجبات</p>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <button 
            onClick={() => navigate('/')}
            className="btn btn-link text-muted d-inline-flex align-items-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            <ArrowRight size={16} />
            <span>العودة للرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
