import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, BookOpen, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CheckoutModal from './CheckoutModal';

export default function Store() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [books, setBooks] = useState([]);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [classPrice, setClassPrice] = useState(50);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Checkout states
  const [checkoutItem, setCheckoutItem] = useState(null); // { type: 'class' | 'book', id?, name, price }

  useEffect(() => {
    fetchStoreData();
  }, [user]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      // Fetch books
      const { data: booksData } = await supabase.from('books').select('*').order('grade_level');
      setBooks(booksData || []);

      // Fetch user's purchased books
      const { data: purchasesData } = await supabase.from('teacher_book_purchases').select('book_id').eq('teacher_id', user.id);
      if (purchasesData) {
        setPurchasedBooks(purchasesData.map(p => p.book_id));
      }

      // Fetch class price from settings
      const { data: settingsData } = await supabase.from('app_settings').select('value').eq('key', 'class_price').single();
      if (settingsData) {
        setClassPrice(parseInt(settingsData.value) || 50);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode) return;
    try {
      const { data } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('is_active', true).single();
      if (data) {
        setDiscount(data.discount_percentage);
        alert(`تم تطبيق كود الخصم بنجاح! خصم ${data.discount_percentage}%`);
      } else {
        alert('كود الخصم غير صحيح أو منتهي الصلاحية');
        setDiscount(0);
      }
    } catch (e) {
      alert('كود الخصم غير صحيح');
      setDiscount(0);
    }
  };

  const handleBuyClass = () => {
    setCheckoutItem({
      type: 'class',
      name: 'فصل دراسي إضافي',
      price: classPrice
    });
  };

  const handleBuyBook = (book) => {
    setCheckoutItem({
      type: 'book',
      id: book.id,
      name: `مادة ${book.title} - ${book.grade_level}`,
      price: book.price
    });
  };

  const handleCheckoutSuccess = async () => {
    setCheckoutItem(null);
    setCouponCode('');
    setDiscount(0);
    await fetchStoreData(); // Refresh to show as purchased
    alert('تمت عملية الشراء بنجاح!');
  };

  if (loading) return <div className="container p-5 text-center">جاري تحميل المتجر...</div>;

  return (
    <div className="container-xxl flex-grow-1 container-p-y animate-fade-in">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">الرئيسية / </span> المتجر
      </h4>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white text-center p-4">
            <h3 className="text-white mb-2">متجر عريف</h3>
            <p className="mb-0">قم بشراء المواد التي تدرسها لتتمكن من استخدام الذكاء الاصطناعي وإنشاء الواجبات لها بكل سهولة.</p>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        {/* Coupon Section */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">لديك كود خصم؟</h5>
              <form className="d-flex gap-2 mt-3" onSubmit={applyCoupon}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="أدخل كود الخصم هنا" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value)} 
                />
                <button type="submit" className="btn btn-secondary">تطبيق</button>
              </form>
              {discount > 0 && (
                <div className="alert alert-success mt-3 py-2 mb-0">
                  تم تفعيل الخصم بنسبة {discount}% على مشترياتك القادمة.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buy Class Section */}
        <div className="col-md-6 mb-4">
          <div className="card h-100 border-primary">
            <div className="card-body text-center d-flex flex-column justify-content-center">
              <h5 className="card-title text-primary">تحتاج فصول أكثر؟</h5>
              <p className="card-text">قم بشراء رصيد لإنشاء فصول إضافية لطلابك.</p>
              <h3 className="mb-3">{classPrice} <small className="text-muted fs-6">ريال / للفصل</small></h3>
              <button className="btn btn-primary mx-auto" onClick={handleBuyClass}>
                <PlusCircle size={18} className="me-2" />
                شراء فصل جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <h5 className="mb-4">المناهج الدراسية</h5>
        </div>
        {books.map(book => {
          const isPurchased = purchasedBooks.includes(book.id) || book.is_free;
          
          return (
            <div className="col-md-4 mb-4" key={book.id}>
              <div className={`card h-100 ${isPurchased ? 'bg-label-success border-0' : ''}`}>
                <div className="card-body text-center">
                  <div className="mb-3">
                    <BookOpen size={40} color={isPurchased ? '#28c76f' : '#696cff'} />
                  </div>
                  <h5 className="card-title mb-1">{book.title}</h5>
                  <p className="text-muted mb-3">{book.grade_level} - {book.term}</p>
                  
                  {isPurchased ? (
                    <div className="d-flex align-items-center justify-content-center text-success fw-bold">
                      <Check size={18} className="me-2" />
                      مملوك / متاح
                    </div>
                  ) : (
                    <>
                      <h4 className="mb-3 text-primary">{book.price} <small className="fs-6">ريال</small></h4>
                      <button className="btn btn-outline-primary w-100" onClick={() => handleBuyBook(book)}>
                        <ShoppingCart size={16} className="me-2" />
                        شراء المادة
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {checkoutItem && (
        <CheckoutModal 
          item={checkoutItem}
          discount={discount}
          onClose={() => setCheckoutItem(null)} 
          onSuccess={handleCheckoutSuccess} 
        />
      )}
    </div>
  );
}
