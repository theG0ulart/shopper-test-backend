import express from 'express';
import { MeasureController } from '../controllers/measureController';
import { uploadValidation, confirmValidation, listValidation } from '../middlewares/validationMiddlewares';

const router = express.Router();

// Rotas com middlewares de validação
router.post('/upload', uploadValidation, MeasureController.upload);

router.patch('/confirm', confirmValidation, MeasureController.confirm);

router.get('/:customer_code/list', listValidation, MeasureController.list);

export default router;
