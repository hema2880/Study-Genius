
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { GoogleGenAI } = require("@google/genai");

const app = express();

// --- CONFIGURATION ---
// In Vercel, we want to allow the frontend (same domain) to access the API
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:3000',
    process.env.CLIENT_URL // For production URL
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In production Vercel monorepo, origin might be same domain, 
        // but explicit check is good for security if separated.
        // For Vercel "Same Deployment", CORS is less of an issue, 
        // but we keep it for good measure.
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// MongoDB Connection (Cached for Serverless)
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            console.warn("MONGO_URI missing, skipping DB connection (Admin Login will still work)");
            return;
        }
        
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};
// Trigger connection
connectDB();

// --- SCHEMAS ---

const QuizCacheSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Untitled Quiz' },
  quiz: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Global App Configuration (Dynamic Limits)
const AppConfigSchema = new mongoose.Schema({
  planLimits: {
    Free: { type: Number, default: 3 },
    Pro: { type: Number, default: 20 },
    Gold: { type: Number, default: 100 },
    Unlimited: { type: Number, default: 99999 }
  },
  updatedAt: { type: Date, default: Date.now }
});

const ActivationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  planType: { type: String, enum: ['Free', 'Pro', 'Gold', 'Unlimited'], default: 'Free' },
  isUsed: { type: Boolean, default: false },
  usedByDeviceId: { type: String, default: null }, // Optional: fingerprint
  dailyUsage: { type: Number, default: 0 },
  lastUsageDate: { type: Date, default: Date.now },
  generatedBy: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const QuizCache = mongoose.models.QuizCache || mongoose.model('QuizCache', QuizCacheSchema);
const ActivationCode = mongoose.models.ActivationCode || mongoose.model('ActivationCode', ActivationCodeSchema);
const AppConfig = mongoose.models.AppConfig || mongoose.model('AppConfig', AppConfigSchema);

// --- API KEY ROTATION ---

const getGeminiKeys = () => {
    const keys = [];
    if (process.env.GEMINI_KEY_1) keys.push(process.env.GEMINI_KEY_1);
    if (process.env.GEMINI_KEY_2) keys.push(process.env.GEMINI_KEY_2);
    if (process.env.GEMINI_KEY_3) keys.push(process.env.GEMINI_KEY_3);
    if (process.env.API_KEY) keys.push(process.env.API_KEY);
    return [...new Set(keys)];
};

const apiKeys = getGeminiKeys();

const getRandomKey = () => {
    // Fallback if no specific keys set
    if (apiKeys.length === 0 && process.env.API_KEY) return process.env.API_KEY;
    if (apiKeys.length === 0) throw new Error("No Gemini API Keys configured.");
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
};

const executeWithRetry = async (operation, attempt = 1) => {
    const maxRetries = 2; // Reduced for serverless timeout safety
    try {
        return await operation();
    } catch (error) {
        const isRateLimit = error.message?.includes('429') || error.status === 429;
        if (isRateLimit && attempt <= maxRetries) {
            return executeWithRetry(operation, attempt + 1);
        }
        throw error;
    }
};

// --- MIDDLEWARE ---

const checkPlanLimits = async (req, res, next) => {
    await connectDB();
    const code = req.cookies.session_code || req.body.activationCode;
    
    if (!code) return res.status(401).json({ error: "Session expired." });

    try {
        const user = await ActivationCode.findOne({ code });
        if (!user) return res.status(403).json({ error: "Invalid Session" });

        const today = new Date().setHours(0,0,0,0);
        const lastUsed = new Date(user.lastUsageDate).setHours(0,0,0,0);
        
        if (today > lastUsed) {
            user.dailyUsage = 0;
            user.lastUsageDate = new Date();
            await user.save();
        }

        let config = await AppConfig.findOne();
        if (!config) config = await AppConfig.create({}); 
        
        const limits = config.planLimits || { Free: 3, Pro: 20, Gold: 100, Unlimited: 99999 };
        const limit = limits[user.planType] || 3;

        if (user.dailyUsage >= limit) {
            return res.status(403).json({ error: "Daily Limit Reached." });
        }

        req.user = user;
        next();

    } catch (err) {
        res.status(500).json({ error: "Auth Check Failed" });
    }
};

const requireAdmin = async (req, res, next) => {
    // Note: Admin routes don't necessarily need Mongo if they just check the cookie, 
    // but operations inside might.
    const adminToken = req.cookies.admin_session;
    if (adminToken === 'authenticated') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// --- ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: "Online", db: isConnected ? "Connected" : "Disconnected" });
});

