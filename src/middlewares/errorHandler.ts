import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  res.status(500).json({
    error_code: 'SERVER_ERROR',
    error_description: err.message,
  });
}
