import { supabase } from './supabase';

let chatSessions = {};

export function isAIReady() {
  return true; // The AI is now ready via Edge Functions!
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
  
  // We keep track of history locally
  chatSessions[questionId] = [
    {
      role: "user",
      parts: [{ text: `[تعليمات النظام]\n${AREEF_SYSTEM_PROMPT}\n\n[بيانات السؤال]\n${questionContext}\n\nلقد قمت أنا (النظام) بعرض السؤال على الطالب نيابة عنك، والطالب الآن سيكتب إجابته. قيم إجابته مباشرة ووجهه.` }]
    },
    {
      role: "model",
      parts: [{ text: `مرحباً بك! أنا عريف مساعدك الذكي 🤖. هيا لنحل معاً سؤال:\n\n**${questionText}**\n\nما هي إجابتك أو كيف تفكر في الحل؟` }]
    }
  ];
  
  return chatSessions[questionId];
}

export async function sendMessage(questionId, message) {
  const history = chatSessions[questionId];
  if (!history) throw new Error('لم يتم بدء المحادثة بعد');

  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { action: 'chat', payload: { history, message } }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);

    // Update history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: data.text }] });

    return data.text;
  } catch (error) {
    console.error('Edge Function Error:', error);
    throw error;
  }
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
    if (data && data.error) throw new Error(data.error);

    // Ensure data is parsed correctly if it came back as a JSON string
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Evaluate Edge Function Error:', error);
    return { grade: 5, feedback: 'تم التقييم تلقائياً نظراً لخطأ في الاتصال', understanding_level: 'متوسط', hints_needed: 0 };
  }
}

export async function extractQuestionsFromImage(imageBase64, mimeType) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { 
        action: 'extract', 
        payload: { imageBase64, mimeType } 
      }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);

    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Extract Edge Function Error:', error);
    throw error;
  }
}

export function clearChat(questionId) {
  delete chatSessions[questionId];
}
