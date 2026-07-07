import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Plus, Trash2, CheckCircle } from 'lucide-react';

export default function AdminSettings() {
  const { user, isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [classPrice, setClassPrice] = useState('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New coupon state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('100');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: booksData } = await supabase.from('books').select('*').order('grade_level');
      setBooks(booksData || []);

      const { data: couponsData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      setCoupons(couponsData || []);

      const { data: settingsData } = await supabase.from('app_settings').select('*').eq('key', 'class_price').single();
      if (settingsData) setClassPrice(settingsData.value);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleBookUpdate = async (bookId, field, value) => {
    try {
      await supabase.from('books').update({ [field]: value }).eq('id', bookId);
      setBooks(books.map(b => b.id === bookId ? { ...b, [field]: value } : b));
    } catch (e) {
      console.error(e);
    }
  };

  const saveClassPrice = async () => {
    setSaving(true);
    try {
      await supabase.from('app_settings').upsert({ key: 'class_price', value: classPrice, updated_at: new Date() });
      alert('تم الحفظ بنجاح');
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const addCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode) return;
    try {
      const { data, error } = await supabase.from('coupons').insert([{
        code: newCouponCode,
        discount_percentage: parseInt(newCouponDiscount),
        is_active: true
      }]).select();
      if (error) throw error;
      setCoupons([data[0], ...coupons]);
      setNewCouponCode('');
    } catch (e) {
      alert('خطأ في إضافة الكوبون: ' + e.message);
    }
  };

  const toggleCoupon = async (couponId, isActive) => {
    try {
      await supabase.from('coupons').update({ is_active: !isActive }).eq('id', couponId);
      setCoupons(coupons.map(c => c.id === couponId ? { ...c, is_active: !isActive } : c));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return <div className="container p-4"><h2>ليس لديك صلاحية للدخول هنا.</h2></div>;
  }

  if (loading) return <div className="container p-4 text-center">جاري التحميل...</div>;

  return (
    <div className="container-xxl flex-grow-1 container-p-y animate-fade-in">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">لوحة الإدارة / </span> الإعدادات
      </h4>

      <div className="row">
        {/* Settings */}
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">الإعدادات العامة</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">سعر إنشاء فصل إضافي (ريال)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={classPrice} 
                  onChange={(e) => setClassPrice(e.target.value)} 
                />
              </div>
              <button className="btn btn-primary w-100" onClick={saveClassPrice} disabled={saving}>
                <Save size={16} className="me-2" />
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>

        {/* Coupons */}
        <div className="col-md-8 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">إدارة الكوبونات</h5>
            </div>
            <div className="card-body">
              <form className="d-flex gap-2 mb-4" onSubmit={addCoupon}>
                <input type="text" className="form-control" placeholder="كود الكوبون (مثال: FREE100)" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} />
                <input type="number" className="form-control" placeholder="نسبة الخصم %" value={newCouponDiscount} onChange={e => setNewCouponDiscount(e.target.value)} style={{maxWidth: '120px'}} />
                <button type="submit" className="btn btn-success"><Plus size={16} /></button>
              </form>

              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>الكود</th>
                      <th>الخصم</th>
                      <th>الحالة</th>
                      <th>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.id}>
                        <td className="fw-bold text-primary">{c.code}</td>
                        <td>{c.discount_percentage}%</td>
                        <td>
                          <span className={`badge ${c.is_active ? 'bg-label-success' : 'bg-label-danger'}`}>
                            {c.is_active ? 'فعال' : 'معطل'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`btn btn-sm ${c.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => toggleCoupon(c.id, c.is_active)}
                          >
                            {c.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Books Pricing */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">تسعير المناهج</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th>الصف</th>
                    <th>الفصل الدراسي</th>
                    <th>مجاني؟</th>
                    <th>السعر (ريال)</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id}>
                      <td>{book.title}</td>
                      <td>{book.grade_level}</td>
                      <td>{book.term}</td>
                      <td>
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={book.is_free} 
                            onChange={(e) => handleBookUpdate(book.id, 'is_free', e.target.checked)}
                          />
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="form-control form-control-sm" 
                          style={{width: '100px'}}
                          value={book.price} 
                          disabled={book.is_free}
                          onChange={(e) => handleBookUpdate(book.id, 'price', parseInt(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
