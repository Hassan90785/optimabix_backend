import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.config.js';
import routes from './src/routes/index.js';
import errorMiddleware from './src/middlewares/error.middleware.js';
import cors from 'cors';
import path from 'path';

dotenv.config();

// Initialize Express App
const app = express();
app.use(cors());

// Connect to Database
connectDB();

// Middleware for JSON Parsing
app.use(express.json());

// ✅ Set up Static Folder for Uploads
const uploadsPath = path.resolve('src/uploads'); // Resolve absolute path to 'src/uploads'
app.use('/uploads', express.static(uploadsPath)); // Serve files under '/uploads'

// ✅ Register API Routes with Versioning
app.use('/api/v1', routes);

// ✅ Global Error Handling Middleware
app.use(errorMiddleware);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`✅ Static files served at http://localhost:${PORT}/uploads`);
});

export default app;
