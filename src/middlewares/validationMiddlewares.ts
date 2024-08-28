import { body, param, query } from 'express-validator';

// Validações para upload
export const uploadValidation = [
    body('image').isString().withMessage('Image must be a base64 string'),
    body('customer_code').isString().withMessage('Customer code must be a string'),
    body('measure_datetime').isISO8601().withMessage('Measure datetime must be a valid datetime'),
    body('measure_type').isIn(['WATER', 'GAS']).withMessage('Measure type must be WATER or GAS')
];

// Validações para confirmação
export const confirmValidation = [
    body('measure_uuid').isUUID().withMessage('Measure UUID must be a valid UUID'),
    body('confirmed_value').isInt().withMessage('Confirmed value must be an integer')
];

// Validações para listagem
export const listValidation = [
    param('customer_code').isString().withMessage('Customer code must be a string'),
    query('measure_type').optional().isIn(['WATER', 'GAS']).withMessage('Measure type must be WATER or GAS')
];
