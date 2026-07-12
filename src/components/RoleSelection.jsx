import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function RoleSelection() {
  const { user, checkUserRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSelectRole = async (role) => {
    if (!user) return;
    setLoading(true);

    try {
      if (role === 'teacher') {
        await supabase.from('teachers').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          username: user.user_metadata?.username || user.email.split('@')[0]
        });
      } else if (role === 'student') {
        await supabase.from('students').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          username: user.user_metadata?.username || user.email.split('@')[0]
        });
      }
      
      await checkUserRole(user.id);
      
      if (role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student-dashboard');
      }
    } catch (error) {
      console.error('Error setting role:', error);
      alert('حدث خطأ أثناء تحديد الصلاحية. يرجى المحاولة مرة أخرى.');
    }
    
    setLoading(false);
  };

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: '80vh' }}>
      <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>أهلاً بك في نظام عريف!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>يبدو أن هذه هي المرة الأولى التي تسجل فيها الدخول. يرجى تحديد هويتك لنتمكن من توجيهك بشكل صحيح.</p>
        
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button 
            onClick={() => handleSelectRole('student')}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
          >
            <span style={{ fontSize: '2.5rem' }}>🎓</span>
            أنا طالب
          </button>

          <button 
            onClick={() => handleSelectRole('teacher')}
            disabled={loading}
            className="btn btn-outline"
            style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
          >
            <span style={{ fontSize: '2.5rem' }}>👨‍🏫</span>
            أنا معلم
          </button>
        </div>
      </div>
    </div>
  );
}
