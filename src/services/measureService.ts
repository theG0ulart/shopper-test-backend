import fetch from 'node-fetch';
import { Measure } from '../entities/Measure';
import { AppDataSource } from '../config/database';
import { ConfirmMeasureData, MeasureResponse, UploadMeasureData } from '../types/MeasureTypes';
import { Between } from 'typeorm';
import { startOfMonth, endOfMonth } from 'date-fns';

export class MeasureService {
    static async uploadImage(data: UploadMeasureData): Promise<MeasureResponse> {
        const measureRepo = AppDataSource.getRepository(Measure);
        
        const existingMeasure = await Measure.findOne({
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

        const geminiData = await response.json();

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
}