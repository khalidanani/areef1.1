import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        style={{ color: 'var(--text-primary)' }}
        title="الإشعارات"
      >
        <span style={{ fontSize: '1.25rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-900" style={{ transform: 'translate(25%, -25%)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 mt-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 dark:border-gray-800"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            color: 'var(--text-primary)',
            right: 'auto', // For RTL layout, dropdown should anchor to the right visually, but since we are in RTL, left-0 means visual right
            transform: 'translateX(25%)'
          }}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold m-0" style={{ fontSize: '1rem' }}>الإشعارات</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b border-gray-50 dark:border-gray-800/50 cursor-pointer transition-colors ${notification.is_read ? 'opacity-70 hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold ${notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-blue-600 dark:text-blue-400'}`}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 m-0 leading-relaxed">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-2 block">
                    {new Date(notification.created_at).toLocaleString('ar-SA', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
