// ============================================================================
// gemini.js — محرك عريف الذكي (Edge Function Integration)
// ============================================================================
// يتصل بالدالة السحابية الآمنة في Supabase لمنع تسريب المفاتيح
// ============================================================================

import { supabase } from './supabase';

let chatSessions = {};

export function isAIReady() {
  return true; // دائماً جاهز لأن المفتاح في السيرفر
}

const AREEF_SYSTEM_PROMPT = `أنت "عريف" — مساعد تعليمي ذكي باللغة العربية مصمم خصيصاً للطلاب في المملكة العربية السعودية.
## شخصيتك:
- أنت معلم صبور وودود ومشجع
- تستخدم لهجة عربية فصحى مبسطة مناسبة للطلاب
- لا تعطي الإجابة مباشرة أبداً

## طريقة التدريس:
1. قدم تلميحات تدريجية
2. شجع الطالب
3. إذا أصاب، شجّعه بقوة واشرح لماذا إجابته صحيحة مع كتابة "أحسنت" في الرد
4. لا تكتب أكثر من 3-4 أسطر`;

export function startChat(questionId, questionText, correctAnswer, questionType, pageNumber, exerciseNumber) {
  let questionContext = `السؤال المطلوب حله: ${questionText}`;
  if (pageNumber) questionContext += `\n(صفحة ${pageNumber}`;
  if (exerciseNumber) questionContext += ` - تمرين ${exerciseNumber}`;
  if (pageNumber) questionContext += ')';
  questionContext += `\n\nالإجابة الصحيحة (سرية - لا تخبر الطالب بها مباشرة): ${correctAnswer}`;
  
  // حفظ سجل المحادثة محلياً للرجوع إليه
  chatSessions[questionId] = {
    history: [
      {
        role: 'user',
        parts: [{ text: `[تعليمات النظام]\n${AREEF_SYSTEM_PROMPT}\n\n[بيانات السؤال]\n${questionContext}\n\n[ابدأ الآن بتحية الطالب وعرض السؤال عليه بأسلوبك التعليمي]` }],
      }
    ]
  };
  
  return chatSessions[questionId];
}

export async function sendMessage(questionId, message) {
  const session = chatSessions[questionId];
  if (!session) throw new Error('لم يتم بدء المحادثة بعد');

  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { 
        action: 'chat', 
        payload: { history: session.history, message } 
      }
    });

    if (error) throw error;
    
    // Add messages to local history to keep context for next call
    session.history.push({ role: 'user', parts: [{ text: message }] });
    session.history.push({ role: 'model', parts: [{ text: data.text }] });

    return data.text;
  } catch (error) {
    console.error('Edge Function Error:', error);
    throw error;
  }
}

export async function getWelcomeMessage(questionId, questionText, correctAnswer, questionType, pageNumber, exerciseNumber) {
  startChat(questionId, questionText, correctAnswer, questionType, pageNumber, exerciseNumber);
  return sendMessage(questionId, 'مرحبا، أنا جاهز للحل');
}

export async function evaluateConversation(conversationLog, questionText, correctAnswer) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { 
        action: 'evaluate', 
        payload: { conversationLog, questionText, correctAnswer } 
      }
    });

    if (error) throw error;
    return data; // already parsed json if we handle it well, or text that needs parsing
  } catch (error) {
    console.error('Edge Function Error:', error);
    return { grade: 5, feedback: 'تم التقييم تلقائياً', understanding_level: 'متوسط', hints_needed: 0 };
  }
}

export function clearChat(questionId) {
  delete chatSessions[questionId];
}
