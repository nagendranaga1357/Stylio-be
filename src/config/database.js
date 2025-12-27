import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

