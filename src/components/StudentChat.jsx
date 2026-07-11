import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAIReady, sendMessage as sendAIMessage, evaluateConversation, clearChat, startChat } from '../lib/gemini';
import { Send, Bot, User, Loader, Plus, Menu } from 'lucide-react';
import areefMascot from '../assets/areef_mascot.png';

export default function StudentChat() {
  const { classId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hwId = searchParams.get('hw');

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
    if (hwId && homeworks.length > 0 && !activeHomework) {
      const hw = homeworks.find(h => h.id === hwId);
      if (hw) {
        // Remove hw from URL so it doesn't auto-trigger again if they cancel
        navigate(`/student-chat/${classId}`, { replace: true });
        loadHomeworkQuestions(hw);
      }
    }
  }, [hwId, homeworks, activeHomework, navigate, classId]);

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

    let questionRef = '';
    if (q.page_number || q.exercise_number) {
      const parts = [];
      if (q.page_number) parts.push(`صفحة ${q.page_number}`);
      if (q.exercise_number) parts.push(`تمرين ${q.exercise_number}`);
      questionRef = ` (${parts.join(' - ')})`;
    }

    const initialText = `مرحباً بك! أنا عريف مساعدك الذكي 🤖. هيا لنحل معاً سؤال:\n\n**${q.question_text}**${questionRef}\n\nما هي إجابتك أو كيف تفكر في الحل؟`;
    
    setMessages([
      { sender: 'bot', text: initialText }
    ]);
    
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
      setTimeout(() => {
        const correctAnswer = currentQ.correct_answer;
        if (userMessage.includes(correctAnswer) || (userMessage.match(/\d+/) && userMessage.match(/\d+/)[0] === correctAnswer.match(/\d+/)?.[0])) {
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
        const evaluation = await evaluateConversation(messages, currentQ.question_text, currentQ.correct_answer);
        grade = evaluation.grade || 0;
        feedback = evaluation.feedback || 'تم التقييم';
      } catch (e) {
        console.error('Evaluation error:', e);
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
      setMessages([{ sender: 'bot', text: 'رائع جداً! لقد أنهيت جميع الأسئلة وتم حفظ إجاباتك بنجاح 🏆. يمكنك إغلاق المحادثة متى شئت.' }]);
      
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

  return (
    <div className="d-flex flex-column h-100 position-relative bg-white" style={{ minHeight: 'calc(100vh - 80px)' }}>
      {/* Top Mobile Bar */}
      <div className="d-xl-none p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
        <button className="btn btn-icon btn-text-secondary" onClick={() => document.getElementById('layout-menu')?.classList.toggle('layout-menu-expanded')}>
          <Menu size={24} />
        </button>
        <div className="fw-bold fs-5 text-truncate" style={{ maxWidth: '60%' }}>{activeHomework?.title || 'عريف'}</div>
        <button className="btn btn-icon btn-text-secondary" onClick={() => navigate('/student-dashboard')}>
          <Plus size={24} />
        </button>
      </div>

      {!activeHomework ? (
        /* Empty State: Select a homework */
        <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 animate-fade-in text-center">
          <img src={areefMascot} alt="عريف" className="rounded-circle shadow-sm mb-4" style={{ width: '80px', height: '80px' }} />
          <h2 className="fw-bold mb-3 text-dark">واجبات فصل: {className}</h2>
          <p className="text-muted mb-5" style={{ maxWidth: '500px' }}>
            الرجاء اختيار أحد الواجبات للبدء بحله مع عريف.
          </p>
          
          <div className="row g-3 w-100 max-w-3xl" style={{ maxWidth: '700px' }}>
            {homeworks.length === 0 ? (
              <p className="text-muted w-100 text-center">لا توجد واجبات حالياً في هذا الفصل.</p>
            ) : (
              homeworks.map(hw => (
                <div key={hw.id} className="col-12 col-md-6">
                  <div 
                    className="card border shadow-sm h-100 cursor-pointer hover-bg-light transition-all p-3 text-start"
                    onClick={() => loadHomeworkQuestions(hw)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex flex-column h-100 justify-content-between">
                      <span className="text-primary fw-bold mb-2">📝 {hw.title}</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>انقر لبدء الحل مع عريف</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Homework Chat View */
        <div className="flex-grow-1 overflow-auto p-0 p-md-4 bg-light" style={{ paddingBottom: '120px !important' }}>
          
          {/* Status Bar for Homework Progress */}
          <div className="mx-auto sticky-top d-none d-md-flex align-items-center justify-content-center pt-2 pb-3" style={{ maxWidth: '800px', zIndex: 10 }}>
             <span className="badge bg-primary rounded-pill px-3 py-2 shadow-sm d-flex align-items-center gap-2">
                سؤال {currentQuestionIndex + 1} من {questions.length}
             </span>
          </div>

          <div className="mx-auto" style={{ maxWidth: '800px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`d-flex p-4 ${msg.sender === 'user' ? 'justify-content-end bg-transparent' : 'justify-content-start bg-white border-bottom border-top'}`}>
                <div className="d-flex gap-3 max-w-4xl w-100" style={{ flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                  <div className="flex-shrink-0">
                    {msg.sender === 'bot' ? (
                      <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                        <Bot size={20} className="text-success" />
                      </div>
                    ) : (
                      <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '36px', height: '36px' }}>
                        {user?.user_metadata?.full_name?.charAt(0) || <User size={20} />}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1" style={{ paddingTop: '6px' }}>
                    <p className="mb-0 text-dark" style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '1rem' }}>{msg.text}</p>
                    
                    {/* Next Question Button inside the last message if applicable */}
                    {msg.sender === 'bot' && i === messages.length - 1 && msg.text.includes('أحسنت') && !chatFinished && currentQuestionIndex + 1 < questions.length && (
                      <div className="mt-3">
                        <button onClick={nextQuestion} className="btn btn-outline-success btn-sm rounded-pill px-4">
                          الانتقال للسؤال التالي ➡️
                        </button>
                      </div>
                    )}
                    
                    {msg.sender === 'bot' && i === messages.length - 1 && msg.text.includes('أحسنت') && !chatFinished && currentQuestionIndex + 1 >= questions.length && (
                      <div className="mt-3">
                        <button onClick={nextQuestion} className="btn btn-success btn-sm rounded-pill px-4">
                          إنهاء الواجب وحفظ الدرجات ✅
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="d-flex p-4 bg-white border-bottom border-top justify-content-start">
                 <div className="d-flex gap-3 max-w-4xl w-100">
                  <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                    <Loader size={18} className="text-success" style={{ animation: 'spin 1.5s linear infinite' }} />
                  </div>
                  <div className="flex-grow-1" style={{ paddingTop: '8px' }}>
                    <span className="text-muted fw-semibold">عريف يكتب...</span>
                  </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input Area (Only show if homework is active) */}
      {activeHomework && (
        <div className="position-absolute bottom-0 start-0 w-100 bg-transparent p-3 p-md-4" style={{ background: 'linear-gradient(180deg, transparent, white 20%)' }}>
          <div className="mx-auto" style={{ maxWidth: '800px' }}>
            <form onSubmit={handleSendMessage} className="position-relative bg-white border shadow-sm" style={{ borderRadius: '24px' }}>
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="أدخل إجابتك هنا..."
                className="form-control border-0 bg-transparent shadow-none"
                style={{ 
                  padding: '1rem 3.5rem 1rem 1.5rem', 
                  minHeight: '56px', 
                  maxHeight: '200px', 
                  resize: 'none',
                  fontSize: '1rem'
                }}
                rows={1}
                disabled={chatFinished || isThinking}
              />
              <button 
                type="submit" 
                className={`btn btn-icon position-absolute rounded-circle ${inputValue.trim() ? 'btn-primary' : 'btn-secondary'}`}
                style={{ left: '8px', bottom: '8px', width: '40px', height: '40px', transition: 'all 0.2s' }}
                disabled={!inputValue.trim() || isThinking || chatFinished}
              >
                <Send size={18} style={{ marginLeft: '-2px' }} />
              </button>
            </form>
            <div className="text-center mt-2 d-md-none">
              <span className="badge bg-primary rounded-pill px-2 py-1 shadow-sm opacity-75">
                 سؤال {currentQuestionIndex + 1} من {questions.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
