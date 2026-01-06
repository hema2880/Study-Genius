
import { Question, QuestionType, QuizSettings, FileData, Difficulty, ChatMessage, CalendarEvent, GradingResult, InputMode, AIProvider } from "../types";
import { HarmCategory, HarmBlockThreshold, Type } from "@google/genai"; // Only importing Types now, not functionality

// Automatic Server URL detection
// 1. If VITE_SERVER_URL is set in .env, use it.
// 2. If running in production (on Vercel), use relative path (proxy to same domain)
// 3. Fallback to localhost:5000 for local dev
const getBaseUrl = () => {
    if ((import.meta as any).env?.VITE_SERVER_URL) {
        return (import.meta as any).env.VITE_SERVER_URL;
    }
    if ((import.meta as any).env?.PROD) {
        return ''; // In production (Vercel), frontend and backend share the domain
    }
    return 'http://localhost:5000';
};

const SERVER_URL = getBaseUrl();
let isServerOnline = true; 

// --- Auth / Activation Utilities ---

export const checkActivationStatus = async (code: string): Promise<boolean> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            credentials: 'include' // Important for setting HTTP-only cookie
        });
        if (res.ok) {
            const data = await res.json();
            return data.valid;
        }
        return false;
    } catch (e) {
        console.error("Activation check failed", e);
        return false; // Fail secure
    }
};

const getActivationCode = (): string => {
    // We try to rely on cookies now, but we pass the code in body as fallback/ID if needed by stateless components
    return localStorage.getItem('activation_code') || '';
};

const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('LocalStorage access denied:', e);
  }
  return null;
};

// --- PROXY GENERATION CALL ---
// This replaces direct GoogleGenAI calls. We send the payload to OUR server.

const generateViaProxy = async (model: string, contents: any, config: any) => {
    const code = getActivationCode();
    
    const response = await fetch(`${SERVER_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send the session cookie
        body: JSON.stringify({
            activationCode: code, // Fallback if cookie missing/cleared but localstorage exists
            model: model,
            contents: contents,
            config: config
        })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text; // The server returns { text: "..." }
};


// --- Caching Utilities ---

const computeHash = async (content: string | FileData[], settings: QuizSettings): Promise<string> => {
  try {
    const dataToHash = {
      content: typeof content === 'string' ? content : content.map(f => ({ name: f.name, size: f.data.length, type: f.mimeType })), 
      settings: {
        type: settings.questionType,
        difficulty: settings.difficulty,
        quantity: settings.quantity,
        maxMode: settings.maxMode,
        language: settings.language,
        thinking: settings.thinkingMode
      }
    };
    
    const msgBuffer = new TextEncoder().encode(JSON.stringify(dataToHash));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.warn("Hashing failed, skipping cache:", e);
    return "";
  }
};

const checkCache = async (hash: string): Promise<Question[] | null> => {
  if (!hash || !isServerOnline) return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1000); 
    
    const res = await fetch(`${SERVER_URL}/api/quiz/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.quiz) {
        return data.quiz as Question[];
      }
    }
  } catch (e) {
    isServerOnline = false;
    console.debug("Backend server unreachable, disabling cache checks.");
  }
  return null;
};

const saveCache = async (hash: string, quiz: Question[], title: string) => {
  if (!hash || !quiz || quiz.length === 0 || !isServerOnline) return;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);

    await fetch(`${SERVER_URL}/api/quiz/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, quiz, title }),
      signal: controller.signal
    });
    clearTimeout(id);
  } catch (e) {
    console.warn("Failed to save to cache", e);
    isServerOnline = false;
  }
};

// --- Admin API ---

export const loginAdmin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include' // Important for secure cookie
        });
        if (res.ok) {
            return { success: true };
        }
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Login Failed" };
    } catch (e: any) {
        console.error("Admin Login Failed", e);
        return { success: false, error: e.message || "Connection Failed" };
    }
};

export const getAdminQuizzes = async () => {
    try {
        const res = await fetch(`${SERVER_URL}/api/admin/quizzes`, { credentials: 'include' });
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch quizzes");
    } catch (e) {
        console.warn("Admin API unreachable:", e);
        return null;
    }
};

export const deleteAdminQuiz = async (id: string) => {
    try {
        await fetch(`${SERVER_URL}/api/admin/quiz/${id}`, { method: 'DELETE', credentials: 'include' });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const getAdminCodes = async () => {
    try {
        const res = await fetch(`${SERVER_URL}/api/admin/codes`, { credentials: 'include' });
        if (res.ok) return await res.json();
        throw new Error("Failed to fetch codes");
    } catch (e) {
        console.warn("Admin API error", e);
        return [];
    }
};

export const generateAdminCodes = async (count: number, planType: string) => {
    try {
        await fetch(`${SERVER_URL}/api/admin/codes/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ count, planType }),
            credentials: 'include'
        });
        return true;
    } catch (e) { return false; }
};

