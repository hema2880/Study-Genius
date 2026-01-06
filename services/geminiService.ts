import { 
    Question, 
    QuestionType, 
    QuizSettings, 
    FileData, 
    Difficulty, 
    ChatMessage, 
    CalendarEvent, 
    GradingResult, 
    InputMode, 
    AIProvider 
} from "../types";
import { HarmCategory, HarmBlockThreshold, Type } from "@google/genai";

// --- 1. Configuration & Server URL ---

const getBaseUrl = (): string => {
    // @ts-ignore: Vite specific env handling
    if (import.meta.env?.VITE_SERVER_URL) {
        // @ts-ignore
        return import.meta.env.VITE_SERVER_URL;
    }
    // @ts-ignore
    if (import.meta.env?.PROD) {
        return ''; // Relative path for Vercel (Frontend & Backend on same domain)
    }
    return 'http://localhost:5000';
};

const SERVER_URL = getBaseUrl();
let isServerOnline = true;

// --- 2. Generic API Client (To reduce code duplication) ---

async function apiRequest<T>(endpoint: string, method: string = 'GET', body: any = null, signal?: AbortSignal): Promise<T> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    const config: RequestInit = {
        method,
        headers,
        credentials: 'include', // Essential for Cookies/Sessions
        signal
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        return await response.json() as T;
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error(`API Call Failed [${endpoint}]:`, error);
        throw error;
    }
}

// --- 3. Local Storage Helpers ---

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

const getActivationCode = (): string => safeGetItem('activation_code') || '';

// --- 4. Auth & Activation Services ---

export const checkActivationStatus = async (code: string): Promise<boolean> => {
    try {
        const data = await apiRequest<{ valid: boolean }>('/api/activate', 'POST', { code });
        return data.valid;
    } catch (e) {
        return false;
    }
};

// --- 5. AI Proxy Service (The Core) ---

const generateViaProxy = async (model: string, contents: any, config: any) => {
    const code = getActivationCode();
    
    // Sends the request to your backend, which holds the API Key
    const data = await apiRequest<{ text: string }>('/api/generate', 'POST', {
        activationCode: code,
        model: model,
        contents: contents, // Sending 'parts' or text
        config: config
    });

    return data.text;
};

// --- 6. Caching Utilities ---

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
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.warn("Hashing failed:", e);
        return "";
    }
};

const checkCache = async (hash: string): Promise<Question[] | null> => {
    if (!hash || !isServerOnline) return null;
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
        
        const data = await apiRequest<{ found: boolean, quiz?: Question[] }>('/api/quiz/check', 'POST', { hash }, controller.signal);
        clearTimeout(id);
        
        if (data.found && data.quiz) return data.quiz;
    } catch (e) {
        // Don't disable server online status just for cache miss/timeout
        console.debug("Cache check skipped or failed.");
    }
    return null;
};

const saveCache = async (hash: string, quiz: Question[], title: string) => {
    if (!hash || !quiz.length || !isServerOnline) return;
    try {
        // Fire and forget (don't await strictly)
        apiRequest('/api/quiz/save', 'POST', { hash, quiz, title }).catch(e => console.warn("Cache save failed silently"));
    } catch (e) {
        // Ignore
    }
};

// --- 7. Admin API Services ---

export const loginAdmin = async (password: string): Promise<boolean> => {
    try {
        await apiRequest('/api/admin/login', 'POST', { password });
        return true;
    } catch (e) {
        return false;
    }
};

export const getAdminQuizzes = async () => {
    try { return await apiRequest('/api/admin/quizzes'); } catch { return null; }
};

export const deleteAdminQuiz = async (id: string) => {
    try { await apiRequest(`/api/admin/quiz/${id}`, 'DELETE'); return true; } catch { return false; }
};

export const getAdminCodes = async () => {
    try { return await apiRequest('/api/admin/codes'); } catch { return []; }
};

export const generateAdminCodes = async (count: number, planType: string) => {
    try { await apiRequest('/api/admin/codes/generate', 'POST', { count, planType }); return true; } catch { return false; }
};

export const deleteAdminCode = async (id: string) => {
    try { await apiRequest(`/api/admin/code/${id}`, 'DELETE'); return true; } catch { return false; }
};

export const getAdminConfig = async () => {
    try { return await apiRequest('/api/admin/config'); } catch { return null; }
};

export const updateAdminConfig = async (planLimits: any) => {
    try { await apiRequest('/api/admin/config', 'POST', { planLimits }); return true; } catch { return false; }
};

// --- 8. Main Logic & Helpers ---

