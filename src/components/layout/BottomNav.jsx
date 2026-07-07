import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function BottomNav({ toggleMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;
  
  const isStudent = user?.user_metadata?.role === 'student';
  const homePath = isStudent ? '/student-dashboard' : '/teacher-dashboard';

  return (
    <nav className="hn-bottom-nav d-xl-none" id="hnBottomNav" aria-label="التنقل السريع">
      <Link to="/curriculum" className={`hn-nav-item hn-dyn-a ${path.startsWith('/curriculum') ? 'active' : ''}`}>
        <i className="ti tabler-book"></i>
        <span>المناهج</span>
      </Link>

      <Link to={homePath} className={`hn-nav-item hn-slot-home ${path.includes('dashboard') ? 'active' : ''}`}>
        <i className="ti tabler-home"></i>
        <span>الرئيسية</span>
      </Link>

      <button type="button" className="hn-nav-item hn-slot-more layout-menu-toggle" onClick={toggleMenu} aria-label="المزيد">
        <i className="ti tabler-menu-2"></i>
        <span>المزيد</span>
      </button>
    </nav>
  );
}
