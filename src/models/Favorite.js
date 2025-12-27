import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: [true, 'Salon is required'],
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

// Compound unique index
favoriteSchema.index({ user: 1, salon: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;

