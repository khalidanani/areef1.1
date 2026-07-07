import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAIReady, getWelcomeMessage, sendMessage as sendAIMessage, evaluateConversation, clearChat } from '../lib/gemini';
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

    if (isAIReady()) {
      try {
        // Get real AI welcome message
        const welcomeText = await getWelcomeMessage(
          q.id, q.question_text, q.correct_answer, q.question_type,
          q.page_number, q.exercise_number
        );
        setMessages([{ sender: 'bot', text: welcomeText }]);
      } catch (error) {
        console.error('AI Error:', error);
        // Fallback to basic message if AI fails
        setMessages([
          { sender: 'bot', text: `مرحباً بك! أنا عريف مساعدك الذكي 🤖. هيا لنحل معاً سؤال: ${q.question_text}${questionRef}` },
          { sender: 'bot', text: 'ما هي إجابتك أو كيف تفكر في الحل؟' }
        ]);
      }
    } else {
      setMessages([
        { sender: 'bot', text: `مرحباً بك! أنا عريف مساعدك الذكي 🤖. هيا لنحل معاً سؤال: ${q.question_text}${questionRef}` },
        { sender: 'bot', text: 'ما هي إجابتك أو كيف تفكر في الحل؟' }
      ]);
    }
    setIsThinking(false);
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking || chatFinished) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputValue('');
    setIsThinking(true);

    const currentQ = questions[currentQuestionIndex];

    if (isAIReady()) {
      try {
        // Send to real Gemini AI
        const aiResponse = await sendAIMessage(currentQ.id, userMsg);
        setMessages(prev => [...prev, { sender: 'bot', text: aiResponse }]);
      } catch (error) {
        console.error('AI Response Error:', error);
        setMessages(prev => [...prev, { sender: 'bot', text: 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى 🔄' }]);
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
      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem', fontWeight: 'bold' }}>بوابة الطالب</h2>
          <p style={{ color: 'var(--text-secondary)' }}>الفصل: {className} | الطالب: {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationsBell />
          <button onClick={handleLogout} className="btn btn-outline">العودة للفصول</button>
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
                <div key={hw.id} onClick={() => loadHomeworkQuestions(hw)} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }} className="hover:bg-gray-50">
                  <div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>{hw.title}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>تاريخ النشر: {new Date(hw.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <button className="btn btn-primary" style={{ borderRadius: '20px', padding: '0.5rem 1.5rem' }}>بدء الحل</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--primary-blue)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex gap-2 items-center">
              <button onClick={() => setActiveHomework(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ArrowRight size={24} /></button>
              <h3 style={{ margin: 0, fontWeight: 'bold' }}>{activeHomework.title}</h3>
            </div>
            <div className="flex gap-2 items-center">
              {isAIReady() && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(16,185,129,0.3)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>🟢 AI حقيقي</span>}
              <span style={{ fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                سؤال {currentQuestionIndex + 1} من {questions.length}
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '75%', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary-blue)' : 'white',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)'
                }}>
                  <div className="flex gap-2 items-center" style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '0.8rem' }}>
                    {msg.sender === 'bot' ? <Bot size={16} /> : <User size={16} />}
                    <span>{msg.sender === 'bot' ? 'عريف' : 'أنت'}</span>
                  </div>
                  <p style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>عريف يفكر...</span>
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
          <form onSubmit={handleSendMessage} style={{ padding: '1rem', backgroundColor: 'white', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="اكتب إجابتك هنا ليساعدك عريف..."
              style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', outline: 'none' }}
              disabled={chatFinished || isThinking}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0 1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={chatFinished || isThinking}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
