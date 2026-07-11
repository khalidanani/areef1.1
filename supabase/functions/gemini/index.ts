import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { action, payload } = await req.json();

    if (action === 'chat') {
      const { history, message } = payload;
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const chat = model.startChat({
        history: history || [],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 500,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      
      return new Response(JSON.stringify({ text: response.text() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } 
    
    else if (action === 'evaluate') {
      const { conversationLog, questionText, correctAnswer } = payload;
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const prompt = `أنت مقيّم تعليمي. بناءً على المحادثة التالية بين الطالب والمساعد الذكي "عريف"، قيّم أداء الطالب.
السؤال: ${questionText}
الإجابة الصحيحة: ${correctAnswer}

المحادثة:
${conversationLog.map((m: any) => `${m.sender === 'user' ? 'الطالب' : 'عريف'}: ${m.text}`).join('\n')}

أعطني التقييم بصيغة JSON فقط:
{
  "grade": (رقم من 0 إلى 10),
  "feedback": "(ملاحظة مختصرة باللغة العربية عن أداء الطالب في جملة واحدة)",
  "understanding_level": "(ممتاز أو جيد أو متوسط أو ضعيف)",
  "hints_needed": (عدد التلميحات التي احتاجها الطالب)
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
      return new Response(text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    else if (action === 'extract') {
      const { imageBase64, mimeType } = payload;
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg"
        },
      };

      const prompt = `أنت مساعد تعليمي خبير في المناهج السعودية. مهمتك هي قراءة صورة هذه الصفحة من كتاب مدرسي (تمارين أو أسئلة).
قم باستخراج جميع الأسئلة والتمارين الموجودة في الصفحة بدقة عالية.
أعد الناتج بصيغة JSON Array فقط، بدون أي نصوص إضافية، بحيث يحتوي كل عنصر على:
[
  {
    "question_text": "نص السؤال كاملاً",
    "question_type": "خيارات أو مقالي أو صح وخطأ",
    "correct_answer": "الإجابة النموذجية أو 'تحتاج مراجعة'",
    "options": ["خيار 1", "خيار 2"] (إن وجد، وإلا null),
    "difficulty_level": "سهل أو متوسط أو صعب",
    "page_number": "رقم الصفحة إن كان ظاهراً، وإلا null",
    "exercise_number": "رقم التمرين إن وجد، وإلا null"
  }
]`;

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
      return new Response(text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error(`Unsupported action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
