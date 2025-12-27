import mongoose from 'mongoose';

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'wallet', 'netbanking'];
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded'];

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
    unique: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: PAYMENT_METHODS,
    required: [true, 'Payment method is required'],
  },
  status: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'pending',
  },
  transactionId: {
    type: String,
    trim: true,
  },
  paymentGateway: {
    type: String,
    trim: true,
  },
  paidAt: {
    type: Date,
  },
  refundedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
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

paymentSchema.index({ booking: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

