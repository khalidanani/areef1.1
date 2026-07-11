import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user, userRoles, userRole } = useAuth();
  const path = location.pathname;
  
  const roles = userRoles && userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
  const isTeacher = roles.includes('teacher') || (!roles.includes('student') && !roles.includes('new'));
  const isStudent = roles.includes('student');

  return (
    <nav className="hn-bottom-nav d-xl-none telegram-nav" id="hnBottomNav" aria-label="التنقل السريع">
      {isTeacher && (
        <Link to="/teacher-dashboard" className={`hn-nav-item ${path.includes('teacher-dashboard') ? 'active' : ''}`}>
          <i className="ti tabler-chalkboard"></i>
          <span>لوحة المعلم</span>
        </Link>
      )}

      {isStudent && (
        <Link to="/student-dashboard" className={`hn-nav-item ${path.includes('student-dashboard') ? 'active' : ''}`}>
          <i className="ti tabler-user-check"></i>
          <span>لوحة الطالب</span>
        </Link>
      )}

      <Link to="/curriculum" className={`hn-nav-item ${path.startsWith('/curriculum') ? 'active' : ''}`}>
        <i className="ti tabler-book"></i>
        <span>المناهج</span>
      </Link>

      {isTeacher && !isStudent && (
        <Link to="/store" className={`hn-nav-item ${path.startsWith('/store') ? 'active' : ''}`}>
          <i className="ti tabler-shopping-cart"></i>
          <span>المتجر</span>
        </Link>
      )}

      <Link to="/profile" className={`hn-nav-item ${path.startsWith('/profile') ? 'active' : ''}`}>
        <i className="ti tabler-user"></i>
        <span>حسابي</span>
      </Link>
    </nav>
  );
}
