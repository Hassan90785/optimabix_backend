import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Handling MongoDB events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Reconnecting...');
    connectDB();
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected.');
});

export default connectDB;
