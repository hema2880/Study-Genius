
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { GoogleGenAI } = require("@google/genai");

const app = express();

// Security: Allow specific origin with credentials (Cookies)
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', 
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

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

const QuizCache = mongoose.model('QuizCache', QuizCacheSchema);
const ActivationCode = mongoose.model('ActivationCode', ActivationCodeSchema);
const AppConfig = mongoose.model('AppConfig', AppConfigSchema);

// --- API KEY ROTATION ---

const getGeminiKeys = () => {
    const keys = [];
    // Prioritize specific rotation keys
    if (process.env.GEMINI_KEY_1) keys.push(process.env.GEMINI_KEY_1);
    if (process.env.GEMINI_KEY_2) keys.push(process.env.GEMINI_KEY_2);
    if (process.env.GEMINI_KEY_3) keys.push(process.env.GEMINI_KEY_3);
    
    // Fallback to generic API_KEYs
    if (process.env.API_KEY) keys.push(process.env.API_KEY);
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('API_KEY_') && process.env[key]) {
            keys.push(process.env[key]);
        }
    });
    return [...new Set(keys)]; // Unique keys only
};

const apiKeys = getGeminiKeys();
console.log(`Loaded ${apiKeys.length} API Keys for rotation.`);

const getRandomKey = () => {
    if (apiKeys.length === 0) throw new Error("No Gemini API Keys configured on server.");
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
};

// Retry logic for 429/Quota errors
const executeWithRetry = async (operation, attempt = 1) => {
    const maxRetries = apiKeys.length * 2;
    try {
        return await operation();
    } catch (error) {
        const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota');
        if (isRateLimit && attempt <= maxRetries) {
            console.warn(`⚠️ Rate Limit (429) on Key. Rotating... (Attempt ${attempt})`);
            return executeWithRetry(operation, attempt + 1);
        }
        throw error;
    }
};

// --- MIDDLEWARE ---

// Check Plan Limits & Reset Daily Usage
const checkPlanLimits = async (req, res, next) => {
    // 1. Identify User (Cookie preferred, body fallback)
    const code = req.cookies.session_code || req.body.activationCode;
    
    if (!code) {
        return res.status(401).json({ error: "Session expired. Please login again." });
    }

    try {
        const user = await ActivationCode.findOne({ code });
        if (!user) return res.status(403).json({ error: "Invalid Session Code" });

        // 2. Reset Daily Usage if new day
        const today = new Date().setHours(0,0,0,0);
        const lastUsed = new Date(user.lastUsageDate).setHours(0,0,0,0);
        
        if (today > lastUsed) {
            user.dailyUsage = 0;
            user.lastUsageDate = new Date();
            await user.save();
        }

        // 3. Fetch Limits from Database
        let config = await AppConfig.findOne();
        if (!config) {
            // Create default config if none exists
            config = await AppConfig.create({}); 
        }

        const limits = config.planLimits || { Free: 3, Pro: 20, Gold: 100, Unlimited: 99999 };
        const limit = limits[user.planType] || 3;

        // 4. Check Limit
        if (user.dailyUsage >= limit) {
            return res.status(403).json({ 
                error: `Daily Limit Reached! Your ${user.planType} plan allows ${limit} quizzes per day. Please upgrade.` 
            });
        }

        req.user = user; // Attach user to request
        next();

    } catch (err) {
        res.status(500).json({ error: "Auth Check Failed" });
    }
};

// Admin Authentication Middleware
const requireAdmin = (req, res, next) => {
    const adminToken = req.cookies.admin_session;
    // In a real app, verify this is a real signed token.
    // Here we use a simple presence check set by the login route.
    if (adminToken === 'authenticated') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Admin Access Required" });
    }
};

// --- ROUTES ---

// 1. Activate & Set Cookie
app.post('/api/activate', async (req, res) => {
    try {
        const { code, deviceId } = req.body;
        if (!code) return res.status(400).json({ error: 'Code required' });

        const user = await ActivationCode.findOne({ code });
        if (!user) return res.status(401).json({ valid: false, message: 'Invalid Code' });
        
        // Strict Reuse Policy (Optional: Can be relaxed if deviceId matches)
        if (user.isUsed && user.usedByDeviceId && user.usedByDeviceId !== deviceId) {
             return res.status(403).json({ valid: false, message: 'This code is already in use on another device.' });
        }

        // Mark Used
        user.isUsed = true;
        user.usedByDeviceId = deviceId || 'unknown';
        user.lastUsageDate = new Date();
        await user.save();

        // Set HTTP-Only Cookie (Secure session)
        res.cookie('session_code', code, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 Year
        });

        res.json({ valid: true, plan: user.planType });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Secure Generation Proxy
app.post('/api/generate', checkPlanLimits, async (req, res) => {
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

        // Increment Usage
        req.user.dailyUsage += 1;
        req.user.lastUsageDate = new Date();
        await req.user.save();
        
        // Get current limit for response info
        const appConfig = await AppConfig.findOne();
        const limits = appConfig ? appConfig.planLimits : { Free: 3, Pro: 20, Gold: 100, Unlimited: 99999 };
        const currentLimit = limits[req.user.planType];

        res.json({ text: result, remaining: Math.max(0, currentLimit - req.user.dailyUsage) }); 

    } catch (err) {
        console.error("Generation Error:", err);
        res.status(500).json({ error: err.message || "Server Error" });
    }
});

// 3. Cache Check (Public)
app.post('/api/quiz/check', async (req, res) => {
  try {
    const { hash } = req.body;
    const cachedEntry = await QuizCache.findOne({ hash });
    if (cachedEntry) return res.json({ found: true, quiz: cachedEntry.quiz });
    return res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cache Save (Protected by Plan Limit Middleware? Optional. Leaving public for now for simplicity)
app.post('/api/quiz/save', async (req, res) => {
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

// --- ADMIN ROUTES ---

// Admin Login Route (New Secure Route)
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error("ADMIN_PASSWORD not set in .env");
        return res.status(500).json({ error: "Server Configuration Error" });
    }

    if (password === adminPassword) {
        // Set HTTP-Only Cookie for Admin
        res.cookie('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 Day
        });
        return res.json({ success: true });
    } else {
        return res.status(401).json({ error: "Invalid Password" });
    }
});

// Apply Middleware to all subsequent admin routes
app.use('/api/admin/*', requireAdmin);

app.get('/api/admin/quizzes', async (req, res) => {
  try {
    const quizzes = await QuizCache.find({}, 'hash title createdAt quiz').sort({ createdAt: -1 }).limit(50);
    const result = quizzes.map(q => ({
      _id: q._id, title: q.title, date: q.createdAt, questionCount: Array.isArray(q.quiz) ? q.quiz.length : 0
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/quiz/:id', async (req, res) => {
  try {
    await QuizCache.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Codes Management
app.get('/api/admin/codes', async (req, res) => {
    try {
        const codes = await ActivationCode.find().sort({ createdAt: -1 });
        res.json(codes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/codes/generate', async (req, res) => {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/code/:id', async (req, res) => {
    try {
        await ActivationCode.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Config Management
app.get('/api/admin/config', async (req, res) => {
    try {
        let config = await AppConfig.findOne();
        if (!config) config = await AppConfig.create({});
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/config', async (req, res) => {
    try {
        const { planLimits } = req.body;
        let config = await AppConfig.findOne();
        if (!config) config = new AppConfig();
        
        if (planLimits) {
            config.planLimits = { ...config.planLimits, ...planLimits };
        }
        config.updatedAt = new Date();
        await config.save();
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Rotation Active: ${apiKeys.length} Keys loaded.`);
});