export const deleteAdminCode = async (id: string) => {
    try {
        await fetch(`${SERVER_URL}/api/admin/code/${id}`, { method: 'DELETE', credentials: 'include' });
        return true;
    } catch (e) { return false; }
};

export const getAdminConfig = async () => {
    try {
        const res = await fetch(`${SERVER_URL}/api/admin/config`, { credentials: 'include' });
        if (res.ok) return await res.json();
        return null;
    } catch (e) { return null; }
};

export const updateAdminConfig = async (planLimits: any) => {
    try {
        await fetch(`${SERVER_URL}/api/admin/config`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ planLimits }),
            credentials: 'include'
        });
        return true;
    } catch (e) { return false; }
};

// --- Main Wrappers ---

const getProvider = (): AIProvider => {
    return (safeGetItem('ai_provider') as AIProvider) || 'gemini';
};

const getModel = () => {
  const provider = getProvider();
  if (provider === 'custom') {
      return safeGetItem('custom_model_name') || 'gpt-3.5-turbo';
  }
  const localModel = safeGetItem('gemini_model');
  if (localModel) return localModel;
  return provider === 'gemini' ? 'gemini-2.5-flash' : 'llama-3.3-70b-versatile';
};

const shuffleArray = (array: any[]) => {
  if (!array || !Array.isArray(array)) return [];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// --- Generation Implementation (Now uses Proxy) ---

const generateWithGeminiProxy = async (content: string | FileData[], settings: QuizSettings, unifiedQuizSchema: any, systemInstruction: string, fullPrompt: string) => {
    const selectedModel = getModel();

    const parts: any[] = [];
    if (typeof content !== 'string') {
        // File Mode
        (content as FileData[]).forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
        parts.push({ text: `${fullPrompt}\nSource Material (Files Attached)` });
    } else {
        const isRemedial = content.startsWith("REMEDIAL_INSTRUCTION:");
        const rawContent = isRemedial ? content.replace("REMEDIAL_INSTRUCTION:", "") : content;
        parts.push({ text: `${fullPrompt}\nSource Text:\n"${rawContent}"` });
    }

    const generationConfig: any = {
        responseMimeType: "application/json",
        responseSchema: unifiedQuizSchema,
        temperature: settings.difficulty === Difficulty.MIXED ? 0.4 : 0.2,
        systemInstruction: systemInstruction,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
    };

    if (settings.thinkingMode && selectedModel.includes('gemini-3-pro')) {
        generationConfig.thinkingConfig = { thinkingBudget: 32768 };
    }

    // CALL PROXY INSTEAD OF LOCAL SDK
    return await generateViaProxy(selectedModel, { parts }, generationConfig);
};

export const generateQuizContent = async (
  inputMode: string,
  content: string | FileData[],
  settings: QuizSettings
): Promise<Question[]> => {

  const hash = await computeHash(content, settings);
  if (hash) {
      console.log("Checking cache for hash:", hash);
      const cachedQuiz = await checkCache(hash);
      if (cachedQuiz) {
          console.log("Quiz loaded from cache!");
          return cachedQuiz.map((q, idx) => ({...q, id: `q-${Date.now()}-${idx}`})); 
      }
  }

  // Base prompt configuration (Same as before)
  const isEnglish = settings.language.toLowerCase() === 'english';
  let basePrompt = `Language: ${settings.language}.
  
  ### ANTI-DUPLICATION & DIVERSITY PROTOCOL (CRITICAL):
  1. **NO REPETITION:** You must NOT ask the same question twice.
  2. **NO CONCEPT DUPLICATION:** Do not test the exact same fact or concept in two different questions.
  3. **VARY ANGLES:** If the topic is broad, cover different aspects.

  ### FACTUAL ACCURACY & SCIENTIFIC INTEGRITY:
  1. **SOURCE FIDELITY:** If the provided source text contains scientifically incorrect information, you MUST set the 'correct_answer' to match the source text.
  2. **SCIENTIFIC WARNING:** If you detect a scientific error in the source text, you MUST populate the 'scientific_warning' field.
  3. **RANDOMIZATION:** Randomize the position of the correct answer among the options.
  `;
  
  if (settings.difficulty === Difficulty.MIXED) {
     const dist = settings.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };
     basePrompt += `\nDIFFICULTY STRATEGY: CUSTOM MIXED. - ${dist.easy}% Easy, ${dist.medium}% Medium, ${dist.hard}% Hard.`;
  } else {
     let difficultyLevel: string = settings.difficulty;
     if (!isEnglish) {
        const difficultyMap: Record<string, string> = {
            [Difficulty.EASY]: 'سهل (Easy)',
            [Difficulty.MEDIUM]: 'متوسط (Medium)',
            [Difficulty.HARD]: 'صعب (Hard)',
            [Difficulty.MIXED]: 'متنوع (Mixed)',
        };
        difficultyLevel = difficultyMap[settings.difficulty] || 'متوسط';
     }
     basePrompt += `\nDIFFICULTY LEVEL: ${difficultyLevel}.`;
  }
  
  if (settings.maxMode) {
      basePrompt += `\n*** EXHAUSTIVE MAX MODE ACTIVATED *** Analyze sentence by sentence.`;
  }

  const unifiedQuizSchema = {
    type: Type.OBJECT,
    properties: {
      quiz: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: Object.values(QuestionType) },
            difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correct_answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            scientific_warning: { type: Type.STRING }
          },
          required: ["type", "difficulty", "question", "correct_answer", "explanation"]
        }
      }
    },
    required: ["quiz"]
  };

  const languageRule = `CRITICAL RULE: ALL generated content MUST be strictly in ${settings.language}.`;
  let systemInstruction = `You are an Exam Generator. ${languageRule}`;
  let promptContent = `Generate ${settings.quantity} questions.`;

  // Set prompt based on type (Simplified for brevity, logic remains same)
  if (settings.questionType === QuestionType.MULTIPLE_CHOICE) {
     systemInstruction += " Generate MCQs. Strict JSON output.";
  }
  
  const fullPrompt = `${basePrompt}\n${promptContent}`;

  let jsonText: string | undefined;

  try {
      // Use Proxy
      jsonText = await generateWithGeminiProxy(content, settings, unifiedQuizSchema, systemInstruction, fullPrompt);

      if (!jsonText) throw new Error("Empty response from AI.");

      let parsedData;
      try {
          let cleanedText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstOpen = cleanedText.indexOf('{');
          const lastClose = cleanedText.lastIndexOf('}');
          if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
              cleanedText = cleanedText.substring(firstOpen, lastClose + 1);
          }
          parsedData = JSON.parse(cleanedText);
      } catch (e) {
          throw new Error("فشل في تحليل رد الذكاء الاصطناعي.");
      }

      if (!parsedData.quiz || !Array.isArray(parsedData.quiz)) throw new Error("Invalid format received from AI.");

      const generatedQuiz = parsedData.quiz.map((q: any, index: number) => {
          let options = q.options ? q.options.map((o: any) => String(o).trim()) : [];
          let correctAnswer = String(q.correct_answer || "").trim();

          // Fix 1: True/False Localization logic (Same as before)
          if (q.type === QuestionType.TRUE_FALSE || q.type === 'true_false') {
             if (!options || options.length < 2) {
                const isAr = settings.language === 'ar' || settings.language.toLowerCase().includes('arabic');
                options = isAr ? ["صح", "خطأ"] : ["True", "False"];
                const lowerAns = correctAnswer.toLowerCase();
                if (lowerAns.includes('true') || lowerAns === 't' || lowerAns.includes('صح')) correctAnswer = isAr ? "صح" : "True";
                else correctAnswer = isAr ? "خطأ" : "False";
             }
          }

          // Fix 2: Answer Matching (Same as before)
          if (options.length > 0 && !options.includes(correctAnswer)) {
              const match = options.find((opt: string) => opt.includes(correctAnswer) || correctAnswer.includes(opt));
              if (match) correctAnswer = match;
              else correctAnswer = options[0]; // Fallback
          }
          
          return {
              id: `q-${Date.now()}-${index}`,
              type: q.type === 'multiple_choice' ? QuestionType.MULTIPLE_CHOICE : settings.questionType,
              question: q.question,
              options: options.length > 0 ? shuffleArray([...options]) : undefined,
              correctAnswer: correctAnswer,
              explanation: q.explanation || '',
              bloomLevel: q.difficulty || null, 
              scientificWarning: q.scientific_warning || null,
          };
      });

      if (hash && generatedQuiz.length > 0) {
          let title = "Generated Quiz";
          if (typeof content === 'string') title = content.substring(0, 30);
          else if (Array.isArray(content) && content.length > 0) title = content[0].name;
          saveCache(hash, generatedQuiz, title);
      }

      return generatedQuiz;

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    if (error.message.includes("429")) throw new Error("Server overloaded (429). Please try again in a minute.");
    throw new Error(error.message || "Failed to generate content");
  }
};


