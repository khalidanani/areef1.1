import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import mascotImg from '../assets/areef_mascot.png';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithMicrosoft, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [showLoginForm, setShowLoginForm] = useState(false);

  React.useEffect(() => {
    const profiles = localStorage.getItem('areef_saved_profiles');
    if (profiles) {
      const parsed = JSON.parse(profiles);
      setSavedProfiles(parsed);
      if (parsed.length > 0) {
        setShowLoginForm(false);
      } else {
        setShowLoginForm(true);
      }
    } else {
      setShowLoginForm(true);
    }
  }, []);

  React.useEffect(() => {
    if (user && userRole) {
      if (userRole === 'teacher') {
        navigate('/teacher');
      } else if (userRole === 'student') {
        navigate('/student-dashboard');
      } else if (userRole === 'new') {
        navigate('/role-selection');
      }
    }
  }, [user, userRole, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  const handleProfileLogin = async (profile) => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (profile.authMethod === 'email' && profile.password) {
        await signInWithEmail(profile.email, profile.password);
      } else if (profile.authMethod === 'google') {
        await signInWithGoogle();
      } else if (profile.authMethod === 'azure') {
        await signInWithMicrosoft();
      }
    } catch (error) {
      setErrorMsg(error.message);
      setShowLoginForm(true); // Fallback to login form if error
    }
    setLoading(false);
  };

  return (
    <div className="authentication-wrapper authentication-basic container-p-y">
      <div className="authentication-inner py-4">
        <div className="card text-center" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="card-body">
            <div className="app-brand justify-content-center mb-4 mt-2">
              <div style={{ width: '100px', height: '100px' }}>
                <img src={mascotImg} alt="عريف" className="img-fluid rounded-circle shadow-sm" />
              </div>
            </div>
            
            <h4 className="mb-1 pt-2 text-primary fw-bold">أهلاً بك في عَريـف 👋</h4>
            <p className="mb-4">المساعد الذكي الأول للمعلم والطالب</p>

            {errorMsg && (
              <div className="alert alert-danger p-2 mb-3" role="alert">
                {errorMsg === 'Email not confirmed' ? 'يرجى تعطيل "Confirm Email" من إعدادات Supabase' : errorMsg}
              </div>
            )}

            {!showLoginForm && savedProfiles.length > 0 ? (
              <div>
                <h6 className="mb-3 text-muted">من يدرس الآن؟</h6>
                <div className="row g-3 mb-4">
                  {savedProfiles.map((profile, idx) => (
                    <div key={idx} className="col-6">
                      <div 
                        className="card h-100 cursor-pointer border hover-border-primary"
                        onClick={() => handleProfileLogin(profile)}
                        style={{ opacity: loading ? 0.5 : 1 }}
                      >
                        <div className="card-body p-3 text-center">
                          <div className="avatar avatar-xl mx-auto mb-2">
                            <span className="avatar-initial rounded-circle bg-label-primary fs-3">
                              {profile.full_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="mb-0 fw-semibold text-truncate">{profile.full_name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowLoginForm(true)}
                  className="btn btn-label-secondary d-grid w-100" 
                  disabled={loading}
                >
                  <i className="ti tabler-plus me-1"></i> إضافة حساب آخر
                </button>
              </div>
            ) : (
              <>
                <form id="formAuthentication" className="mb-3" onSubmit={handleLogin}>
                  <div className="mb-3 text-start">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      className="form-control text-start" 
                      dir="ltr"
                      placeholder="email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3 text-start">
                    <label className="form-label">كلمة المرور</label>
                    <input 
                      type="password" 
                      className="form-control text-start"
                      dir="ltr"
                      placeholder="············"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <button className="btn btn-primary d-grid w-100" type="submit" disabled={loading}>
                      {loading ? 'جاري الدخول...' : 'تسجيل الدخول / حساب جديد'}
                    </button>
                  </div>
                </form>

                <div className="divider my-4">
                  <div className="divider-text">أو الدخول بواسطة</div>
                </div>

                <div className="d-flex justify-content-center gap-2">
                  <button onClick={signInWithGoogle} className="btn btn-icon btn-label-google-plus rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: '#fff', border: '1px solid #ddd' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </button>
                  <button onClick={signInWithMicrosoft} className="btn btn-icon btn-label-twitter rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: '#0078d4' }}>
                    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                  </button>
                </div>

                {savedProfiles.length > 0 && (
                  <button 
                    onClick={() => setShowLoginForm(false)}
                    className="btn btn-link text-muted mt-4" 
                  >
                    <i className="ti tabler-arrow-right me-1"></i> العودة للحسابات المحفوظة
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
