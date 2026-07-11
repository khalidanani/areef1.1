import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';

export default function NotificationsBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Fetch existing notifications
    fetchNotifications();

    // Subscribe to realtime inserts
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  useEffect(() => {
    // Close dropdown on outside click
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  }

  async function markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="position-relative d-inline-block" ref={dropdownRef} style={{ lineHeight: 1 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-icon rounded-circle position-relative"
        style={{ 
          color: '#566a7f', 
          width: '40px', 
          height: '40px',
          border: 'none',
          background: 'rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="الإشعارات"
      >
        <Bell size={22} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem', padding: '0.25em 0.4em' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="position-absolute mt-2 shadow border"
          style={{ 
            backgroundColor: 'var(--bg-color, #ffffff)', 
            color: 'var(--text-primary, #333333)',
            width: '320px',
            borderRadius: '12px',
            zIndex: 1050,
            left: 0,
            right: 'auto', // LTR override since it might be in RTL
            transform: 'translateX(-25%)', // Slight adjustment for better alignment
            overflow: 'hidden'
          }}
        >
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h6 className="m-0 fw-bold">الإشعارات</h6>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="btn btn-sm btn-link text-primary p-0 text-decoration-none"
                style={{ fontSize: '0.8rem' }}
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted small">
                <p className="m-0">لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 border-bottom cursor-pointer ${notification.is_read ? 'bg-transparent opacity-75' : 'bg-primary-subtle'}`}
                  style={{ transition: 'background-color 0.2s' }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className={`mb-0 small fw-bold ${notification.is_read ? 'text-muted' : 'text-primary'}`}>
                      {notification.title}
                    </h6>
                    {!notification.is_read && (
                      <span className="bg-primary rounded-circle" style={{ width: '8px', height: '8px', marginTop: '4px' }}></span>
                    )}
                  </div>
                  <p className="small text-muted m-0 mt-1" style={{ lineHeight: '1.4' }}>
                    {notification.message}
                  </p>
                  <small className="text-muted d-block mt-2" style={{ fontSize: '0.7rem' }}>
                    {new Date(notification.created_at).toLocaleString('ar-SA', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
