import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {createExpense, getAllExpenses} from '../controllers/expense.controller.js';


const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);


router.post('/', createExpense);

router.get('/', getAllExpenses);

export default router;
