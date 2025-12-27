import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required'],
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: 0,
  },
  maxDiscount: {
    type: Number,
    min: 0,
  },
  minBookingAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
  },
  maxUses: {
    type: Number,
    min: 1,
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: 1,
  },
  currentUses: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.maxUses && this.currentUses >= this.maxUses) return false;
  
  return true;
};

// Method to calculate discount
promoCodeSchema.methods.calculateDiscount = function(bookingAmount) {
  if (bookingAmount < this.minBookingAmount) {
    return 0;
  }

  let discount;
  if (this.discountType === 'percentage') {
    discount = (bookingAmount * this.discountValue) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = this.discountValue;
  }

  return Math.round(discount * 100) / 100;
};

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;

