import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationsBell from './NotificationsBell';
import { useToast } from '../contexts/ToastContext';

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchEnrolledClasses();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  async function fetchEnrolledClasses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(id, name, grade_level, teacher_id, teachers(full_name))')
      .eq('student_id', user.id);
      
    if (!error && data) {
      setClasses(data.map(item => item.classes));
    }
    setLoading(false);
  }

  async function handleJoinClass(e) {
    e.preventDefault();

    if (!joinCode.trim()) return;

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (classError || !classData) {
      toast.error('كود الانضمام غير صحيح.');
      return;
    }

    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        student_id: user.id,
        class_id: classData.id
      });

    if (enrollError) {
      if (enrollError.code === '23505') {
        toast.error('أنت منضم إلى هذا الفصل مسبقاً.');
      } else {
        toast.error('حدث خطأ أثناء الانضمام. حاول مرة أخرى.');
      }
    } else {
      toast.success(`تم الانضمام بنجاح إلى فصل: ${classData.name}`);
      setJoinCode('');
      fetchEnrolledClasses();
    }
  }

  const navigateToClass = (cls) => {
    navigate(`/student-chat/${cls.id}`);
  };

  return (
    <div className="container-fluid flex-grow-1 container-p-y">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold py-1 mb-1" style={{ fontSize: '1.25rem' }}>
            <span className="text-muted fw-light">الرئيسية /</span> لوحة الطالب
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>بوابة الطالب: فصولي وواجباتي</p>
        </div>
        <div className="d-flex align-items-center gap-2 w-100 justify-content-end justify-content-sm-auto">
          <NotificationsBell />
        </div>
      </div>

      <div className="card mb-4 mt-2 border-0 shadow-sm animate-fade-in">
        <div className="card-body p-3">
          <h6 className="mb-3 text-primary fw-bold"><i className="ti tabler-plus me-1"></i> الانضمام لفصل جديد</h6>
          
          <form onSubmit={handleJoinClass} className="d-flex gap-2 align-items-center">
            <input 
              type="text" 
              className="form-control form-control-lg fw-bold flex-grow-1"
              style={{ letterSpacing: '2px', background: 'var(--bg-color)', border: 'none', borderRadius: 'var(--radius-xl)' }}
              value={joinCode} 
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
              required 
              placeholder="كود الفصل..."
            />
            <button type="submit" className="btn btn-primary rounded-circle p-0 d-flex justify-content-center align-items-center" style={{ width: '45px', height: '45px', flexShrink: 0 }}>
              <i className="ti tabler-send fs-5"></i>
            </button>
          </form>
        </div>
      </div>

      <h5 className="mb-3 text-muted">فصولي الدراسية</h5>

      {loading ? (
        <div className="row g-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="col-xl-4 col-lg-6 col-md-6">
              <div className="card h-100 skeleton-card skeleton">
                <div className="card-body">
                  <div className="skeleton-text" style={{height: '30px'}}></div>
                  <div className="skeleton-text short"></div>
                  <div className="mt-4 skeleton-text" style={{height: '40px'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center p-5 card border-dashed border-2">
          <div className="avatar avatar-xl mx-auto mb-3">
            <span className="avatar-initial rounded-circle bg-label-secondary">
              <i className="ti tabler-school fs-2"></i>
            </span>
          </div>
          <h6 className="text-muted">أنت لست منضماً لأي فصل بعد. استخدم كود الانضمام من معلمك لإضافة فصل.</h6>
        </div>
      ) : (
        <div className="row g-4">
          {classes.map((cls, idx) => (
            <div key={cls.id} className="col-xl-4 col-lg-6 col-md-6 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div 
                className="card h-100 cursor-pointer hover-border-primary transition-all shadow-sm"  
                onClick={() => navigateToClass(cls)}
              >
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="avatar avatar-md me-3">
                      <span className="avatar-initial rounded bg-label-primary">
                        <i className="ti tabler-books fs-4"></i>
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">{cls.name}</h5>
                      <small className="text-muted">المرحلة: {cls.grade_level}</small>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="mb-1"><i className="ti tabler-user me-1 text-muted"></i> المعلم: <strong>{cls.teachers?.full_name}</strong></p>
                  </div>
                  <button className="btn btn-label-primary w-100">
                    دخول الفصل وحل الواجبات <i className="ti tabler-arrow-left ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
