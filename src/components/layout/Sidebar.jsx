import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import areefMascot from '../../assets/areef_mascot.png';

export default function Sidebar({ toggleMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;

  const isTeacher = user?.user_metadata?.role === 'teacher' || !user?.user_metadata?.role; // Default
  const isStudent = user?.user_metadata?.role === 'student';

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
      </ul>
    </aside>
  );
}
