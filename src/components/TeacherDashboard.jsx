import React from 'react'

export default function TeacherDashboard() {
  const classes = [
    { id: 1, name: 'رياضيات - أول متوسط', students: 35, pendingTasks: 12 },
    { id: 2, name: 'رياضيات - ثاني متوسط', students: 38, pendingTasks: 5 },
    { id: 3, name: 'رياضيات - أول ثانوي', students: 32, pendingTasks: 0 },
  ];

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1000px' }}>
      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem', fontWeight: 'bold' }}>أهلاً بك، أ. أحمد</h2>
          <p style={{ color: 'var(--text-secondary)' }}>إليك نظرة عامة على فصولك اليوم</p>
        </div>
        <button className="btn btn-primary">+ إنشاء واجب جديد</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {classes.map(cls => (
          <div key={cls.id} className="card">
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '1rem' }}>{cls.name}</h3>
            
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{cls.students}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>طالب</span>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-color)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: cls.pendingTasks > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {cls.pendingTasks}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>بانتظار المراجعة</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn btn-secondary" style={{ flex: 1 }}>عرض الواجبات</button>
              <button className="btn btn-outline" style={{ flex: 1 }}>التقارير</button>
            </div>
          </div>
        ))}
        
        <div className="card flex flex-col justify-center items-center" style={{ borderStyle: 'dashed', backgroundColor: 'transparent', cursor: 'pointer', minHeight: '220px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', color: 'var(--primary-blue)', fontSize: '1.5rem' }}>
            +
          </div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>إضافة فصل جديد</p>
        </div>
      </div>
    </div>
  )
}
