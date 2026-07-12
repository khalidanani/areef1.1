import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar({ toggleMenu }) {
  const { user, signOut, switchAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme" id="layout-navbar">
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
        <a className="nav-item nav-link px-0 me-xl-4" href="#!" onClick={toggleMenu}>
          <i className="ti tabler-menu-2 ti-md"></i>
        </a>
      </div>

      <div className="navbar-nav-right d-flex align-items-center" id="navbar-collapse">
        <div className="navbar-nav align-items-center">
          <h5 className="mb-0 text-primary fw-bold">عريف - المساعد الذكي</h5>
        </div>

        <ul className="navbar-nav flex-row align-items-center ms-auto">
          {/* Theme Toggle */}
          <li className="nav-item me-3">
            <button 
              onClick={toggleTheme} 
              className="btn btn-icon btn-label-secondary rounded-circle d-flex align-items-center justify-content-center p-0" 
              style={{ width: '38px', height: '38px', border: '1px solid var(--bs-border-color)', background: 'transparent' }}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-primary" />}
            </button>
          </li>

          {/* User Dropdown */}
          {user ? (
            <li className="nav-item navbar-dropdown dropdown-user dropdown">
              <a className="nav-link dropdown-toggle hide-arrow p-0" href="#!" data-bs-toggle="dropdown">
                <div className="avatar avatar-online">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                </div>
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <a className="dropdown-item" href="#!">
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar avatar-online">
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                            {user?.email?.[0].toUpperCase() || 'U'}
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">{user?.email || 'User'}</h6>
                        <small className="text-muted">{user?.user_metadata?.role === 'student' ? 'طالب' : 'معلم'}</small>
                      </div>
                    </div>
                  </a>
                </li>
                <li>
                  <button className="dropdown-item text-secondary" onClick={switchAccount}>
                    <i className="ti tabler-arrows-left-right me-2 ti-sm"></i>
                    <span className="align-middle">تبديل الحساب</span>
                  </button>
                </li>
                <li><div className="dropdown-divider my-1"></div></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={signOut}>
                    <i className="ti tabler-logout me-2 ti-sm"></i>
                    <span className="align-middle">تسجيل الخروج</span>
                  </button>
                </li>
              </ul>
            </li>
          ) : (
            <li className="nav-item">
              <Link to="/login" className="btn btn-primary btn-sm px-3">
                تسجيل الدخول
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}


