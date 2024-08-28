import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { MeasureService } from '../services/measureService';
import { UploadMeasureData, ConfirmMeasureData } from '../types/MeasureTypes';

export class MeasureController {
  
    static async upload(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error_code: 'INVALID_DATA', error_description: errors.array() });
    }

    const data: UploadMeasureData = req.body;

    try {
      const result = await MeasureService.uploadImage(data);
      res.status(200).json(result);
    } catch (err) {
        const error = err as Error;
      if (error.message === 'DOUBLE_REPORT') {
        return res.status(409).json({ error_code: 'DOUBLE_REPORT', error_description: 'Leitura do mês já realizada' });
      }
      res.status(500).json({ error_code: 'SERVER_ERROR', error_description: error.message });
    }
  }

  static async confirm(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error_code: 'INVALID_DATA', error_description: errors.array() });
    }

    const data: ConfirmMeasureData = req.body;

    try {
      await MeasureService.confirmMeasure(data);
      res.status(200).json({ success: true });
    } catch (err) {
        const error = err as Error;
      if (error.message === 'MEASURE_NOT_FOUND') {
        return res.status(404).json({ error_code: 'MEASURE_NOT_FOUND', error_description: 'Leitura não encontrada' });
      } else if (error.message === 'CONFIRMATION_DUPLICATE') {
        return res.status(409).json({ error_code: 'CONFIRMATION_DUPLICATE', error_description: 'Leitura já confirmada' });
      }
      res.status(500).json({ error_code: 'SERVER_ERROR', error_description: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const measures = await MeasureService.listMeasures(req.params.customer_code as string, req.query.measure_type as string);
      res.status(200).json({ customer_code: req.params.customer_code, measures });
    } catch (err) {
        const error = err as Error;
      if (error.message === 'INVALID_TYPE') {
        return res.status(400).json({ error_code: 'INVALID_TYPE', error_description: 'Tipo de medição não permitida' });
      } else if (error.message === 'MEASURES_NOT_FOUND') {
        return res.status(404).json({ error_code: 'MEASURES_NOT_FOUND', error_description: 'Nenhuma leitura encontrada' });
      }
      res.status(500).json({ error_code: 'SERVER_ERROR', error_description: error.message });
    }
  }
}