export const gradeOpenEndedAnswer = async (userAnswer: string, correctAnswer: string): Promise<GradingResult> => {
  const prompt = `Grade this answer. Correct: "${correctAnswer}". Student: "${userAnswer}". JSON: { "verdict": "Correct"|"Incorrect", "similarity_score": number, "feedback": "string" }`;
  const result = await generateViaProxy('gemini-2.5-flash', prompt, { responseMimeType: "application/json" });
  return JSON.parse(result || "{}");
};

export const generateStudyGuide = async (
  mode: InputMode,
  content: string | FileData[],
  language: string,
  thinking: boolean
): Promise<{ title: string, content: string, topics: string[] }> => {
  
  const model = thinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  const parts: any[] = [];
  if (mode === InputMode.FILE) {
     (content as FileData[]).forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
     parts.push({ text: `Generate a comprehensive study guide.` });
  } else {
     parts.push({ text: `Generate a comprehensive study guide based on: "${content}"` });
  }

  const prompt = `Language: ${language}. Create a Study Guide (Title, Executive Summary, Key Concepts, Explanations, Examples, Topics List). Output JSON: { title, content (markdown), topics[] }`;
  parts[parts.length - 1].text += "\n" + prompt;

  const config: any = { responseMimeType: "application/json" };
  if (thinking && model.includes('gemini-3')) config.thinkingConfig = { thinkingBudget: 32768 };

  const responseText = await generateViaProxy(model, { parts }, config);
  return JSON.parse(responseText || "{}");
};

export const sendChatMessage = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  // Convert chat history to 'contents' format for generateContent (stateless/REST approach via proxy)
  // Or handle stateful chat on server. For simplicity here, we treat it as generation with context.
  
  const parts = history.map(msg => `[${msg.role}]: ${msg.text}`).join('\n');
  const fullPrompt = `${parts}\n[user]: ${newMessage}\n[model]:`;
  
  return await generateViaProxy('gemini-2.5-flash', fullPrompt, { systemInstruction: "You are a helpful study assistant." });
};

export const generateSpacedRepetitionSchedule = async (studyDate: string, topic: string): Promise<CalendarEvent[]> => {
    const prompt = `Topic: ${topic}, Date: ${studyDate}. Generate Spaced Repetition Schedule (1,3,7,14,30 days). JSON: { "schedule": [{ "title", "start" (YYYY-MM-DD), "description", "color" }] }`;
    const responseText = await generateViaProxy('gemini-2.5-flash', prompt, { responseMimeType: "application/json" });
    const data = JSON.parse(responseText || "{}");
    return (data.schedule || []).map((ev: any) => ({...ev, allDay: true}));
};
