import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.config.js';
import routes from './src/routes/index.js';
import errorMiddleware from './src/middlewares/error.middleware.js';
import cors from 'cors';

dotenv.config();

// Initialize Express App
const app = express();
app.use(cors());

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
