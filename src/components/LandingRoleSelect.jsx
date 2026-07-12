import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import areefMascot from '../assets/areef_mascot.png';
import { 
  GraduationCap, 
  Presentation, 
  Sun, 
  Moon, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export default function LandingRoleSelect() {
  const { user, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'teacher') navigate('/teacher-dashboard');
      else if (userRole === 'student') navigate('/student-dashboard');
    }
  }, [user, userRole, navigate]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-root ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Dynamic CSS Styles */}
      <style>{`
        .landing-root {
          font-family: 'Cairo', 'Tajawal', sans-serif;
          transition: background-color 0.4s ease, color 0.4s ease;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        /* Theme Variables */
        .theme-light {
          --bg-gradient: linear-gradient(135deg, #f0f7ff 0%, #e6fffa 50%, #ffffff 100%);
          --text-main: #1e293b;
          --text-muted: #64748b;
          --card-bg: rgba(255, 255, 255, 0.85);
          --card-border: rgba(255, 255, 255, 0.5);
          --shadow-color: rgba(37, 99, 235, 0.08);
          --nav-bg: rgba(255, 255, 255, 0.8);
          --accent-pill: #e6f0fa;
          --primary-color: #2b6ccb;
        }
        
        .theme-dark {
          --bg-gradient: linear-gradient(135deg, #0f172a 0%, #050b14 50%, #1e1b4b 100%);
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --card-bg: rgba(30, 41, 59, 0.7);
          --card-border: rgba(255, 255, 255, 0.08);
          --shadow-color: rgba(0, 0, 0, 0.35);
          --nav-bg: rgba(15, 23, 42, 0.8);
          --accent-pill: rgba(43, 108, 203, 0.15);
          --primary-color: #3b82f6;
        }

        .landing-root {
          background: var(--bg-gradient);
          color: var(--text-main);
        }

        /* Glassmorphism Classes */
        .glass-nav {
          background-color: var(--nav-bg);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--card-border);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .glass-card {
          background: var(--card-bg);
          backdrop-filter: blur(8px);
          border: 1px solid var(--card-border);
          box-shadow: 0 10px 30px var(--shadow-color);
          border-radius: 24px;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
        }

        .glass-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(43, 108, 203, 0.15);
        }

        /* Hero styles */
        .mascot-container {
          position: relative;
          display: inline-block;
        }

        .mascot-image {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border: 5px solid var(--card-border);
          box-shadow: 0 0 30px rgba(43, 108, 203, 0.2);
          animation: float 4s ease-in-out infinite;
        }

        .glow-ring {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border-radius: 50%;
          border: 2px dashed var(--primary-color);
          opacity: 0.3;
          animation: spin 20s linear infinite;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        /* Accent Badge */
        .accent-pill {
          background-color: var(--accent-pill);
          color: var(--primary-color);
          padding: 8px 16px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 20px;
        }

        /* Stats */
        .stat-box {
          border-left: 3px solid var(--primary-color);
          padding-left: 15px;
        }

        .btn-gradient-primary {
          background: linear-gradient(135deg, #2b6ccb 0%, #1e4d91 100%);
          color: white !important;
          border: none;
          box-shadow: 0 4px 15px rgba(43, 108, 203, 0.3);
        }

        .btn-gradient-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(43, 108, 203, 0.4);
        }

        .btn-outline-custom {
          border: 2px solid var(--primary-color);
          color: var(--primary-color);
          background: transparent;
        }

        .btn-outline-custom:hover {
          background-color: var(--primary-color);
          color: white;
        }
      `}</style>

      {/* Floating Header */}
      <nav className="glass-nav py-3">
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <img src={areefMascot} alt="عريف" className="rounded-circle" style={{ width: '40px', height: '40px' }} />
            <span className="fs-4 fw-bold text-primary mb-0">عَريـف</span>
          </div>

          <div className="d-flex align-items-center gap-4">
            <div className="d-none d-md-flex gap-3 text-secondary">
              <span className="cursor-pointer hover-text-primary" onClick={() => scrollToSection('features')}>المميزات</span>
              <span className="cursor-pointer hover-text-primary" onClick={() => scrollToSection('stats')}>الأرقام</span>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Dark Mode Switcher */}
              <button 
                onClick={toggleTheme} 
                className="btn btn-icon btn-label-secondary rounded-circle d-flex align-items-center justify-content-center p-0" 
                style={{ width: '40px', height: '40px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-primary" />}
              </button>

              <button onClick={() => navigate('/select-role')} className="btn btn-primary btn-sm px-3">
                تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="container pt-5 mt-5 pb-5">
        <div className="row align-items-center min-vh-75 pt-5 g-5">
          <div className="col-lg-7 text-center text-lg-start">
            <div className="accent-pill">
              <Sparkles size={16} />
              <span>مستقبل التعليم الذكي بالمملكة العربية السعودية</span>
            </div>
            
            <h1 className="display-4 fw-black mb-3 lh-base" style={{ fontWeight: 800 }}>
              مرحباً بك في <span className="text-primary">عَريـف</span> 👋
            </h1>
            <h2 className="h3 text-secondary fw-semibold mb-4">
              المساعد التعليمي الشخصي الأول المدعوم بالذكاء الاصطناعي
            </h2>
            <p className="lead mb-5 text-muted" style={{ maxWidth: '650px', fontSize: '1.15rem', lineHeight: '1.8' }}>
              منصة تعليمية متكاملة مصممة خصيصاً للمناهج السعودية. نُمكّن المعلم من إدارة صفوفه وواجباته وتصحيحها في ثوانٍ، ونقود الطالب نحو التفوق الدراسي والتعلم التفاعلي بمساعدة الذكاء الاصطناعي.
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-3">
              <button onClick={() => navigate('/select-role')} className="btn btn-gradient-primary btn-lg px-4 py-3 fs-6 d-flex align-items-center justify-content-center gap-2">
                <span>ابدأ رحلتك التعليمية الآن</span>
                <ArrowLeft size={18} />
              </button>
              <button onClick={() => scrollToSection('features')} className="btn btn-outline-custom btn-lg px-4 py-3 fs-6">
                اكتشف الميزات
              </button>
            </div>
          </div>

          <div className="col-lg-5 text-center">
            <div className="mascot-container">
              <div className="glow-ring"></div>
              <img src={areefMascot} alt="تميمة عريف" className="mascot-image rounded-circle" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-5 my-5">
        <div className="text-center mb-5">
          <h2 className="display-6 fw-bold mb-3">كيف يخدم منصة <span className="text-primary">عريف</span> العملية التعليمية?</h2>
          <p className="text-muted lead mx-auto" style={{ maxWidth: '600px' }}>حلول ذكية متكاملة مصممة لتلبية احتياجات أركان التعليم الأساسية.</p>
        </div>

        <div className="row g-4 pt-4">
          {/* For Teachers Card */}
          <div className="col-md-6">
            <div className="glass-card h-100 p-5 d-flex flex-column">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 d-flex align-items-center justify-content-center text-success" style={{ width: '60px', height: '60px' }}>
                  <Presentation size={30} />
                </div>
                <div>
                  <span className="badge bg-success-subtle text-success mb-1">خاص بالمعلمين</span>
                  <h3 className="fw-bold m-0 h4">تمكين المعلم وتوفير وقته</h3>
                </div>
              </div>
              <p className="text-muted mb-4" style={{ lineHeight: '1.7' }}>
                نقدم أدوات ذكية تسهل التحضير والتدريس والتقييم، مما يتيح للمعلم التركيز على الإرشاد والتوجيه الفعلي للطلاب.
              </p>
              <ul className="list-unstyled flex-grow-1 d-flex flex-col gap-3">
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-success mt-1 flex-shrink-0" />
                  <span><strong>بنك المناهج الذكي:</strong> الوصول السريع للمحتوى وتخصيصه لجميع الصفوف الدراسية.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-success mt-1 flex-shrink-0" />
                  <span><strong>تصحيح آلي فوري:</strong> تصحيح الواجبات وتقديم تغذية راجعة دقيقة للطلاب تلقائياً.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-success mt-1 flex-shrink-0" />
                  <span><strong>تقارير ذكية للأداء:</strong> لوحة تحليلات تقيس مستوى الصف وتحدد نقاط الضعف بدقة.</span>
                </li>
              </ul>
              <button onClick={() => navigate('/select-role')} className="btn btn-success mt-4 py-2-5 w-100">
                الدخول كمعلم
              </button>
            </div>
          </div>

          {/* For Students Card */}
          <div className="col-md-6">
            <div className="glass-card h-100 p-5 d-flex flex-column">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-flex align-items-center justify-content-center text-primary" style={{ width: '60px', height: '60px' }}>
                  <GraduationCap size={30} />
                </div>
                <div>
                  <span className="badge bg-primary-subtle text-primary mb-1">خاص بالطلاب</span>
                  <h3 className="fw-bold m-0 h4">تعلم ذكي وتفاعلي ممتع</h3>
                </div>
              </div>
              <p className="text-muted mb-4" style={{ lineHeight: '1.7' }}>
                مساعد ذكي يرافق الطالب في رحلته الدراسية، يشرح ويناقش ويحفز على التعلم بأسلوب مرح وتوجيهي تفاعلي.
              </p>
              <ul className="list-unstyled flex-grow-1 d-flex flex-col gap-3">
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-primary mt-1 flex-shrink-0" />
                  <span><strong>المحادثة التفاعلية الذكية:</strong> نقاش مفتوح لشرح الدروس وحل المسائل خطوة بخطوة.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-primary mt-1 flex-shrink-0" />
                  <span><strong>تحفيز ونقاط:</strong> كسب النقاط عند إنهاء المذاكرة وحل الواجبات.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CheckCircle2 size={18} className="text-primary mt-1 flex-shrink-0" />
                  <span><strong>متجر الهدايا:</strong> استبدال النقاط بأدوات وعناصر تعبيرية تزيد من حماس الطالب.</span>
                </li>
              </ul>
              <button onClick={() => navigate('/select-role')} className="btn btn-primary mt-4 py-2-5 w-100">
                الدخول كطالب
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-5 my-5 bg-opacity-10 bg-primary" style={{ background: 'var(--accent-pill)', borderRadius: '32px', margin: '0 15px' }}>
        <div className="container">
          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="p-3 stat-box">
                <h3 className="display-5 fw-bold text-primary mb-2">+500</h3>
                <p className="lead m-0 fw-semibold">فصل دراسي مسجل</p>
                <small className="text-muted">موزعة على مختلف المراحل التعليمية</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 stat-box">
                <h3 className="display-5 fw-bold text-primary mb-2">+10K</h3>
                <p className="lead m-0 fw-semibold">واجب تم حله</p>
                <small className="text-muted">تم تصحيحها وتقديم التقييم آلياً</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 stat-box">
                <h3 className="display-5 fw-bold text-primary mb-2">99%</h3>
                <p className="lead m-0 fw-semibold">رضا وتفاعل</p>
                <small className="text-muted">من قبل المعلمين والطلاب المشتركين</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-5 border-top" style={{ borderColor: 'var(--card-border)', background: 'var(--nav-bg)' }}>
        <div className="container text-center">
          <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
            <img src={areefMascot} alt="عريف" className="rounded-circle" style={{ width: '32px', height: '32px' }} />
            <span className="fw-bold text-primary">عَريـف</span>
          </div>
          <p className="text-muted mb-0 small">© {new Date().getFullYear()} عريف - المساعد التعليمي الذكي. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
