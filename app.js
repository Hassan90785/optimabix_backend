import express, {json} from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.config.js';
import routes from './src/routes/index.js';
import errorMiddleware from './src/middlewares/error.middleware.js';
import cors from 'cors';
import https from "https";
import fs from "fs";

// Load environment variables from .env file based on environment
if (process.env.NODE_ENV === 'local') {
    dotenv.config({path: '.env.local'});
} else {
    dotenv.config(); // Default loads from .env for production
}


// Initialize Express App
const app = express();
app.use(cors({origin: process.env.CORS_ORIGIN || '*'}));
app.use(json({limit: '50mb'}));


// Connect to Database
connectDB();

// Middleware for JSON Parsing
app.use(express.json());

// ✅ Register API Routes with Versioning
app.use('/api/v1', routes);

// ✅ Global Error Handling Middleware
app.use(errorMiddleware);
// Hello World endpoint
app.get('/api/v1/hello', (req, res) => {
    res.send('Hello, World!');
});

// 🟢 Start Server (NO SSL here — NGINX handles it)
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
    console.log(`✅ API running on http://${HOST}:${PORT}`);
});

export default app;
