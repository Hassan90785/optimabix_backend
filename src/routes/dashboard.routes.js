import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {getDashboard} from "../controllers/dashboard.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
/**
 * @route GET /api/v1/dashboard
 */
router.post('/', getDashboard);

export default router;
