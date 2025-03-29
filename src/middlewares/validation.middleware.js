import { validationResult, body } from 'express-validator';

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const validateAccount = [
    body('entityId')
        .notEmpty()
        .withMessage('Entity ID is required')
        .isMongoId()
        .withMessage('Invalid Entity ID format'),
    body('entityType')
        .notEmpty()
        .withMessage('Entity Type is required')
        .isIn(['Customer', 'Vendor', 'Both'])
        .withMessage('Invalid Entity Type'),
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Active', 'Inactive', 'Suspended'])
        .withMessage('Invalid Status'),
    body('companyId')
        .notEmpty()
        .withMessage('Company ID is required')
        .isMongoId()
        .withMessage('Invalid Company ID format'),
    validateRequest
];

export default validateRequest;
