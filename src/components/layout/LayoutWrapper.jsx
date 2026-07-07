import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

export default function LayoutWrapper({ children }) {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  const toggleMenu = () => {
    setIsMenuExpanded(!isMenuExpanded);
    if (!isMenuExpanded) {
      document.documentElement.classList.add('layout-menu-expanded');
    } else {
      document.documentElement.classList.remove('layout-menu-expanded');
    }
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        
        <Sidebar toggleMenu={toggleMenu} />

        <div className="layout-page">
          <Navbar toggleMenu={toggleMenu} />

          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              {children}
            </div>

            <div className="content-backdrop fade"></div>
          </div>
        </div>

      </div>

      <BottomNav toggleMenu={toggleMenu} />

      {/* Overlay for mobile sidebar */}
      <div 
        className={`layout-overlay layout-menu-toggle ${isMenuExpanded ? 'd-block' : ''}`}
        onClick={toggleMenu}
      ></div>
    </div>
  );
}
