const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// الربط بالداتابيز
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// تعريف الموديل (تأكد إنه مطابق للي عملناه في الأطلس)
const ActivationCode = mongoose.model('ActivationCode', new mongoose.Schema({
  code: String,
  isUsed: Boolean,
  planType: String
}), 'activationcodes');

// راوت التفعيل
app.post('/api/activate', async (req, res) => {
  const { code } = req.body;
  try {
    const foundCode = await ActivationCode.findOne({ code: code });
    if (foundCode) {
      res.json({ valid: true, planType: foundCode.planType });
    } else {
      res.status(404).json({ valid: false, error: "Code not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// هام جداً لعمل السيرفر على فيرسل
module.exports = app;

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
