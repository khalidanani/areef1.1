import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Terminal, Monitor } from 'lucide-react';
import areefMascot from '../../assets/areef_mascot.png';

export default function Sidebar({ toggleMenu }) {
  const location = useLocation();
  const { user, isAdmin, userRoles, userRole } = useAuth();
  const path = location.pathname;

  const roles = userRoles && userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
  const isTeacher = roles.includes('teacher') || (!roles.includes('student') && !roles.includes('new')); // Default to teacher if missing
  const isStudent = roles.includes('student');

  const [theme, setTheme] = useState(localStorage.getItem('areef_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('areef_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'terminal' : 'light');
  };

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

        {isStudent && (
          <li className={`menu-item ${path.startsWith('/student') ? 'active' : ''}`}>
            <Link to="/student-dashboard" className="menu-link">
              <i className="menu-icon tf-icons ti tabler-user"></i>
              <div>لوحة الطالب</div>
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
