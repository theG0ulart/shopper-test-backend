// services/measureService.ts
import { Measure } from '../entities/Measure';
import { AppDataSource } from '../config/database';
import { UploadMeasureData, MeasureResponse, ConfirmMeasureData, ListMeasureResponse } from '../types/MeasureTypes';
import { Between, FindOptionsWhere } from 'typeorm';
import { startOfMonth, endOfMonth } from 'date-fns';
import { processImage, uploadImageToFileManager } from '../utils/imageUtils';
import { genAI } from '../config/gemini';

export class MeasureService {
  private static model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  static async uploadImage(data: UploadMeasureData): Promise<MeasureResponse> {
    const measureRepo = AppDataSource.getRepository(Measure);

    this.validateUploadData(data);

    const existingMeasure = await this.findExistingMeasure(measureRepo, data);
    if (existingMeasure) {
      throw new Error('DOUBLE_REPORT');
    }

    const { tempFilePath, mimeType, fileName, fileBuffer } = processImage(data.image, data.customer_code);
    const imageUrl = await uploadImageToFileManager(tempFilePath, fileName, mimeType);

    const measureValue = await this.extractMeasureValue(fileBuffer);

    const measure = new Measure();
    measure.customer_code = data.customer_code;
    measure.measure_type = data.measure_type;
    measure.measure_value = measureValue;
    measure.measure_datetime = new Date(data.measure_datetime);
    measure.image_url = imageUrl;

    await measureRepo.save(measure);

    return {
      image_url: imageUrl,
      measure_value: measureValue,
      measure_uuid: measure.uuid
    };
  }

  static async confirmMeasure(data: ConfirmMeasureData): Promise<void> {
    const measureRepo = AppDataSource.getRepository(Measure);
    const measure = await measureRepo.findOne({ where: { uuid: data.measure_uuid } });

    if (!measure) {
      throw new Error('MEASURE_NOT_FOUND');
    }

    if (measure.has_confirmed) {
      throw new Error('CONFIRMATION_DUPLICATE');
    }

    measure.measure_value = data.confirmed_value;
    measure.has_confirmed = true;

    await measureRepo.save(measure);
  }

  static async listMeasures(customer_code: string, measure_type?: string): Promise<ListMeasureResponse[]> {
    const measureRepo = AppDataSource.getRepository(Measure);

    this.validateMeasureType(measure_type);

    const whereClause: FindOptionsWhere<Measure> = {
      customer_code,
      ...(measure_type ? { measure_type: measure_type.toUpperCase() as 'WATER' | 'GAS' } : {})
    };

    const measures = await measureRepo.find({ where: whereClause });

    if (measures.length === 0) {
      throw new Error('MEASURES_NOT_FOUND');
    }

    return measures.map((measure: Measure) => ({
      measure_uuid: measure.uuid,
      measure_datetime: measure.measure_datetime,
      measure_type: measure.measure_type,
      has_confirmed: measure.has_confirmed,
      image_url: measure.image_url
    }));
  }

  private static validateUploadData(data: UploadMeasureData) {
    if (!data.customer_code || !data.measure_type || !data.measure_datetime || !data.image) {
      throw new Error('INVALID_INPUT');
    }

    if (!data.image.startsWith('data:image/')) {
      throw new Error('INVALID_IMAGE_TYPE');
    }
  }

  private static async findExistingMeasure(measureRepo: any, data: UploadMeasureData) {
    return await measureRepo.findOne({
      where: {
        customer_code: data.customer_code,
        measure_type: data.measure_type,
        measure_datetime: Between(startOfMonth(new Date(data.measure_datetime)), endOfMonth(new Date(data.measure_datetime)))
      }
    });
  }

  private static async extractMeasureValue(fileBuffer: Buffer): Promise<number> {
    const prompt = "Análise a imagem fornecida e identifique o valor exibido no medidor. O medidor pode ser um medidor de água ou gás. Por favor, forneça o valor numérico visível no medidor. Se o valor não estiver visível, informe isso claramente.";
    let result;

    try {
      result = await this.model.generateContentStream([prompt, { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'image/png' } }]);
    } catch (error) {
      throw new Error('GEMINI_API_ERROR: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    let measureValue: number | null = null;

    for await (const chunk of result.stream) {
      const chunkText = await chunk.text();
      console.log(chunkText);
      const extractedValue = this.extractMeasureValueFromText(chunkText);
      if (extractedValue !== null) {
        measureValue = extractedValue;
      }
    }

    if (measureValue === null) {
      throw new Error('MEASURE_VALUE_EXTRACTION_FAILED');
    }

    return measureValue;
  }

  private static extractMeasureValueFromText(detectedText: string): number | null {
    const match = detectedText.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  private static validateMeasureType(measure_type?: string) {
    if (measure_type && !['WATER', 'GAS'].includes(measure_type.toUpperCase())) {
      throw new Error('INVALID_TYPE');
    }
  }
}
