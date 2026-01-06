import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema({
  planLimits: {
    free: { type: Number, default: 5 },
    pro: { type: Number, default: 100 }
  },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);
