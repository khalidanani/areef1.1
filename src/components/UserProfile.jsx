import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, User } from 'lucide-react';

export default function UserProfile() {
  const { user, userRole } = useAuth();
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    school_details: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && userRole) {
      fetchProfile();
    }
  }, [user, userRole]);

  const fetchProfile = async () => {
    try {
      const table = userRole === 'student' ? 'students' : 'teachers';
      const { data, error } = await supabase.from(table).select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          school_details: data.school_details || '',
          bio: data.bio || ''
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const table = userRole === 'student' ? 'students' : 'teachers';
      const { error } = await supabase.from(table).update({
        full_name: profile.full_name,
        phone: profile.phone,
        school_details: profile.school_details,
        bio: profile.bio
      }).eq('id', user.id);
      
      if (error) throw error;
      alert('تم حفظ البيانات بنجاح!');
    } catch (e) {
      alert('حدث خطأ أثناء الحفظ');
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y animate-fade-in">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">الخدمات الإضافية / </span> الملف الشخصي
      </h4>

      <div className="row">
        <div className="col-md-12">
          <div className="card mb-4">
            <h5 className="card-header border-bottom">تفاصيل الحساب ({userRole === 'teacher' ? 'معلم' : 'طالب'})</h5>
            
            <div className="card-body mt-4">
              <form onSubmit={handleSave}>
                <div className="row">
                  <div className="mb-3 col-md-6">
                    <label className="form-label">الاسم الكامل</label>
                    <input className="form-control" type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} required />
                  </div>
                  <div className="mb-3 col-md-6">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input className="form-control" type="text" value={profile.email} disabled />
                  </div>
                  <div className="mb-3 col-md-6">
                    <label className="form-label">رقم الجوال</label>
                    <input className="form-control" type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="05XXXXXXXX" />
                  </div>
                  <div className="mb-3 col-md-6">
                    <label className="form-label">بيانات المدرسة</label>
                    <input className="form-control" type="text" value={profile.school_details} onChange={e => setProfile({...profile, school_details: e.target.value})} placeholder="اسم المدرسة أو المرحلة" />
                  </div>
                  <div className="mb-3 col-md-12">
                    <label className="form-label">السيرة الذاتية (نبذة قصيرة)</label>
                    <textarea className="form-control" rows="3" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="اكتب نبذة قصيرة عنك..."></textarea>
                  </div>
                </div>
                <div className="mt-2">
                  <button type="submit" className="btn btn-primary me-2" disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
