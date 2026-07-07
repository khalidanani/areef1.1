import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Shield, ArrowRight } from 'lucide-react';
import CheckoutModal from './CheckoutModal';

export default function PricingPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'الأساسية',
      price: 0,
      period: 'دائماً',
      description: 'مثالية للمعلمين لتجربة المنصة مع فصول محدودة.',
      features: [
        'إنشاء فصلين دراسيين بحد أقصى',
        'مشاركة الواجبات مع 50 طالب',
        'استخدام محدود لمساعد الذكاء الاصطناعي',
        'تقارير درجات أساسية'
      ],
      icon: <Shield size={24} color="#a0aec0" />,
      color: '#a0aec0',
      buttonText: 'الباقة الحالية'
    },
    {
      id: 'pro',
      name: 'الاحترافية',
      price: 99,
      period: 'شهرياً',
      description: 'للمعلمين المحترفين الذين يحتاجون ميزات غير محدودة وتقارير متقدمة.',
      features: [
        'عدد غير محدود من الفصول والطلاب',
        'مساعد ذكاء اصطناعي لا محدود',
        'أداة استخراج المناهج (PDF / صور)',
        'تقارير ورسوم بيانية متقدمة للطلاب',
        'أولوية الدعم الفني',
        'تصدير التقارير إلى Excel'
      ],
      icon: <Star size={24} color="#ecc94b" fill="#ecc94b" />,
      color: '#ecc94b',
      isPopular: true,
      buttonText: 'اشترك الآن'
    }
  ];

  const handleSubscribe = (plan) => {
    if (plan.price === 0) return;
    setSelectedPlan(plan);
  };

  const handleCheckoutSuccess = () => {
    setSelectedPlan(null);
    navigate('/teacher'); // Redirect to dashboard
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1000px', paddingBottom: '4rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <button onClick={() => navigate('/teacher')} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <ArrowRight size={20} /> العودة للوحة التحكم
        </button>
        <h2 style={{ color: 'var(--primary-blue)', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>اختر الباقة المناسبة لك</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          نظام عريف يوفر لك جميع أدوات الذكاء الاصطناعي لمتابعة وتصحيح واجبات طلابك بأسعار مرنة.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {plans.map(plan => (
          <div 
            key={plan.id} 
            className="card" 
            style={{ 
              position: 'relative', 
              padding: '2.5rem 2rem', 
              border: plan.isPopular ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
              transform: plan.isPopular ? 'scale(1.05)' : 'none',
              boxShadow: plan.isPopular ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : 'none',
              zIndex: plan.isPopular ? 10 : 1
            }}
          >
            {plan.isPopular && (
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary-blue)', color: 'white', padding: '0.3rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                الأكثر اختياراً
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: `${plan.color}22`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {plan.icon}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{plan.name}</h3>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', height: '40px' }}>{plan.description}</p>
            
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{plan.price}</span>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}> ر.س / {plan.period}</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
              {plan.features.map((feature, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  <div style={{ backgroundColor: '#c6f6d5', borderRadius: '50%', padding: '2px', flexShrink: 0, marginTop: '2px' }}>
                    <Check size={14} color="#2f855a" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe(plan)}
              className={plan.isPopular ? "btn btn-primary" : "btn btn-outline"} 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', opacity: plan.price === 0 ? 0.5 : 1, cursor: plan.price === 0 ? 'not-allowed' : 'pointer' }}
              disabled={plan.price === 0}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <CheckoutModal 
          plan={selectedPlan.name} 
          price={selectedPlan.price} 
          onClose={() => setSelectedPlan(null)} 
          onSuccess={handleCheckoutSuccess} 
        />
      )}
    </div>
  );
}
