// ============================================================================
// payments.js — بوابة الدفع (Payment Gateway Integration)
// ============================================================================
//
// هذا الملف يحتوي على إعدادات بوابة الدفع ودوال معالجة المدفوعات.
// حالياً يتم حفظ البيانات في Supabase فقط (بدون بوابة دفع حقيقية).
//
// لتفعيل بوابة الدفع الحقيقية (Moyasar):
//   1. أضف المفاتيح في ملف .env.local
//   2. فعّل الكود المُعلّم بـ TODO في دالة processPayment
//   3. تأكد من إعداد callback_url الصحيح
//
// للتبديل إلى Stripe بدلاً من Moyasar:
//   1. استبدل مفاتيح Moyasar بمفاتيح Stripe
//   2. عدّل دالة processPayment لاستخدام Stripe API
//
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// PAYMENT_CONFIG — إعدادات بوابة الدفع
// ============================================================================
//
// أضف المفاتيح الحقيقية في ملف .env.local:
//   VITE_MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxx
//   VITE_MOYASAR_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxx
//   VITE_PAYMENT_CALLBACK_URL=https://yourdomain.com/payment/callback
//
// ============================================================================
export const PAYMENT_CONFIG = {
  // مفتاح Moyasar العام (Publishable Key) — يُستخدم في الواجهة الأمامية
  publishable_key: import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY || '',

  // مفتاح Moyasar السري (Secret Key) — يُستخدم في الخادم فقط (Backend)
  // ⚠️ تحذير: لا تستخدم هذا المفتاح في الواجهة الأمامية أبداً
  secret_key: import.meta.env.VITE_MOYASAR_SECRET_KEY || '',

  // رابط إعادة التوجيه بعد إتمام الدفع
  callback_url: import.meta.env.VITE_PAYMENT_CALLBACK_URL || 'http://localhost:5173/payment/callback',

  // العملة الافتراضية
  currency: 'SAR',

  // وضع التشغيل: true = تجريبي، false = إنتاجي
  // TODO: غيّر إلى false عند الإطلاق الفعلي
  is_test_mode: true,

  // رابط Moyasar API
  // TODO: استخدم https://api.moyasar.com/v1 للإنتاج
  api_base_url: 'https://api.moyasar.com/v1',
};

/**
 * هل بوابة الدفع مُعدّة وجاهزة؟
 * تتحقق من وجود المفاتيح اللازمة.
 */
export function isPaymentGatewayReady() {
  return !!(PAYMENT_CONFIG.publishable_key && PAYMENT_CONFIG.secret_key);
}

