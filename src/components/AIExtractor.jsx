import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, Sparkles, FileImage } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AIExtractor({ lesson, onClose }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractQuestions = async () => {
    if (!imageFile) return;
    setIsExtracting(true);
    setErrorMsg('');
    setExtractedQuestions([]);

    try {
      const base64Data = imagePreview.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('gemini', {
        body: { 
          action: 'extract', 
          payload: { imageBase64: base64Data, mimeType: imageFile.type } 
        }
      });

      if (error) throw error;

      try {
        let textResult = data;
        if (typeof data === 'string') textResult = JSON.parse(data);
        
        if (Array.isArray(textResult)) {
          setExtractedQuestions(textResult);
        } else {
          setErrorMsg('الذكاء الاصطناعي لم يعد البيانات بصيغة صحيحة.');
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('فشل في تحليل النتيجة من الدالة السحابية.');
      }

    } catch (error) {
      console.error(error);
      setErrorMsg('حدث خطأ أثناء التواصل مع محرك Gemini السحابي.');
    }
    
    setIsExtracting(false);
  };

  const saveToDatabase = async () => {
    if (extractedQuestions.length === 0) return;
    setIsExtracting(true);
    setErrorMsg('');

    try {
      const inserts = extractedQuestions.map(q => ({
        lesson_id: lesson.id,
        question_text: q.question_text,
        question_type: q.question_type || 'مقالي',
        correct_answer: q.correct_answer || 'متروك للمعلم',
        options: q.options ? JSON.stringify(q.options) : null,
        difficulty_level: q.difficulty_level || 'متوسط',
        page_number: q.page_number ? String(q.page_number) : null,
        exercise_number: q.exercise_number ? String(q.exercise_number) : null
      }));

      const { error } = await supabase.from('questions').insert(inserts);
      
      if (error) throw error;
      
      setSuccessMsg('تم حفظ الأسئلة في بنك المناهج بنجاح! 🎉');
      setTimeout(() => {
        onClose(); // Close modal after 2 seconds
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء حفظ الأسئلة في قاعدة البيانات.');
    }
    
    setIsExtracting(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} color="#a0aec0" />
        </button>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✨ أداة عريف لاستخراج المناهج (AI)
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            استخراج الأسئلة من الصور وحفظها في درس: <strong>{lesson.title}</strong>
          </p>
        </div>

        <div>
          {errorMsg && <div style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{errorMsg}</div>}
          {successMsg && <div style={{ backgroundColor: '#c6f6d5', color: '#2f855a', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{successMsg}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Upload Section */}
              <div 
                style={{ 
                  border: '2px dashed var(--primary-blue)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '2rem', 
                  textAlign: 'center',
                  backgroundColor: 'rgba(43, 108, 203, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  style={{ display: 'none' }} 
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
                ) : (
                  <>
                    <Upload size={48} color="var(--primary-blue)" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>ارفع صورة الصفحة هنا</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>اضغط لاختيار صورة من جهازك (JPG, PNG)</p>
                  </>
                )}
              </div>

              {/* Action Section */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>خطوات العمل:</h4>
                  <ol style={{ paddingRight: '1.5rem', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>ارفع صورة واضحة للصفحة التي تحتوي على التمارين.</li>
                    <li>اضغط على زر "استخراج الأسئلة".</li>
                    <li>راجع الأسئلة المستخرجة في الجدول أدناه.</li>
                    <li>اعتمد الأسئلة لتنزل فوراً في بنك المناهج.</li>
                  </ol>
                  
                  <button 
                    onClick={extractQuestions}
                    disabled={!imageFile || isExtracting}
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isExtracting ? 'جاري القراءة والتحليل...' : (
                      <><FileImage size={20} /> استخراج الأسئلة بالذكاء الاصطناعي</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Extracted Questions Table */}
            {extractedQuestions.length > 0 && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>النتائج المستخرجة ({extractedQuestions.length} سؤال):</h3>
                  <button onClick={saveToDatabase} disabled={isExtracting} className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> حفظ في بنك المناهج
                  </button>
                </div>
                
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>التمرين</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>نص السؤال</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>الإجابة المستخرجة</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>الصفحة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedQuestions.map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{q.exercise_number || '-'}</td>
                          <td style={{ padding: '1rem' }}>{q.question_text}</td>
                          <td style={{ padding: '1rem', color: '#2f855a' }}>{q.correct_answer}</td>
                          <td style={{ padding: '1rem' }}>{q.page_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
