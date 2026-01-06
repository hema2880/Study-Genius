import mongoose from 'mongoose';

const activationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: String, default: null }, // User ID or IP
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ActivationCode || mongoose.model('ActivationCode', activationCodeSchema);
