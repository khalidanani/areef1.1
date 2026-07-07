import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, X, CheckCircle } from 'lucide-react';

export default function CheckoutModal({ item, discount, onClose, onSuccess }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Calculate final price
  const discountAmount = (item.price * discount) / 100;
  const finalPrice = Math.max(0, item.price - discountAmount);

  const handlePayment = async () => {
    setProcessing(true);
    
    // محاكاة تأخير الدفع
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      if (item.type === 'book') {
        // إضافة المادة للمشتريات
        const { error } = await supabase.from('teacher_book_purchases').insert([{
          teacher_id: user.id,
          book_id: item.id
        }]);
        if (error) throw error;
      } else if (item.type === 'class') {
        // زيادة رصيد الفصول
        const { data: teacher, error: fetchError } = await supabase.from('teachers').select('max_classes').eq('id', user.id).single();
        if (fetchError) throw fetchError;
        
        const newMax = (teacher.max_classes || 0) + 1;
        const { error: updateError } = await supabase.from('teachers').update({ max_classes: newMax }).eq('id', user.id);
        if (updateError) throw updateError;
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء عملية الشراء: ' + error.message);
      setProcessing(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content animate-fade-in">
          
          <div className="modal-header border-bottom-0 pb-0">
            <button type="button" className="btn-close" onClick={onClose} disabled={processing || success}></button>
          </div>

          <div className="modal-body text-center pt-0 px-4 pb-4">
            {success ? (
              <div className="py-4">
                <CheckCircle size={64} color="#28c76f" className="mb-3" />
                <h4 className="text-success mb-2">تمت العملية بنجاح!</h4>
                <p className="text-muted">شكراً لك.. جاري تحديث بياناتك..</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="bg-label-primary rounded-circle mx-auto d-flex justify-content-center align-items-center mb-3" style={{ width: '80px', height: '80px' }}>
                    <CreditCard size={40} className="text-primary" />
                  </div>
                  <h4 className="mb-1">تأكيد الشراء</h4>
                  <p className="text-muted">مراجعة ودفع</p>
                </div>

                <div className="bg-lighter rounded p-3 mb-4 text-start">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-heading">المنتج:</span>
                    <span className="fw-bold">{item.name}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-heading">السعر الأساسي:</span>
                    <span>{item.price} ريال</span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-success">
                      <span>كود خصم ({discount}%):</span>
                      <span>- {discountAmount} ريال</span>
                    </div>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between fw-bold fs-5 text-primary">
                    <span>الإجمالي المطلوب:</span>
                    <span>{finalPrice} ريال</span>
                  </div>
                </div>

                {finalPrice === 0 ? (
                  <button className="btn btn-success w-100 py-2 fs-5" onClick={handlePayment} disabled={processing}>
                    {processing ? 'جاري التنفيذ...' : 'تأكيد الشراء المجاني الآن'}
                  </button>
                ) : (
                  <button className="btn btn-primary w-100 py-2 fs-5" onClick={handlePayment} disabled={processing}>
                    {processing ? 'جاري معالجة الدفع...' : `ادفع ${finalPrice} ريال`}
                  </button>
                )}

                <div className="mt-3 text-muted small">
                  <p className="mb-0">ملاحظة: هذه بوابة محاكاة وهمية حالياً.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
