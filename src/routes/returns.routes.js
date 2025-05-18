import express from 'express';

import authMiddleware from '../middlewares/auth.middleware.js';
import {createPOSReturn, getAllReturns} from "../controllers/returns.controller.js";

const router = express.Router();

// POST /api/v1/returns
router.post('/', authMiddleware, createPOSReturn);
// New:
router.get('/', authMiddleware, getAllReturns);

export default router;