const getProvider = (): AIProvider => (safeGetItem('ai_provider') as AIProvider) || 'gemini';

const getModel = () => {
    const provider = getProvider();
    if (provider === 'custom') return safeGetItem('custom_model_name') || 'gpt-3.5-turbo';
    return safeGetItem('gemini_model') || (provider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile');
};

const shuffleArray = (array: any[]) => {
    if (!array || !Array.isArray(array)) return [];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- 9. Generation Implementation ---

const generateWithGeminiProxy = async (
    content: string | FileData[], 
    settings: QuizSettings, 
    unifiedQuizSchema: any, 
    systemInstruction: string, 
    fullPrompt: string
) => {
    const selectedModel = getModel();
    const parts: any[] = [];

    // Construct Payload
    if (typeof content !== 'string') {
        // File Mode
        (content as FileData[]).forEach(file => 
            parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } })
        );
        parts.push({ text: `${fullPrompt}\nSource Material (Files Attached)` });
    } else {
        // Text Mode
        const isRemedial = content.startsWith("REMEDIAL_INSTRUCTION:");
        const rawContent = isRemedial ? content.replace("REMEDIAL_INSTRUCTION:", "") : content;
        parts.push({ text: `${fullPrompt}\nSource Text:\n"${rawContent}"` });
    }

    // Config
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

    if (settings.thinkingMode && selectedModel.includes('gemini-2')) {
       // Note: Standard thinking config for Gemini 2/3 if supported by API
    }

    // ** CALL PROXY **
    return await generateViaProxy(selectedModel, { parts }, generationConfig);
};

export const generateQuizContent = async (
    inputMode: string,
    content: string | FileData[],
    settings: QuizSettings
): Promise<Question[]> => {

    // 1. Check Cache
    const hash = await computeHash(content, settings);
    if (hash) {
        const cachedQuiz = await checkCache(hash);
        if (cachedQuiz) {
            console.log("Quiz loaded from cache!");
            return cachedQuiz.map((q, idx) => ({...q, id: `q-${Date.now()}-${idx}`})); 
        }
    }

    // 2. Build Prompt
    const isEnglish = settings.language.toLowerCase() === 'english';
    let basePrompt = `Language: ${settings.language}.
    ### ANTI-DUPLICATION & DIVERSITY PROTOCOL (CRITICAL):
    1. **NO REPETITION:** You must NOT ask the same question twice.
    2. **NO CONCEPT DUPLICATION:** Do not test the exact same fact or concept.
    3. **VARY ANGLES:** Cover different aspects of the topic.

    ### FACTUAL ACCURACY & SCIENTIFIC INTEGRITY:
    1. **SOURCE FIDELITY:** If the provided source has scientific errors, you MUST set 'correct_answer' to match the source BUT populate 'scientific_warning'.
    2. **RANDOMIZATION:** Randomize the position of the correct answer.
    `;
    
    // Difficulty logic
    if (settings.difficulty === Difficulty.MIXED) {
        const dist = settings.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };
        basePrompt += `\nDIFFICULTY: MIXED (${dist.easy}% Easy, ${dist.medium}% Medium, ${dist.hard}% Hard).`;
    } else {
        const diffMap: Record<string, string> = { [Difficulty.EASY]: 'Easy', [Difficulty.MEDIUM]: 'Medium', [Difficulty.HARD]: 'Hard' };
        basePrompt += `\nDIFFICULTY LEVEL: ${diffMap[settings.difficulty] || 'Medium'}.`;
    }
    
    if (settings.maxMode) basePrompt += `\n*** EXHAUSTIVE MAX MODE *** Analyze sentence by sentence.`;

    // 3. Define Schema
    const unifiedQuizSchema = {
        type: Type.OBJECT,
        properties: {
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        difficulty: { type: Type.STRING },
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

    const systemInstruction = `You are an Exam Generator. CRITICAL: Output strict JSON. Language: ${settings.language}`;
    const fullPrompt = `${basePrompt}\nGenerate ${settings.quantity} ${settings.questionType} questions.`;

    try {
        // 4. Generate via Backend Proxy
        const jsonText = await generateWithGeminiProxy(content, settings, unifiedQuizSchema, systemInstruction, fullPrompt);

        if (!jsonText) throw new Error("Empty response from AI.");

        // 5. Parse & Clean JSON
        let cleanedText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstOpen = cleanedText.indexOf('{');
        const lastClose = cleanedText.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleanedText = cleanedText.substring(firstOpen, lastClose + 1);
        }
        
        const parsedData = JSON.parse(cleanedText);
        if (!parsedData.quiz || !Array.isArray(parsedData.quiz)) throw new Error("Invalid format received from AI.");

        // 6. Post-process (Localization & Options)
        const generatedQuiz = parsedData.quiz.map((q: any, index: number) => {
            let options = q.options ? q.options.map((o: any) => String(o).trim()) : [];
            let correctAnswer = String(q.correct_answer || "").trim();

            // True/False Localization Logic
            if (q.type === QuestionType.TRUE_FALSE || String(q.type).includes('true_false')) {
                if (!options || options.length < 2) {
                    const isAr = settings.language === 'ar' || settings.language.includes('Arabic');
                    options = isAr ? ["صح", "خطأ"] : ["True", "False"];
                    const lowerAns = correctAnswer.toLowerCase();
                    const isTrue = lowerAns.includes('true') || lowerAns === 't' || lowerAns.includes('صح');
                    correctAnswer = isAr ? (isTrue ? "صح" : "خطأ") : (isTrue ? "True" : "False");
                }
            }

            // Ensure correct answer matches options exactly
            if (options.length > 0 && !options.includes(correctAnswer)) {
                const match = options.find((opt: string) => opt.includes(correctAnswer) || correctAnswer.includes(opt));
                correctAnswer = match || options[0];
            }
            
            return {
                id: `q-${Date.now()}-${index}`,
                type: q.type === 'multiple_choice' ? QuestionType.MULTIPLE_CHOICE : settings.questionType,
                question: q.question,
                options: options.length > 0 ? shuffleArray([...options]) : undefined,
                correctAnswer: correctAnswer,
                explanation: q.explanation || '',
                bloomLevel: q.difficulty || 'Medium', 
                scientificWarning: q.scientific_warning || null,
            };
        });

        // 7. Save to Cache
        if (hash && generatedQuiz.length > 0) {
            let title = typeof content === 'string' ? content.substring(0, 30) : (content[0]?.name || "Files Quiz");
            saveCache(hash, generatedQuiz, title);
        }

        return generatedQuiz;

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        if (error.message.includes("429")) throw new Error("Server overloaded. Please try again later.");
        throw error;
    }
};

