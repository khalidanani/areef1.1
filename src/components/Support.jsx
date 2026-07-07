import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, LifeBuoy } from 'lucide-react';

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (data) setTickets(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('support_tickets').insert([{
        subject,
        message,
        user_id: user.id
      }]).select();
      
      if (error) throw error;
      
      setTickets([data[0], ...tickets]);
      setSubject('');
      setMessage('');
      alert('تم إرسال تذكرتك بنجاح. سيقوم فريق الدعم بالتواصل معك قريباً.');
    } catch (e) {
      alert('خطأ في إرسال التذكرة');
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y animate-fade-in">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">الخدمات الإضافية / </span> الدعم الفني
      </h4>

      <div className="row">
        {/* Create Ticket */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">تواصل مع الإدارة</h5>
            </div>
            <div className="card-body">
              <p className="mb-4">هل تواجه مشكلة؟ أو لديك استفسار؟ ارسل لنا رسالة وسنقوم بالرد عليك في أقرب وقت ممكن.</p>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="ticket-subject">الموضوع</label>
                  <input type="text" className="form-control" id="ticket-subject" placeholder="مثال: مشكلة في إضافة طالب" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="ticket-message">الرسالة أو التفاصيل</label>
                  <textarea id="ticket-message" className="form-control" rows="5" placeholder="اكتب تفاصيل المشكلة هنا..." value={message} onChange={e => setMessage(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={16} className="me-2" />
                  {submitting ? 'جاري الإرسال...' : 'إرسال التذكرة'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Previous Tickets */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">تذاكرك السابقة</h5>
            </div>
            <div className="card-body">
              {tickets.length === 0 ? (
                <div className="text-center py-5">
                  <LifeBuoy size={48} color="#cbd5e1" className="mb-3" />
                  <p className="text-muted">لا يوجد لديك أي تذاكر سابقة.</p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {tickets.map(ticket => (
                    <li key={ticket.id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h6 className="mb-1">{ticket.subject}</h6>
                        <small className="text-muted">{new Date(ticket.created_at).toLocaleDateString('ar-SA')}</small>
                      </div>
                      <span className={`badge ${ticket.status === 'open' ? 'bg-label-warning' : 'bg-label-success'}`}>
                        {ticket.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
