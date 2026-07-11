import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAIReady, sendMessage as sendAIMessage, evaluateConversation, clearChat, startChat } from '../lib/gemini';
import { Send, Bot, User, CheckCircle, ArrowRight, Loader } from 'lucide-react';
import NotificationsBell from './NotificationsBell';

export default function StudentChat() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [className, setClassName] = useState('');
  const [homeworks, setHomeworks] = useState([]);
  
  // Chat state
  const [activeHomework, setActiveHomework] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatFinished, setChatFinished] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || !classId) {
      navigate('/');
      return;
    }

    const verifyClass = async () => {
      const { data } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();
        
      if (data) setClassName(data.name);
    };

    verifyClass();
    fetchHomeworks(classId);
  }, [navigate, user, classId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchHomeworks(cid) {
    const { data } = await supabase.from('homeworks').select('*').eq('class_id', cid).order('created_at', { ascending: false });
    if (data) setHomeworks(data);
  }

  async function loadHomeworkQuestions(hw) {
    setActiveHomework(hw);
    
    const { data: hqData } = await supabase.from('homework_questions').select('question_id').eq('homework_id', hw.id);
    if (!hqData || hqData.length === 0) return;
    
    const qIds = hqData.map(row => row.question_id);
    
    const { data: qData } = await supabase.from('questions').select('*').in('id', qIds);
    if (qData) {
      setQuestions(qData);
      setCurrentQuestionIndex(0);
      setChatFinished(false);
      await startQuestionChat(qData[0]);
    }
  }

  async function startQuestionChat(q) {
    setIsThinking(true);
    clearChat(q.id);

    // Show question reference immediately
    let questionRef = '';
    if (q.page_number || q.exercise_number) {
      const parts = [];
      if (q.page_number) parts.push(`صفحة ${q.page_number}`);
      if (q.exercise_number) parts.push(`تمرين ${q.exercise_number}`);
      questionRef = ` (${parts.join(' - ')})`;
    }

    // Show question immediately (Instant)
    const initialText = `مرحباً بك! أنا عريف مساعدك الذكي 🤖. هيا لنحل معاً سؤال:\n\n**${q.question_text}**${questionRef}\n\nما هي إجابتك أو كيف تفكر في الحل؟`;
    
    setMessages([
      { sender: 'bot', text: initialText }
    ]);
    
    // Initialize AI context silently in the background
    startChat(q.id, q.question_text, q.correct_answer, q.question_type, q.page_number, q.exercise_number);
    setIsThinking(false);
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking || chatFinished) return;

    const currentQ = questions[currentQuestionIndex];
    const userMessage = inputValue;
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputValue('');
    setIsThinking(true);
    
    // Add placeholder for streaming response
    setMessages(prev => [...prev, { sender: 'bot', text: '' }]);

    if (isAIReady()) {
      try {
        await sendAIMessage(currentQ.id, userMessage, (chunk) => {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = chunk;
            return newMessages;
          });
        });
      } catch (error) {
        console.error('AI Response Error:', error);
        setMessages(prev => prev.slice(0, -1).concat({ sender: 'bot', text: `عذراً، حدث خطأ في الاتصال. حاول مرة أخرى 🔄\nتفاصيل الخطأ: ${error.message}` }));
      }
    } else {
      // Fallback mock logic (if no API key)
      setTimeout(() => {
        const correctAnswer = currentQ.correct_answer;
        if (userMsg.includes(correctAnswer) || (userMsg.match(/\d+/) && userMsg.match(/\d+/)[0] === correctAnswer.match(/\d+/)?.[0])) {
          setMessages(prev => [...prev, { sender: 'bot', text: 'أحسنت! إجابة رائعة وصحيحة ✅ هل تريد الانتقال للسؤال التالي؟' }]);
        } else {
          setMessages(prev => [...prev, { sender: 'bot', text: 'محاولة جيدة! فكّر في المسألة مرة أخرى خطوة بخطوة 💡' }]);
        }
      }, 500);
    }
    setIsThinking(false);
  };

  const saveResponseAndGoNext = async () => {
    const currentQ = questions[currentQuestionIndex];
    
    let grade = 0;
    let feedback = 'يحتاج إلى مراجعة';

    if (isAIReady()) {
      try {
        // Use AI to evaluate the conversation
        const evaluation = await evaluateConversation(messages, currentQ.question_text, currentQ.correct_answer);
        grade = evaluation.grade || 0;
        feedback = evaluation.feedback || 'تم التقييم';
      } catch (e) {
        console.error('Evaluation error:', e);
        // Fallback grading
        const hasCorrect = messages.some(m => m.text.includes('أحسنت'));
        grade = hasCorrect ? 8 : 3;
        feedback = hasCorrect ? 'أجاب بشكل صحيح' : 'يحتاج إلى مراجعة';
      }
    } else {
      const hasCorrect = messages.some(m => m.text.includes('أحسنت'));
      if (hasCorrect) {
        grade = messages.length <= 3 ? 10 : Math.max(5, 10 - (messages.length - 3));
      }
      feedback = grade >= 8 ? 'ممتاز' : 'يحتاج إلى مراجعة';
    }

    try {
      await supabase.from('student_responses').upsert({
        class_id: classId,
        homework_id: activeHomework.id,
        question_id: currentQ.id,
        student_id: user.id,
        conversation_log: messages,
        grade: grade,
        feedback: feedback,
      }, { onConflict: 'homework_id, question_id, student_id' });
    } catch (e) {
      console.error('Error saving response', e);
    }

    clearChat(currentQ.id);

    if (currentQuestionIndex + 1 < questions.length) {
      const nextQ = questions[currentQuestionIndex + 1];
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setChatFinished(false);
      await startQuestionChat(nextQ);
    } else {
      setChatFinished(true);
      setMessages([{ sender: 'bot', text: 'رائع جداً! لقد أنهيت جميع الأسئلة وتم حفظ إجاباتك بنجاح 🏆. يمكنك إغلاق هذه النافذة أو العودة للقائمة الرئيسية.' }]);
      
      // Notify Teacher
      const { data: classData } = await supabase.from('classes').select('teacher_id').eq('id', classId).single();
      if (classData) {
        await supabase.from('notifications').insert({
          user_id: classData.teacher_id,
          title: 'طالب أكمل الواجب 🎯',
          message: `أنهى الطالب ${user?.user_metadata?.full_name || user?.email?.split('@')[0]} حل "${activeHomework.title}" وحصل على التقييم الأولي.`
        });
      }
    }
  };

  const nextQuestion = () => {
    saveResponseAndGoNext();
  };

  const handleLogout = () => {
    navigate('/student-dashboard');
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px' }}>
      <header className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>بوابة الطالب</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>الفصل: {className} | الطالب: {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
        </div>
        <div className="d-flex align-items-center gap-2 w-100 justify-content-between justify-content-sm-end">
          <NotificationsBell />
          <button onClick={handleLogout} className="btn btn-outline btn-sm">العودة للفصول</button>
        </div>
      </header>

      {!activeHomework ? (
        <div className="card">
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>الواجبات المطلوبة</h3>
          {homeworks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد واجبات حالياً في هذا الفصل.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {homeworks.map(hw => (
                <div key={hw.id} onClick={() => loadHomeworkQuestions(hw)} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }} className="hover:bg-gray-50 flex-column flex-sm-row gap-3">
                  <div className="text-center text-sm-start w-100">
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '0.2rem' }}>{hw.title}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تاريخ النشر: {new Date(hw.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <button className="btn btn-primary btn-sm w-100 w-sm-auto" style={{ borderRadius: '20px' }}>بدء الحل</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'min(600px, calc(100vh - 180px))', padding: 0, overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-blue)', color: 'white', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex gap-2 items-center">
              <button onClick={() => setActiveHomework(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}><ArrowRight size={20} /></button>
              <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{activeHomework.title}</h3>
            </div>
            <div className="flex gap-2 items-center">
              {isAIReady() && <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(16,185,129,0.3)', padding: '0.2rem 0.5rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>🟢 AI</span>}
              <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                سؤال {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
                <div style={{ 
                  maxWidth: '85%', 
                  padding: '0.85rem 1.2rem', 
                  borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary-blue)' : '#ffffff',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  position: 'relative'
                }}>
                  <div className="d-flex align-items-center gap-1 mb-1" style={{ opacity: 0.7, fontSize: '0.75rem', fontWeight: 600 }}>
                    {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                    <span>{msg.sender === 'bot' ? 'عريف' : 'أنت'}</span>
                  </div>
                  <p className="mb-0" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{msg.text}</p>
                  
                  {/* Read receipt / timestamp placeholder for Telegram feel */}
                  <div className="text-end mt-1" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                    الآن {msg.sender === 'user' && <CheckCircle size={10} className="ms-1" />}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="d-flex justify-content-start animate-fade-in">
                <div style={{ 
                  padding: '0.8rem 1.2rem', 
                  borderRadius: '20px 20px 20px 0', 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <Loader size={16} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary-blue)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>عريف يكتب...</span>
                </div>
              </div>
            )}
            
            {messages.length > 0 && messages[messages.length - 1].text.includes('أحسنت') && !chatFinished && currentQuestionIndex + 1 < questions.length && (
              <button onClick={nextQuestion} className="btn btn-secondary" style={{ alignSelf: 'center', marginTop: '1rem' }}>
                الانتقال للسؤال التالي ➡️
              </button>
            )}

            {messages.length > 0 && messages[messages.length - 1].text.includes('أحسنت') && !chatFinished && currentQuestionIndex + 1 >= questions.length && (
              <button onClick={nextQuestion} className="btn btn-secondary" style={{ alignSelf: 'center', marginTop: '1rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                إنهاء الواجب وحفظ الدرجات ✅
              </button>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <textarea 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="اكتب رسالة..."
              style={{ 
                flex: 1, 
                padding: '0.8rem 1rem', 
                borderRadius: '24px', 
                border: '1px solid var(--border-color)', 
                outline: 'none',
                resize: 'none',
                minHeight: '45px',
                maxHeight: '120px',
                backgroundColor: '#f1f5f9',
                fontFamily: 'inherit',
                fontSize: '0.95rem'
              }}
              disabled={chatFinished || isThinking}
              rows={1}
            />
            <button 
              type="submit" 
              className="btn btn-primary rounded-circle d-flex justify-content-center align-items-center" 
              style={{ width: '45px', height: '45px', flexShrink: 0, transition: 'transform 0.2s' }}
              disabled={chatFinished || isThinking || !inputValue.trim()}
            >
              <Send size={20} style={{ marginLeft: '-2px' }} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
