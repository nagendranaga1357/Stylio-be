import mongoose from 'mongoose';
import crypto from 'crypto';
import config from '../config/index.js';

const otpSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Check if OTP is valid
otpSchema.methods.isValid = function() {
  return !this.isUsed && new Date() <= this.expiresAt;
};

// Static method to generate OTP
otpSchema.statics.generateOTP = async function(user, email) {
  // Invalidate existing OTPs
  await this.updateMany(
    { user: user._id, isUsed: false },
    { isUsed: true }
  );

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Create expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiresMinutes);

  // Create OTP record
  return this.create({
    user: user._id,
    email,
    otp,
    expiresAt,
  });
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp) {
  const otpRecord = await this.findOne({
    email: email.toLowerCase(),
    otp,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .populate('user');

  if (otpRecord) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    return { isValid: true, user: otpRecord.user };
  }

  return { isValid: false, user: null };
};

otpSchema.index({ email: 1, otp: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;

