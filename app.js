import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import routes from './routes/index.js';
import errorMiddleware from './middlewares/error.middleware.js';

dotenv.config();

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Middleware for JSON Parsing
app.use(express.json());

// ✅ Register API Routes with Versioning
app.use('/api/v1', routes);

// ✅ Global Error Handling Middleware
app.use(errorMiddleware);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

export default app;
