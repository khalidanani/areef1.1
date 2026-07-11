import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Bot, User, Loader, Plus, Menu } from 'lucide-react';
import areefMascot from '../assets/areef_mascot.png';
import { isAIReady, sendGeneralMessage } from '../lib/gemini';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  
  const messagesEndRef = useRef(null);

  // Fetch homeworks for the empty state
  useEffect(() => {
    if (user) {
      const fetchHomeworks = async () => {
        const { data: enrollmentData } = await supabase.from('class_students').select('class_id').eq('student_id', user.id);
        if (enrollmentData && enrollmentData.length > 0) {
          const classIds = enrollmentData.map(e => e.class_id);
          const { data } = await supabase.from('homeworks').select('*').in('class_id', classIds).order('created_at', { ascending: false }).limit(4);
          if (data) setHomeworks(data);
        }
      };
      fetchHomeworks();
    }
  }, [user]);

  // Parse URL query parameter for chat ID
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get('chat');
    if (chatId) {
      setCurrentChatId(chatId);
      loadChatHistory(chatId);
    } else {
      setCurrentChatId(null);
      setMessages([]);
    }
  }, [location.search]);

  const loadChatHistory = async (chatId) => {
    const { data, error } = await supabase.from('student_chats').select('messages').eq('id', chatId).single();
    if (data && data.messages) {
      setMessages(data.messages);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewChat = async (initialMessage) => {
    try {
      const { data, error } = await supabase.from('student_chats').insert({
        student_id: user.id,
        title: initialMessage.substring(0, 40) + '...',
        messages: [{ sender: 'user', text: initialMessage }]
      }).select().single();
      
      if (error) throw error;
      return data.id;
    } catch (e) {
      console.error('Error creating chat:', e);
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userMessage = inputValue;
    setInputValue('');
    
    // Add user message to UI
    const updatedMessages = [...messages, { sender: 'user', text: userMessage }];
    setMessages([...updatedMessages, { sender: 'bot', text: '' }]); // Placeholder
    setIsThinking(true);

    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat(userMessage);
      setCurrentChatId(chatId);
      // Navigate to the chat URL so it persists
      navigate(`/student-dashboard?chat=${chatId}`);
    } else {
      // Save user message immediately
      supabase.from('student_chats').update({ messages: updatedMessages }).eq('id', chatId).then();
    }

    if (isAIReady()) {
      try {
        const homeworksContextStr = homeworks.length > 0 
          ? homeworks.map(h => `- ${h.title}`).join('\n') 
          : 'لا يوجد واجبات حالياً.';

        await sendGeneralMessage(updatedMessages, userMessage, (chunk) => {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].text = chunk;
            return newMsgs;
          });
        }, homeworksContextStr);
        
        // Save final to DB
        setMessages(prev => {
          supabase.from('student_chats').update({ messages: prev }).eq('id', chatId).then();
          return prev;
        });

      } catch (error) {
        console.error('AI Error:', error);
        setMessages(prev => prev.slice(0, -1).concat({ sender: 'bot', text: `عذراً، حدث خطأ: ${error.message}` }));
      }
    } else {
      setTimeout(() => {
        setMessages(prev => {
          const newMsgs = prev.slice(0, -1).concat({ sender: 'bot', text: 'أنا عريف، لا يوجد اتصال بالذكاء الاصطناعي حالياً. يرجى مراجعة الإعدادات.' });
          if (chatId) supabase.from('student_chats').update({ messages: newMsgs }).eq('id', chatId).then();
          return newMsgs;
        });
      }, 1000);
    }
    
    setIsThinking(false);
  };

  return (
    <div className="d-flex flex-column h-100 position-relative bg-white" style={{ minHeight: 'calc(100vh - 80px)' }}>
      {/* Top Mobile Bar (visible on small screens) */}
      <div className="d-xl-none p-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
        <button className="btn btn-icon btn-text-secondary" onClick={() => document.getElementById('layout-menu')?.classList.toggle('layout-menu-expanded')}>
          <Menu size={24} />
        </button>
        <div className="fw-bold fs-5">عَريـف</div>
        <button className="btn btn-icon btn-text-secondary" onClick={() => { navigate('/student-dashboard'); setMessages([]); setCurrentChatId(null); }}>
          <Plus size={24} />
        </button>
      </div>

      {messages.length === 0 ? (
        /* Empty State (ChatGPT Landing) */
        <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 animate-fade-in text-center">
          <img src={areefMascot} alt="عريف" className="rounded-circle shadow-sm mb-4" style={{ width: '80px', height: '80px' }} />
          <h2 className="fw-bold mb-3 text-dark">كيف يمكنني مساعدتك اليوم؟</h2>
          <p className="text-muted mb-5" style={{ maxWidth: '500px' }}>
            أنا مساعدك الذكي عريف. يمكنك سؤالي عن أي موضوع دراسي، أو فتح القائمة الجانبية لحل واجباتك المدرسية المحددة.
          </p>
          
          <div className="row g-3 w-100 max-w-3xl" style={{ maxWidth: '700px' }}>
            {homeworks.length > 0 ? (
              homeworks.map((hw, i) => (
                <div key={i} className="col-12 col-md-6">
                  <div 
                    className="card border shadow-sm h-100 cursor-pointer hover-bg-light transition-all p-3 text-start"
                    onClick={() => navigate(`/student-chat/${hw.class_id}?hw=${hw.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex flex-column h-100 justify-content-between">
                      <span className="text-primary fw-bold mb-2">📝 {hw.title}</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>انقر لبدء الحل مع عريف</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              ['اشرح لي مبدأ أرخميدس ببساطة', 'كيف أحل معادلة من الدرجة الثانية؟', 'اكتب لي تعبيراً عن بر الوالدين', 'ما هي عاصمة الدولة الأموية؟'].map((suggestion, i) => (
                <div key={i} className="col-12 col-md-6">
                  <div 
                    className="card border shadow-none h-100 cursor-pointer hover-bg-light transition-all p-3 text-start"
                    onClick={() => setInputValue(suggestion)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="text-secondary fw-medium">{suggestion}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Chat View */
        <div className="flex-grow-1 overflow-auto p-0 p-md-4 bg-light" style={{ paddingBottom: '100px !important' }}>
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

      {/* Input Area */}
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
              placeholder="اسأل عريف أي شيء..."
              className="form-control border-0 bg-transparent shadow-none"
              style={{ 
                padding: '1rem 3.5rem 1rem 1.5rem', 
                minHeight: '56px', 
                maxHeight: '200px', 
                resize: 'none',
                fontSize: '1rem'
              }}
              rows={1}
              disabled={isThinking}
            />
            <button 
              type="submit" 
              className={`btn btn-icon position-absolute rounded-circle ${inputValue.trim() ? 'btn-primary' : 'btn-secondary'}`}
              style={{ left: '8px', bottom: '8px', width: '40px', height: '40px', transition: 'all 0.2s' }}
              disabled={!inputValue.trim() || isThinking}
            >
              <Send size={18} style={{ marginLeft: '-2px' }} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>يمكن أن يرتكب عريف بعض الأخطاء. تحقق من المعلومات المهمة.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
