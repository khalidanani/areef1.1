import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // We reuse the existing GEMINI_API_KEY env var but it now holds the OpenRouter Key
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('API Key is not set in environment variables');
    }

    const { action, payload } = await req.json();

    const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const defaultHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://areef-ai.com',
      'X-Title': 'Areef'
    };

    if (action === 'chat') {
      const { history, message } = payload;
      
      // Convert Gemini history format to OpenAI format
      const messages = (history || []).map((h: any) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts ? h.parts[0].text : h.text
      }));
      
      // Append the latest user message
      messages.push({ role: 'user', content: message });

      const requestBody = {
        model: "google/gemma-4-31b-it:free",
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      };

      const response = await fetch(openRouterEndpoint, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${await response.text()}`);
      }

      // Stream the response back to the client in SSE format
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) return controller.close();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunkText = parsed.choices[0]?.delta?.content || '';
                    if (chunkText) {
                      const sseData = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
                      controller.enqueue(new TextEncoder().encode(sseData));
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE chunk:', dataStr);
                  }
                }
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        }
      });

      return new Response(stream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        status: 200,
      })
    } 
    
    else if (action === 'evaluate') {
      const { conversationLog, questionText, correctAnswer } = payload;
      
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

      const requestBody = {
        model: "google/gemma-4-31b-it:free",
        messages: [{ role: 'user', content: prompt }]
      };

      const response = await fetch(openRouterEndpoint, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return new Response(text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    else if (action === 'extract') {
      const { imageBase64, mimeType } = payload;
      
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

      const requestBody = {
        model: "google/gemma-4-31b-it:free", // Must be a vision-capable model
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } }
            ]
          }
        ]
      };

      const response = await fetch(openRouterEndpoint, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return new Response(text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error(`Unsupported action: ${action}`);

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
