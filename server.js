const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// الربط بالداتابيز باستخدام متغير البيئة
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// تعريف موديل الأكواد - التأكد من اسم الـ collection
const ActivationCode = mongoose.model('ActivationCode', new mongoose.Schema({
  code: String,
  isUsed: Boolean,
  planType: String
}), 'activationcodes');

// راوت التفعيل (Backend API)
app.post('/api/activate', async (req, res) => {
  const { code } = req.body;
  console.log("📥 Received code:", code); // عشان نشوف الطلب في اللوجز
  try {
    const foundCode = await ActivationCode.findOne({ code: code });
    if (foundCode) {
      console.log("✅ Code found:", foundCode.planType);
      res.json({ valid: true, planType: foundCode.planType });
    } else {
      console.log("❌ Code not found in DB");
      res.status(404).json({ valid: false, error: "Code not found" });
    }
  } catch (err) {
    console.error("🔥 Server Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// السطر السحري اللي بيشغل السيرفر على فيرسل
module.exports = app;

// للتشغيل المحلي فقط
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
