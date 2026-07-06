import React, { useState } from 'react'

export default function StudentChat() {
  const [messages, setMessages] = useState([
    { sender: 'areef', text: 'أهلاً بك يا بطل! أنا المساعد "عريف". لاحظت أنك تواجه صعوبة في السؤال الثالث عن مساحة المستطيل. هل تتذكر ما هو قانون مساحة المستطيل؟' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { sender: 'student', text: input }])
    
    // Simulate Areef's response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        sender: 'areef', 
        text: 'محاولة ممتازة! مساحة المستطيل هي الطول ضرب العرض. إذا كان الطول 8 سم والعرض 5 سم، فكم تكون المساحة؟ حاول حسابها الآن.' 
      }])
    }, 1500)
    
    setInput('')
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
        {/* Chat Header */}
        <div style={{ backgroundColor: 'var(--primary-blue)', padding: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-green)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>عريف</h3>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>مساعدك الذكي (يوجهك للحل ولا يعطيك الإجابة)</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              alignSelf: msg.sender === 'areef' ? 'flex-start' : 'flex-end',
              backgroundColor: msg.sender === 'areef' ? 'white' : 'var(--primary-green)',
              color: msg.sender === 'areef' ? 'var(--text-primary)' : 'white',
              padding: '1rem',
              borderRadius: msg.sender === 'areef' ? '0 15px 15px 15px' : '15px 0 15px 15px',
              maxWidth: '80%',
              boxShadow: 'var(--shadow-sm)',
              border: msg.sender === 'areef' ? '1px solid var(--border-color)' : 'none'
            }}>
              <p style={{ margin: 0 }}>{msg.text}</p>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'white', display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="input-field" 
            style={{ flex: 1, margin: 0 }} 
            placeholder="اكتب إجابتك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="btn btn-primary" onClick={handleSend} style={{ borderRadius: '50%', width: '46px', height: '46px', padding: 0 }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
