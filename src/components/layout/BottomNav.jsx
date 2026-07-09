import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const path = location.pathname;
  
  const isStudent = user?.user_metadata?.role === 'student';
  const homePath = isStudent ? '/student-dashboard' : '/teacher-dashboard';

  return (
    <nav className="hn-bottom-nav d-xl-none telegram-nav" id="hnBottomNav" aria-label="التنقل السريع">
      <Link to={homePath} className={`hn-nav-item ${path.includes('dashboard') ? 'active' : ''}`}>
        <i className="ti tabler-home"></i>
        <span>الرئيسية</span>
      </Link>

      <Link to="/curriculum" className={`hn-nav-item ${path.startsWith('/curriculum') ? 'active' : ''}`}>
        <i className="ti tabler-book"></i>
        <span>المناهج</span>
      </Link>

      <Link to="/store" className={`hn-nav-item ${path.startsWith('/store') ? 'active' : ''}`}>
        <i className="ti tabler-shopping-cart"></i>
        <span>المتجر</span>
      </Link>

      <Link to="/profile" className={`hn-nav-item ${path.startsWith('/profile') ? 'active' : ''}`}>
        <i className="ti tabler-user"></i>
        <span>حسابي</span>
      </Link>
    </nav>
  );
}
