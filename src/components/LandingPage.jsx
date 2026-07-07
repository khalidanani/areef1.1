import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCircle,
  BookOpen,
  BarChart3,
  Check,
  Star,
  Shield,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <BrainCircuit size={32} color="#2b6ccb" />,
      title: 'مساعد ذكي للواجبات',
      description:
        'ذكاء اصطناعي يساعد الطلاب في حل الواجبات خطوة بخطوة مع شرح مفصل لكل مفهوم.',
      bg: '#e8f0fe',
    },
    {
      icon: <CheckCircle size={32} color="#38a169" />,
      title: 'تصحيح تلقائي',
      description:
        'يصحح واجبات الطلاب تلقائياً باستخدام الذكاء الاصطناعي ويوفر وقت المعلم بنسبة ٩٠٪.',
      bg: '#e6ffed',
    },
    {
      icon: <BookOpen size={32} color="#d69e2e" />,
      title: 'متوافق مع المناهج السعودية',
      description:
        'محتوى متوافق مع مناهج وزارة التعليم السعودية لجميع المراحل الدراسية.',
      bg: '#fefcbf',
    },
    {
      icon: <BarChart3 size={32} color="#e53e3e" />,
      title: 'تقارير فورية',
      description:
        'تقارير مفصلة عن أداء كل طالب مع رسوم بيانية توضح نقاط القوة والضعف.',
      bg: '#fed7d7',
    },
  ];

  const plans = [
    {
      id: 'free',
      name: 'الأساسية',
      price: 0,
      period: 'مجاناً',
      features: [
        'فصلان دراسيان',
        '٥٠ طالب كحد أقصى',
        'استخدام محدود للذكاء الاصطناعي',
        'تقارير أساسية',
      ],
      icon: <Shield size={24} color="#a0aec0" />,
      color: '#a0aec0',
    },
    {
      id: 'pro',
      name: 'الاحترافية',
      price: 99,
      period: 'شهرياً',
      features: [
        'عدد غير محدود من الفصول والطلاب',
        'مساعد ذكاء اصطناعي لا محدود',
        'استخراج المناهج من PDF وصور',
        'تقارير ورسوم بيانية متقدمة',
        'أولوية الدعم الفني',
        'تصدير التقارير إلى Excel',
      ],
      icon: <Star size={24} color="#ecc94b" fill="#ecc94b" />,
      color: '#ecc94b',
      isPopular: true,
    },
  ];

  return (
    <div style={{ direction: 'rtl', fontFamily: 'inherit' }}>
      {/* ── Navbar ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          background: 'rgba(26, 26, 46, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#2b6ccb',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'white', fontSize: '1.4rem', fontWeight: 'bold' }}>ع</span>
          </div>
          <span style={{ color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}>عَريـف</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#2b6ccb',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.6rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#1f56a8')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#2b6ccb')}
        >
          تسجيل الدخول
        </button>
      </nav>

      {/* ── Hero Section ── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '80px',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(43,108,203,0.15) 0%, transparent 70%)',
            top: '-100px',
            right: '-150px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(43,108,203,0.1) 0%, transparent 70%)',
            bottom: '-80px',
            left: '-100px',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', padding: '2rem' }}>
          {/* Floating badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(43,108,203,0.2)',
              border: '1px solid rgba(43,108,203,0.4)',
              borderRadius: '50px',
              padding: '0.5rem 1.2rem',
              marginBottom: '2rem',
              color: '#7eb3ff',
              fontSize: '0.95rem',
            }}
          >
            <Sparkles size={16} />
            <span>مدعوم بالذكاء الاصطناعي</span>
          </div>

          {/* Logo */}
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: '#2b6ccb',
              borderRadius: '24px',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(43,108,203,0.4)',
            }}
          >
            <span style={{ color: 'white', fontSize: '3.5rem', fontWeight: 'bold' }}>ع</span>
          </div>

          <h1
            style={{
              color: 'white',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            عَريـف
          </h1>
          <p
            style={{
              color: '#b0c4de',
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
              marginBottom: '1rem',
              fontWeight: '600',
            }}
          >
            مساعدك الذكي في التعليم
          </p>
          <p
            style={{
              color: '#8899aa',
              fontSize: '1.15rem',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.8,
            }}
          >
            منصة ذكاء اصطناعي متقدمة تساعد المعلمين في تصحيح الواجبات وتتبع أداء الطلاب، وتمنح
            الطلاب مساعداً ذكياً يشرح لهم المفاهيم خطوة بخطوة.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(135deg, #2b6ccb, #1f56a8)',
                color: 'white',
                border: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.15rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 8px 30px rgba(43,108,203,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(43,108,203,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(43,108,203,0.4)';
              }}
            >
              ابدأ الآن مجاناً
              <ArrowLeft size={20} />
            </button>
            <a
              href="#features"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '1rem 2.5rem',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.15rem',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              اكتشف المزيد
            </a>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '3rem',
              marginTop: '4rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              { value: '+١٠٠٠', label: 'معلم' },
              { value: '+٢٥٠٠٠', label: 'طالب' },
              { value: '+٥٠٠٠٠', label: 'واجب مصحح' },
            ].map((stat, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  style={{ color: '#2b6ccb', fontSize: '1.8rem', fontWeight: 'bold' }}
                >
                  {stat.value}
                </div>
                <div style={{ color: '#8899aa', fontSize: '0.95rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section
        id="features"
        style={{
          padding: '6rem 2rem',
          background: '#f7f9fc',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#e8f0fe',
                borderRadius: '50px',
                padding: '0.4rem 1.2rem',
                marginBottom: '1rem',
                color: '#2b6ccb',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              <Zap size={16} />
              <span>مميزات المنصة</span>
            </div>
            <h2
              style={{
                fontSize: '2.2rem',
                fontWeight: 'bold',
                color: '#1a1a2e',
                marginBottom: '1rem',
              }}
            >
              كل ما يحتاجه المعلم والطالب
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              أدوات ذكية تجعل التعليم أكثر كفاءة ومتعة
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
            }}
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid #e5e7eb',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    backgroundColor: feature.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.2rem',
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: '#1a1a2e',
                    marginBottom: '0.6rem',
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        style={{
          padding: '6rem 2rem',
          background: 'white',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#e6ffed',
              borderRadius: '50px',
              padding: '0.4rem 1.2rem',
              marginBottom: '1rem',
              color: '#38a169',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            <GraduationCap size={16} />
            <span>كيف يعمل</span>
          </div>
          <h2
            style={{
              fontSize: '2.2rem',
              fontWeight: 'bold',
              color: '#1a1a2e',
              marginBottom: '3rem',
            }}
          >
            ثلاث خطوات فقط
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
            }}
          >
            {[
              {
                step: '١',
                title: 'أنشئ فصلك',
                desc: 'سجّل كمعلم وأنشئ فصولك الدراسية وأضف طلابك بسهولة.',
              },
              {
                step: '٢',
                title: 'شارك الواجبات',
                desc: 'أضف واجبات من بنك المناهج السعودية أو أنشئ واجباتك الخاصة.',
              },
              {
                step: '٣',
                title: 'تابع النتائج',
                desc: 'يصحح عريف الإجابات تلقائياً ويعرض لك تقارير مفصلة عن كل طالب.',
              },
            ].map((item, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2b6ccb, #1f56a8)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    boxShadow: '0 8px 20px rgba(43,108,203,0.3)',
                  }}
                >
                  {item.step}
                </div>
                <h3
                  style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '0.5rem' }}
                >
                  {item.title}
                </h3>
                <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: '0.95rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section
        id="pricing"
        style={{
          padding: '6rem 2rem',
          background: '#f7f9fc',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fefcbf',
                borderRadius: '50px',
                padding: '0.4rem 1.2rem',
                marginBottom: '1rem',
                color: '#d69e2e',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              <Star size={16} />
              <span>الأسعار</span>
            </div>
            <h2
              style={{
                fontSize: '2.2rem',
                fontWeight: 'bold',
                color: '#1a1a2e',
                marginBottom: '1rem',
              }}
            >
              أسعار مرنة تناسب الجميع
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>ابدأ مجاناً وترقّ حين تحتاج</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            {plans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: 'white',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  border: plan.isPopular ? '2px solid #2b6ccb' : '1px solid #e5e7eb',
                  transform: plan.isPopular ? 'scale(1.04)' : 'none',
                  boxShadow: plan.isPopular
                    ? '0 20px 50px rgba(43,108,203,0.15)'
                    : '0 4px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.3s',
                }}
                onMouseOver={(e) => {
                  if (!plan.isPopular)
                    e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  if (!plan.isPopular)
                    e.currentTarget.style.transform = 'none';
                }}
              >
                {plan.isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #2b6ccb, #1f56a8)',
                      color: 'white',
                      padding: '0.3rem 1.2rem',
                      borderRadius: '50px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    الأكثر اختياراً ⭐
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '14px',
                      backgroundColor: `${plan.color}22`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {plan.icon}
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
                    {plan.name}
                  </h3>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#1a1a2e' }}>
                    {plan.price === 0 ? 'مجاني' : plan.price}
                  </span>
                  {plan.price !== 0 && (
                    <span style={{ fontSize: '1.1rem', color: '#6b7280' }}> ر.س / {plan.period}</span>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.8rem',
                        marginBottom: '0.9rem',
                        color: '#374151',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#dcfce7',
                          borderRadius: '50%',
                          padding: '2px',
                          flexShrink: 0,
                          marginTop: '3px',
                        }}
                      >
                        <Check size={14} color="#16a34a" />
                      </div>
                      <span style={{ fontSize: '0.95rem' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/login')}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1.05rem',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    border: plan.isPopular ? 'none' : '2px solid #2b6ccb',
                    background: plan.isPopular
                      ? 'linear-gradient(135deg, #2b6ccb, #1f56a8)'
                      : 'transparent',
                    color: plan.isPopular ? 'white' : '#2b6ccb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if (!plan.isPopular) {
                      e.currentTarget.style.background = '#2b6ccb';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!plan.isPopular) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#2b6ccb';
                    }
                  }}
                >
                  {plan.isPopular ? 'ابدأ الآن' : 'ابدأ مجاناً'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        style={{
          padding: '6rem 2rem',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              color: 'white',
              fontSize: '2.2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}
          >
            جاهز لتحويل تجربة التعليم؟
          </h2>
          <p
            style={{
              color: '#8899aa',
              fontSize: '1.15rem',
              marginBottom: '2.5rem',
              lineHeight: 1.8,
            }}
          >
            انضم لآلاف المعلمين والطلاب الذين يستخدمون عريف لتحسين العملية التعليمية.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'linear-gradient(135deg, #2b6ccb, #1f56a8)',
              color: 'white',
              border: 'none',
              padding: '1rem 3rem',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 30px rgba(43,108,203,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(43,108,203,0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(43,108,203,0.4)';
            }}
          >
            سجّل الآن مجاناً
            <ArrowLeft size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: '2rem',
          background: '#111827',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          © {new Date().getFullYear()} عريف — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