// ============================================================================
// processPayment — معالجة عملية الدفع
// ============================================================================
//
// المعاملات:
//   amount   — المبلغ بالريال السعودي (مثال: 299)
//   method   — طريقة الدفع: 'mada' | 'visa' | 'apple'
//   cardData — بيانات البطاقة: { number, name, expiry, cvv }
//   userId   — معرّف المستخدم من Supabase Auth
//
// الخطوات:
//   1. (TODO) إرسال طلب الدفع إلى Moyasar API
//   2. حفظ الفاتورة في جدول invoices
//   3. تحديث الاشتراك في جدول subscriptions
//
// ============================================================================
export async function processPayment(amount, method, cardData, userId) {
  if (!userId) {
    throw new Error('المستخدم غير مسجّل الدخول');
  }

  const totalAmount = amount * 1.15; // إضافة ضريبة القيمة المضافة 15%

  // ──────────────────────────────────────────────────────────────────────
  // TODO: تفعيل بوابة الدفع الحقيقية (Moyasar)
  // ──────────────────────────────────────────────────────────────────────
  //
  // عند جاهزية مفاتيح Moyasar، أزل التعليق عن الكود التالي:
  //
  // if (isPaymentGatewayReady()) {
  //   const moyasarPayment = await fetch(`${PAYMENT_CONFIG.api_base_url}/payments`, {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Basic ${btoa(PAYMENT_CONFIG.secret_key + ':')}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       amount: Math.round(totalAmount * 100), // Moyasar يتوقع المبلغ بالهللات
  //       currency: PAYMENT_CONFIG.currency,
  //       description: `اشتراك عريف — ${cardData.planName || 'باقة'}`,
  //       callback_url: PAYMENT_CONFIG.callback_url,
  //       source: {
  //         type: method === 'apple' ? 'applepay' : 'creditcard',
  //         ...(method !== 'apple' && {
  //           name: cardData.name,
  //           number: cardData.number.replace(/\s/g, ''),
  //           month: cardData.expiry.split('/')[0],
  //           year: `20${cardData.expiry.split('/')[1]}`,
  //           cvc: cardData.cvv,
  //         }),
  //       },
  //     }),
  //   });
  //
  //   const paymentResult = await moyasarPayment.json();
  //
  //   if (paymentResult.status !== 'paid' && paymentResult.status !== 'authorized') {
  //     throw new Error(paymentResult.message || 'فشلت عملية الدفع');
  //   }
  //
  //   // استخدم paymentResult.id كمعرّف للعملية
  //   const gatewayTransactionId = paymentResult.id;
  // }
  //
  // ──────────────────────────────────────────────────────────────────────
  // TODO: بديل — تفعيل Stripe بدلاً من Moyasar
  // ──────────────────────────────────────────────────────────────────────
  //
  // import { loadStripe } from '@stripe/stripe-js';
  // const stripe = await loadStripe(PAYMENT_CONFIG.publishable_key);
  // const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
  //   payment_method: { card: cardElement }
  // });
  //
  // ──────────────────────────────────────────────────────────────────────

  // === الوضع الحالي: محاكاة الدفع (Mock) ===
  // يتم حفظ البيانات في Supabase مباشرة بدون بوابة دفع حقيقية.
  // سيتم استبدال هذا القسم عند تفعيل المفاتيح أعلاه.

  // 1. حفظ الفاتورة في Supabase
  const { error: invoiceError } = await supabase.from('invoices').insert({
    user_id: userId,
    amount: totalAmount,
    payment_method: method,
    status: 'paid',
    // TODO: أضف هذه الحقول بعد تفعيل البوابة:
    // gateway_transaction_id: gatewayTransactionId,
    // gateway_response: JSON.stringify(paymentResult),
  });

  if (invoiceError) {
    throw new Error(`خطأ في حفظ الفاتورة: ${invoiceError.message}`);
  }

  // 2. تحديث / إنشاء الاشتراك
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // اشتراك سنوي

  const { error: subError } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan_name: cardData.planName || 'premium',
    status: 'active',
    period_end: periodEnd.toISOString(),
    // TODO: أضف هذه الحقول بعد تفعيل البوابة:
    // gateway_subscription_id: null,
  }, { onConflict: 'user_id' });

  if (subError) {
    throw new Error(`خطأ في تحديث الاشتراك: ${subError.message}`);
  }

  return { success: true, amount: totalAmount };
}

// ============================================================================
// getSubscriptionStatus — جلب حالة اشتراك المستخدم
// ============================================================================
export async function getSubscriptionStatus(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PGRST116 = no rows found — ليس خطأً حقيقياً
    if (error.code === 'PGRST116') return null;
    console.error('خطأ في جلب حالة الاشتراك:', error);
    return null;
  }

  // التحقق من انتهاء صلاحية الاشتراك
  if (data && data.period_end) {
    const now = new Date();
    const periodEnd = new Date(data.period_end);
    if (periodEnd < now && data.status === 'active') {
      // الاشتراك منتهي — تحديث الحالة
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', userId);
      return { ...data, status: 'expired' };
    }
  }

  return data;
}

// ============================================================================
// cancelSubscription — إلغاء اشتراك المستخدم
// ============================================================================
export async function cancelSubscription(userId) {
  if (!userId) {
    throw new Error('المستخدم غير مسجّل الدخول');
  }

  // ──────────────────────────────────────────────────────────────────────
  // TODO: إلغاء الاشتراك في بوابة الدفع أيضاً
  // ──────────────────────────────────────────────────────────────────────
  //
  // if (isPaymentGatewayReady()) {
  //   // جلب معرّف الاشتراك من البوابة
  //   const sub = await getSubscriptionStatus(userId);
  //   if (sub?.gateway_subscription_id) {
  //     await fetch(`${PAYMENT_CONFIG.api_base_url}/subscriptions/${sub.gateway_subscription_id}`, {
  //       method: 'PUT',
  //       headers: {
  //         'Authorization': `Basic ${btoa(PAYMENT_CONFIG.secret_key + ':')}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ status: 'canceled' }),
  //     });
  //   }
  // }
  //
  // ──────────────────────────────────────────────────────────────────────

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`خطأ في إلغاء الاشتراك: ${error.message}`);
  }

  return { success: true };
}
