import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 vw-100" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="text-center animate-fade-in">
        <div className="avatar avatar-xl mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
          <span className="avatar-initial rounded-circle bg-primary text-white shadow-lg d-flex justify-content-center align-items-center" style={{ fontSize: '2.5rem' }}>
            <i className="ti tabler-books"></i>
          </span>
        </div>
        <h3 className="fw-bold text-primary mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>عريف</h3>
        <p className="text-muted mb-4">جاري تجهيز بيئة التعلم...</p>
        <div className="spinner-grow text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
}