app.post('/api/activate', async (req, res) => {
    await connectDB();
    try {
        const { code, deviceId } = req.body;
        if (!code) return res.status(400).json({ error: 'Code required' });

        const user = await ActivationCode.findOne({ code });
        if (!user) return res.status(401).json({ valid: false, message: 'Invalid Code' });
        
        if (user.isUsed && user.usedByDeviceId && user.usedByDeviceId !== deviceId) {
             return res.status(403).json({ valid: false, message: 'Code in use elsewhere.' });
        }

        user.isUsed = true;
        user.usedByDeviceId = deviceId || 'unknown';
        user.lastUsageDate = new Date();
        await user.save();

        res.cookie('session_code', code, {
            httpOnly: true,
            secure: true, // Always true for Vercel
            sameSite: 'lax', // Use Lax for better navigation handling
            maxAge: 365 * 24 * 60 * 60 * 1000 
        });

        res.json({ valid: true, plan: user.planType });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/generate', checkPlanLimits, async (req, res) => {
    await connectDB();
    try {
        const { model, contents, config } = req.body;
        
        const result = await executeWithRetry(async () => {
            const currentKey = getRandomKey();
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            const targetModel = model || 'gemini-2.5-flash';
            const response = await ai.models.generateContent({
                model: targetModel,
                contents: contents,
                config: config
            });
            return response.text;
        });

        req.user.dailyUsage += 1;
        req.user.lastUsageDate = new Date();
        await req.user.save();
        
        const appConfig = await AppConfig.findOne();
        const limits = appConfig ? appConfig.planLimits : { Free: 3, Pro: 20, Gold: 100, Unlimited: 99999 };
        const currentLimit = limits[req.user.planType];

        res.json({ text: result, remaining: Math.max(0, currentLimit - req.user.dailyUsage) }); 

    } catch (err) {
        console.error("Generation Error:", err);
        res.status(500).json({ error: err.message || "Server Error" });
    }
});

app.post('/api/quiz/check', async (req, res) => {
  await connectDB();
  try {
    const { hash } = req.body;
    const cachedEntry = await QuizCache.findOne({ hash });
    if (cachedEntry) return res.json({ found: true, quiz: cachedEntry.quiz });
    return res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quiz/save', async (req, res) => {
  await connectDB();
  try {
    const { hash, quiz, title } = req.body;
    await QuizCache.findOneAndUpdate(
      { hash },
      { hash, quiz, title: title || 'Untitled Quiz', createdAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    // DEFAULT PASSWORD FALLBACK IF ENV VAR IS MISSING
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    if (password === adminPassword) {
        res.cookie('admin_session', 'authenticated', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax', // Relaxed for top-level navigation, works better on Vercel rewrites
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.json({ success: true });
    } else {
        return res.status(401).json({ error: "Invalid Password" });
    }
});

app.use('/api/admin/*', requireAdmin);

app.get('/api/admin/quizzes', async (req, res) => {
  await connectDB();
  try {
    const quizzes = await QuizCache.find({}, 'hash title createdAt quiz').sort({ createdAt: -1 }).limit(50);
    const result = quizzes.map(q => ({
      _id: q._id, title: q.title, date: q.createdAt, questionCount: Array.isArray(q.quiz) ? q.quiz.length : 0
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/quiz/:id', async (req, res) => {
  await connectDB();
  try {
    await QuizCache.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/codes', async (req, res) => {
    await connectDB();
    try {
        const codes = await ActivationCode.find().sort({ createdAt: -1 });
        res.json(codes);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/codes/generate', async (req, res) => {
    await connectDB();
    try {
        const { count, planType } = req.body;
        const limit = count || 1;
        const plan = planType || 'Free';
        const newCodes = [];
        for(let i=0; i<limit; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            newCodes.push({ code, planType: plan });
        }
        await ActivationCode.insertMany(newCodes);
        res.json({ success: true, count: limit });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/code/:id', async (req, res) => {
    await connectDB();
    try {
        await ActivationCode.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/config', async (req, res) => {
    await connectDB();
    try {
        let config = await AppConfig.findOne();
        if (!config) config = await AppConfig.create({});
        res.json(config);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/config', async (req, res) => {
    await connectDB();
    try {
        const { planLimits } = req.body;
        let config = await AppConfig.findOne();
        if (!config) config = new AppConfig();
        if (planLimits) config.planLimits = { ...config.planLimits, ...planLimits };
        config.updatedAt = new Date();
        await config.save();
        res.json({ success: true, config });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export the app for Vercel
module.exports = app;

// Only listen if running directly (Local Development)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}
