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
app.use('/staging/api/v1', routes);

// ✅ Global Error Handling Middleware
app.use(errorMiddleware);
// Hello World endpoint
app.get('/staging/v1/hello', (req, res) => {
    res.send('Hello, World!');
});

// Start Server
const PORT = process.env.PORT || 8070;
console.log(process.env.CERT_PATH)
// Read SSL certificates only if running in production
let httpsServer;
if (process.env.NODE_ENV === 'production') {
    const cert = fs.readFileSync(process.env.CERT_PATH);
    const ca = fs.readFileSync(process.env.CA_PATH);
    const key = fs.readFileSync(process.env.PK_PATH);
    const httpsOptions = {cert, ca, key};

    httpsServer = https.createServer(httpsOptions, app);
}
// Start server depending on the environment
if (process.env.NODE_ENV === 'production') {
    httpsServer.listen(PORT, process.env.HOST, () => {
        console.log(`HTTPS server running on https://${process.env.HOST}: ${PORT}`);
    });
} else {
    // Local development server
    app.listen(PORT, () => {
        console.log(`Server is running locally at http://localhost:${PORT}`);
    });
}

export default app;