// --- 10. Extra Features (Study Guide, Chat, Grading) ---

export const gradeOpenEndedAnswer = async (userAnswer: string, correctAnswer: string): Promise<GradingResult> => {
    const prompt = `Grade this answer. Correct: "${correctAnswer}". Student: "${userAnswer}". JSON format: { "verdict": "Correct"|"Incorrect", "similarity_score": number, "feedback": "string" }`;
    const text = await generateViaProxy('gemini-1.5-flash', { parts: [{ text: prompt }] }, { responseMimeType: "application/json" });
    return JSON.parse(text || "{}");
};

export const generateStudyGuide = async (mode: InputMode, content: string | FileData[], language: string, thinking: boolean) => {
    const model = thinking ? 'gemini-2.0-flash-thinking-exp' : 'gemini-1.5-flash'; // Updated models
    const parts: any[] = [];
    
    if (mode === InputMode.FILE) {
        (content as FileData[]).forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
        parts.push({ text: `Generate a comprehensive study guide.` });
    } else {
        parts.push({ text: `Generate a comprehensive study guide based on: "${content}"` });
    }

    parts[parts.length - 1].text += `\nLanguage: ${language}. Create a Study Guide (Title, Executive Summary, Key Concepts, Topics List). Output JSON.`;
    
    const text = await generateViaProxy(model, { parts }, { responseMimeType: "application/json" });
    return JSON.parse(text || "{}");
};

export const sendChatMessage = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    // Basic stateless chat via proxy
    const parts = history.map(msg => `[${msg.role}]: ${msg.text}`).join('\n');
    const fullPrompt = `${parts}\n[user]: ${newMessage}\n[model]:`;
    return await generateViaProxy('gemini-1.5-flash', { parts: [{ text: fullPrompt }] }, {});
};

export const generateSpacedRepetitionSchedule = async (studyDate: string, topic: string): Promise<CalendarEvent[]> => {
    const prompt = `Topic: ${topic}, Date: ${studyDate}. Generate Spaced Repetition Schedule (1,3,7,14,30 days). JSON: { "schedule": [{ "title", "start" (YYYY-MM-DD), "description", "color" }] }`;
    const text = await generateViaProxy('gemini-1.5-flash', { parts: [{ text: prompt }] }, { responseMimeType: "application/json" });
    const data = JSON.parse(text || "{}");
    return (data.schedule || []).map((ev: any) => ({...ev, allDay: true}));
};
