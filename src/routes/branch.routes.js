import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createBranch,
    deleteBranch,
    getBranchById,
    getBranchesByCompany,
    updateBranch
} from "../controllers/branch.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post('/', createBranch);
router.get('/company/:companyId', getBranchesByCompany);
router.get('/:id', getBranchById);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);
export default router;
