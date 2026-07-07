// ============================================================================
// CheckoutModal.jsx — نافذة إتمام الدفع
// ============================================================================
//
// هذا المكوّن جاهز للربط مع بوابة الدفع الحقيقية (Moyasar / Stripe).
//
// لتفعيل الدفع الحقيقي:
//   1. أضف مفاتيح البوابة في ملف .env.local:
//        VITE_MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxxxxxx
//        VITE_MOYASAR_SECRET_KEY=sk_live_xxxxxxxxx
//        VITE_PAYMENT_CALLBACK_URL=https://yourdomain.com/payment/callback
//
//   2. فعّل كود Moyasar/Stripe في ملف src/lib/payments.js
//
//   3. (اختياري) أضف Moyasar Web SDK:
//        npm install moyasar
//        أو أضف السكربت في index.html:
//        <script src="https://cdn.moyasar.com/mpf/1.12.0/moyasar.js"></script>
//
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processPayment, isPaymentGatewayReady } from '../lib/payments';
import { X, CreditCard, Apple, CheckCircle } from 'lucide-react';

export default function CheckoutModal({ plan, price, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [method, setMethod] = useState('mada'); // mada, visa, apple
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // معالجة الدفع عبر src/lib/payments.js
      // حالياً: يحفظ في Supabase مباشرة
      // بعد إضافة مفاتيح Moyasar: سيتصل بالبوابة أولاً ثم يحفظ
      await processPayment(price, method, {
        number: cardNumber,
        name: cardName,
        expiry,
        cvv,
        planName: plan,
      }, user.id);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      alert(`حدث خطأ أثناء معالجة الدفع: ${error.message}`);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '3rem 2rem' }}>
          <CheckCircle size={64} color="#38a169" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#2f855a', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>تم الدفع بنجاح!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>تم ترقية حسابك إلى {plan}. شكراً لثقتك بعريف.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', position: 'relative', overflow: 'hidden', padding: 0 }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>إتمام الدفع</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>تأكيد الاشتراك في باقة {plan}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#a0aec0" />
          </button>
        </div>

        {/* Order Summary */}
        <div style={{ padding: '1.5rem', borderBottom: '1px dashed var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>قيمة الاشتراك</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{price} ر.س</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>ضريبة القيمة المضافة (15%)</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{(price * 0.15).toFixed(2)} ر.س</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>الإجمالي</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-blue)' }}>{(price * 1.15).toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setMethod('mada')}
              style={{ flex: 1, padding: '1rem', border: `2px solid ${method === 'mada' ? 'var(--primary-blue)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', backgroundColor: method === 'mada' ? 'rgba(43, 108, 203, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            >
              <CreditCard size={24} color={method === 'mada' ? 'var(--primary-blue)' : '#a0aec0'} />
              <span style={{ fontWeight: 'bold', color: method === 'mada' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}>مدى mada</span>
            </button>
            <button 
              onClick={() => setMethod('visa')}
              style={{ flex: 1, padding: '1rem', border: `2px solid ${method === 'visa' ? 'var(--primary-blue)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', backgroundColor: method === 'visa' ? 'rgba(43, 108, 203, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            >
              <CreditCard size={24} color={method === 'visa' ? 'var(--primary-blue)' : '#a0aec0'} />
              <span style={{ fontWeight: 'bold', color: method === 'visa' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}>Visa / Master</span>
            </button>
            <button 
              onClick={() => setMethod('apple')}
              style={{ flex: 1, padding: '1rem', border: `2px solid ${method === 'apple' ? '#000' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', backgroundColor: method === 'apple' ? '#f8fafc' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            >
              <Apple size={24} color={method === 'apple' ? '#000' : '#a0aec0'} />
              <span style={{ fontWeight: 'bold', color: method === 'apple' ? '#000' : 'var(--text-secondary)' }}>Apple Pay</span>
            </button>
          </div>

          <form onSubmit={handlePayment}>
            {method !== 'apple' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>رقم البطاقة</label>
                  <input type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', direction: 'ltr', textAlign: 'left', letterSpacing: '2px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>الاسم على البطاقة</label>
                  <input type="text" placeholder="AHMED KHALID" value={cardName} onChange={e => setCardName(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>تاريخ الانتهاء</label>
                    <input type="text" placeholder="MM/YY" value={expiry} onChange={e => setExpiry(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', direction: 'ltr', textAlign: 'left' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>رمز الأمان (CVV)</label>
                    <input type="text" placeholder="123" value={cvv} onChange={e => setCvv(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', direction: 'ltr', textAlign: 'left' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <Apple size={64} color="#000" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>يرجى تأكيد الدفع باستخدام بصمة الوجه أو الإصبع على جهازك.</p>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', marginTop: '2rem', fontSize: '1.1rem', backgroundColor: method === 'apple' ? '#000' : 'var(--primary-blue)' }}
            >
              {loading ? 'جاري معالجة الدفع...' : `دفع ${(price * 1.15).toFixed(2)} ر.س`}
            </button>
            <p style={{ textAlign: 'center', color: '#a0aec0', fontSize: '0.8rem', marginTop: '1rem' }}>
              {isPaymentGatewayReady()
                ? '🔒 الدفع مؤمّن عبر بوابة Moyasar المعتمدة. بياناتك محمية بتشفير SSL.'
                : '🔒 البوابة جاهزة للربط مع Moyasar/Stripe. أضف مفاتيح API في ملف .env.local لتفعيل الدفع الحقيقي.'}
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}
