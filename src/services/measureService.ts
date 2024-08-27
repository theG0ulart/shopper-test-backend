import fetch from 'node-fetch';
import { Measure } from '../entities/Measure';
import { AppDataSource } from '../config/database';
import { ConfirmMeasureData, GeminiApiResponse, ListMeasureResponse, MeasureResponse, UploadMeasureData } from '../types/MeasureTypes';
import { Between, FindOptionsWhere } from 'typeorm';
import { startOfMonth, endOfMonth } from 'date-fns';

export class MeasureService {
    static async uploadImage(data: UploadMeasureData): Promise<MeasureResponse> {
        const measureRepo = AppDataSource.getRepository(Measure);
        
        const existingMeasure = await measureRepo.findOne({
            where: {
                customer_code: data.customer_code,
                measure_type: data.measure_type,
                measure_datetime: Between(startOfMonth(new Date(data.measure_datetime)), endOfMonth(new Date(data.measure_datetime)))
            }
        });

        if(existingMeasure){
            throw new Error('DOUBLE_REPORT');
        }

        const response = await fetch('https://gemini.api.url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
            },
            body: JSON.stringify({image: data.image}),
        });

        const geminiData = await response.json() as GeminiApiResponse;

        const measure = new Measure();
        measure.customer_code = data.customer_code;
        measure.measure_type = data.measure_type;
        measure.measure_value = geminiData.measure_value;
        measure.measure_datetime = new Date(data.measure_datetime);
        measure.image_url = geminiData.image_url;

        await measureRepo.save(measure);

        return {
            image_url: geminiData.image_url,
            measure_value: geminiData.measure_value,
            measure_uuid: measure.uuid
        };
    }

    static async confirmMeasure(data: ConfirmMeasureData): Promise<void> {
        const measureRepo = AppDataSource.getRepository(Measure);
        const measure = await measureRepo.findOne({ where: {uuid: data.measure_uuid}});

        if(!measure) {
            throw new Error('MEASURE_NOT_FOUND');
        }

        if(measure.has_confirmed){
            throw new Error('CONFIRMATION_DUPLICATE');
        }

        measure.measure_value = data.confirmed_value;
        measure.has_confirmed = true;

        await measureRepo.save(measure);
        
    }

    static async listMeasures(customer_code: string, measure_type?: string): Promise<ListMeasureResponse[]>{
        const measureRepo = AppDataSource.getRepository(Measure);

        // Validação do Tipo
        if (measure_type && !['WATER', 'GAS'].includes(measure_type.toUpperCase())) {
            throw new Error('INVALID_TYPE');
          }

          // Where Opcional
          const whereClause: FindOptionsWhere<Measure> = {
            customer_code,
            ...(measure_type ? { measure_type: measure_type.toUpperCase() as 'WATER' | 'GAS' } : {})
          }

          // Busca no Repo
          const measures = await measureRepo.find({
            where: whereClause,
          });

        // Verifica se encontrou medidas
        if(measures.length === 0){
            throw new Error('MEASURES_NOT_FOUND');
        }


        // Mapemento dos resultados
        return measures.map((measure: Measure) => ({
            measure_uuid: measure.uuid,
            measure_datetime: measure.measure_datetime,
            measure_type: measure.measure_type,
            has_confirmed: measure.has_confirmed,
            image_url: measure.image_url
        }))
    }   
}