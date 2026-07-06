import React from 'react'

export default function Login({ onLogin }) {
  return (
    <div className="container flex justify-center items-center animate-fade-in" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem', fontSize: '2rem', fontWeight: '800' }}>عريف</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>المساعد الذكي للمعلم</p>

        <div className="flex flex-col gap-4">
          <button 
            className="btn btn-outline" 
            onClick={onLogin}
            style={{ borderColor: '#0078d4', color: '#0078d4', fontWeight: 'bold' }}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f25022" d="M1 1h9v9H1z"/>
              <path fill="#00a4ef" d="M1 11h9v9H1z"/>
              <path fill="#7fba00" d="M11 1h9v9h-9z"/>
              <path fill="#ffb900" d="M11 11h9v9h-9z"/>
            </svg>
            تسجيل الدخول بحساب Microsoft
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <span style={{ padding: '0 1rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>أو</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          </div>

          <div className="input-group" style={{ textAlign: 'right' }}>
            <label className="input-label">البريد الإلكتروني أو رقم الجوال</label>
            <input type="text" className="input-field" placeholder="أدخل البريد أو الجوال" />
          </div>

          <button className="btn btn-primary" onClick={onLogin}>
            المتابعة
          </button>
        </div>
        
        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          تسجيلك يعني موافقتك على شروط الاستخدام وسياسة الخصوصية
        </p>
      </div>
    </div>
  )
}
