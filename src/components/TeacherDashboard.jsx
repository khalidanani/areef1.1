import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { PAYMENT_CONFIG } from '../lib/payments';
import NotificationsBell from './NotificationsBell';
import { useToast } from '../contexts/ToastContext';

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [showReports, setShowReports] = useState(null);
  const [reportsData, setReportsData] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showRoster, setShowRoster] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    if (user) {
      ensureTeacherExists().then(fetchClasses);
    }
  }, [user]);

  async function handleLogout() {
    await signOut();
  }

  async function ensureTeacherExists() {
    const { data } = await supabase.from('teachers').select('id').eq('id', user.id).single();
    if (!data) {
      await supabase.from('teachers').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email
      });
    }

    const { data: subData } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();
    if (subData) {
      setSubscription(subData);
    } else {
      setSubscription({ plan_name: 'الأساسية (مجاني)' });
    }

    const { data: invData } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (invData) {
      setInvoices(invData);
    }
  }

  async function fetchClasses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*, class_enrollments(count), homeworks(count)')
      .eq('teacher_id', user.id);
    
    if (!error && data) {
      setClasses(data);
    }
    setLoading(false);
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase.from('classes').insert({
      teacher_id: user.id,
      name: newClassName,
      grade_level: newGradeLevel,
      join_code: joinCode
    }).select();

    if (!error && data) {
      setClasses([...classes, { ...data[0], class_enrollments: [{count: 0}], homeworks: [{count: 0}] }]);
      setShowCreateClass(false);
      setNewClassName('');
      setNewGradeLevel('');
      toast.success('تم إنشاء الفصل بنجاح!');
    } else {
      toast.error('حدث خطأ أثناء إنشاء الفصل');
    }
  }

  async function openReports(cls) {
    setShowReports(cls);
    setLoadingReports(true);
    
    const { data, error } = await supabase
      .from('student_responses')
      .select('*, homework:homeworks(title), question:questions(question_text)')
      .eq('class_id', cls.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setReportsData(data);
    }
    setLoadingReports(false);
  }

  async function openRoster(cls) {
    setShowRoster(cls);
    setLoadingRoster(true);
    
    // Fetch students in this class
    const { data, error } = await supabase
      .from('class_enrollments')
      .select('*, student:students(*)')
      .eq('class_id', cls.id);
      
    if (!error && data) {
      setRosterData(data);
    }
    setLoadingRoster(false);
  }

  return (
    <div className="container-fluid flex-grow-1 container-p-y">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold py-1 mb-1" style={{ fontSize: '1.25rem' }}>
            <span className="text-muted fw-light">الرئيسية /</span> الفصول
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>إليك نظرة عامة على فصولك اليوم</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <NotificationsBell />
          <Link to="/curriculum" className="btn btn-primary btn-sm flex-grow-1 flex-sm-grow-0">
            <i className="ti tabler-plus me-1"></i> إنشاء واجب
          </Link>
          <button onClick={() => setShowInvoices(true)} className="btn btn-label-secondary btn-sm flex-grow-1 flex-sm-grow-0">
            <i className="ti tabler-file-invoice me-1"></i> الفواتير
          </button>
        </div>
      </div>

      {/* Subscription Banner */}
      <div className={`alert alert-solid-${subscription?.plan_name === 'الاحترافية' ? 'warning' : 'primary'} d-flex align-items-center justify-content-between mb-4`} role="alert">
        <div>
          <h6 className="mb-1 text-white"><i className="ti tabler-crown me-2"></i>حالة الاشتراك: <strong>{subscription?.plan_name || 'الأساسية (مجاني)'}</strong></h6>
          {subscription?.period_end && <small>ينتهي في {new Date(subscription.period_end).toLocaleDateString('ar-SA')}</small>}
        </div>
        {subscription?.plan_name !== 'الاحترافية' && (
          <Link to="/pricing" className="btn btn-sm btn-white text-primary">
            ترقية الحساب 🚀
          </Link>
        )}
      </div>

      {showCreateClass && (
        <div className="card mb-4 border border-primary animate-fade-in">
          <div className="card-header">
            <h5 className="mb-0 text-primary">إنشاء فصل جديد</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateClass} className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label">اسم الفصل</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)} 
                  required 
                  placeholder="مثال: رياضيات ثاني متوسط (أ)"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">المرحلة الدراسية</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={newGradeLevel} 
                  onChange={(e) => setNewGradeLevel(e.target.value)} 
                  required 
                  placeholder="مثال: ثاني متوسط"
                />
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary w-100">حفظ</button>
                <button type="button" onClick={() => setShowCreateClass(false)} className="btn btn-label-secondary w-100">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="row g-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="col-xl-4 col-lg-6 col-md-6">
              <div className="card h-100 skeleton-card skeleton">
                <div className="card-body">
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                  <div className="mt-4 skeleton-text" style={{height: '40px'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-4">
          {classes.map((cls, idx) => (
            <div key={cls.id} className="col-xl-4 col-lg-6 col-md-6 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 text-truncate" title={cls.name}>{cls.name}</h5>
                  <span className="badge bg-label-secondary px-2">كود: {cls.join_code}</span>
                </div>
                
                <div className="card-body">
                  <div className="d-flex justify-content-around align-items-center bg-lighter rounded p-3 mb-4">
                    <div className="text-center">
                      <h3 className="text-primary mb-0 fw-bold">{cls.class_enrollments?.[0]?.count || 0}</h3>
                      <small className="text-muted">طالب</small>
                    </div>
                    <div className="border-end h-px-40"></div>
                    <div className="text-center">
                      <h3 className="text-success mb-0 fw-bold">{cls.homeworks?.[0]?.count || 0}</h3>
                      <small className="text-muted">واجب مرسل</small>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-3 flex-column">
                    <div className="d-flex gap-2">
                      <Link to={`/curriculum?classId=${cls.id}`} className="btn btn-primary flex-grow-1">
                        <i className="ti tabler-book me-1"></i> المناهج والواجبات
                      </Link>
                    </div>
                    <div className="d-flex gap-2">
                      <button onClick={() => openRoster(cls)} className="btn btn-label-primary flex-grow-1">
                        <i className="ti tabler-users me-1"></i> كشف الطلاب
                      </button>
                      <button onClick={() => openReports(cls)} className="btn btn-success flex-grow-1">
                        <i className="ti tabler-report-analytics me-1"></i> الإحصائيات
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="col-xl-4 col-lg-6 col-md-6">
            <div 
              onClick={() => setShowCreateClass(true)} 
              className="card h-100 border-dashed border-2 text-center cursor-pointer hover-bg-lighter transition-all"
              style={{ minHeight: '220px' }}
            >
              <div className="card-body d-flex flex-column justify-content-center align-items-center">
                <div className="avatar avatar-xl mb-3">
                  <span className="avatar-initial rounded-circle bg-label-primary shadow-sm fs-2">
                    <i className="ti tabler-plus"></i>
                  </span>
                </div>
                <h5 className="text-primary mb-0 fw-bold">إضافة فصل جديد</h5>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-primary fw-bold">تقارير الأداء: {showReports.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowReports(null)}></button>
              </div>
              <div className="modal-body p-0">
                {loadingReports ? (
                  <div className="p-4">
                    {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-text" style={{height: '30px', marginBottom: '15px'}}></div>)}
                  </div>
                ) : reportsData.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">لا توجد استجابات أو واجبات محلولة من الطلاب حتى الآن في هذا الفصل.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>اسم الطالب</th>
                          <th>الواجب</th>
                          <th>السؤال</th>
                          <th>الدرجة الآلية</th>
                          <th>ملاحظة الذكاء الاصطناعي</th>
                        </tr>
                      </thead>
                      <tbody className="table-border-bottom-0">
                        {reportsData.map(report => (
                          <tr key={report.id}>
                            <td className="fw-semibold">{report.student_name}</td>
                            <td className="text-muted">{report.homework?.title || 'واجب'}</td>
                            <td><small>{report.question?.question_text || '-'}</small></td>
                            <td>
                              <span className={`badge ${report.grade >= 8 ? 'bg-label-success' : report.grade >= 5 ? 'bg-label-warning' : 'bg-label-danger'}`}>
                                {report.grade} / 10
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'normal', maxWidth: '300px' }}>
                              <small>{report.feedback}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Modal */}
      {showInvoices && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-primary fw-bold">سجل الفواتير والمدفوعات</h5>
                <button type="button" className="btn-close" onClick={() => setShowInvoices(false)}></button>
              </div>
              <div className="modal-body p-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">لا توجد فواتير سابقة.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>رقم الفاتورة</th>
                          <th>التاريخ</th>
                          <th>المبلغ</th>
                          <th>طريقة الدفع</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="table-border-bottom-0">
                        {invoices.map(invoice => (
                          <tr key={invoice.id}>
                            <td className="text-muted">#{invoice.id.split('-')[0]}</td>
                            <td>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</td>
                            <td className="fw-bold">{invoice.amount} {invoice.currency}</td>
                            <td className="text-uppercase">{invoice.payment_method}</td>
                            <td>
                              <span className="badge bg-label-success">مدفوع</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {showRoster && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-primary fw-bold">كشف طلاب فصل: {showRoster.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowRoster(null)}></button>
              </div>
              <div className="modal-body p-0">
                {loadingRoster ? (
                  <div className="p-4">
                    {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{height: '40px', marginBottom: '15px'}}></div>)}
                  </div>
                ) : rosterData.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">لا يوجد طلاب في هذا الفصل بعد.</p>
                    <p className="small text-primary mt-2">شارك كود الانضمام: <strong>{showRoster.join_code}</strong> مع طلابك</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>اسم الطالب</th>
                          <th>الكود المدرسي</th>
                          <th>رقم الجوال</th>
                          <th>تاريخ الانضمام</th>
                        </tr>
                      </thead>
                      <tbody className="table-border-bottom-0">
                        {rosterData.map(enrollment => (
                          <tr key={enrollment.student_id}>
                            <td className="fw-semibold">
                              <div className="d-flex align-items-center">
                                <div className="avatar avatar-sm me-2">
                                  <span className="avatar-initial rounded-circle bg-label-primary">
                                    {enrollment.student?.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                                {enrollment.student?.full_name}
                              </div>
                            </td>
                            <td>{enrollment.student?.student_code || '-'}</td>
                            <td>{enrollment.student?.phone || 'غير مسجل'}</td>
                            <td><small>{new Date(enrollment.joined_at).toLocaleDateString('ar-SA')}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
