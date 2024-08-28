import { Measure } from '../entities/Measure';
import { AppDataSource } from '../config/database';
import { UploadMeasureData, MeasureResponse, ConfirmMeasureData, ListMeasureResponse } from '../types/MeasureTypes';
import { Between, FindOptionsWhere } from 'typeorm';
import { startOfMonth, endOfMonth } from 'date-fns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { genAI, fileManager } from '../config/gemini';

// Inicializar o cliente do Google Generative AI
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Inicializar o GoogleAIFileManager

function base64ToBuffer(base64String: string): Buffer {
    return Buffer.from(base64String.split(';base64,').pop() || '', 'base64');
}

function getMimeType(base64String: string): string {
    const matches = base64String.match(/^data:(image\/[a-zA-Z]*);base64,/);
    if (matches && matches[1]) {
        return matches[1];
    } else {
        throw new Error('INVALID_IMAGE_TYPE');
    }
}

function getFormattedDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexados
    const year = now.getFullYear();
    return `${month}-${year}`; // Nome do arquivo baseado no mês e ano
}

export class MeasureService {
    static async uploadImage(data: UploadMeasureData): Promise<MeasureResponse> {
        const measureRepo = AppDataSource.getRepository(Measure);

        // Validação dos parâmetros
        if (!data.customer_code || !data.measure_type || !data.measure_datetime || !data.image) {
            throw new Error('INVALID_INPUT');
        }

        // Validar se o tipo de imagem base64 é suportado
        if (!data.image.startsWith('data:image/')) {
            throw new Error('INVALID_IMAGE_TYPE');
        }

        // Extrair o tipo MIME da imagem Base64
        const mimeType = getMimeType(data.image);

        // Verificar se já existe uma leitura no mês para o tipo de leitura
        const existingMeasure = await measureRepo.findOne({
            where: {
                customer_code: data.customer_code,
                measure_type: data.measure_type,
                measure_datetime: Between(startOfMonth(new Date(data.measure_datetime)), endOfMonth(new Date(data.measure_datetime)))
            }
        });

        if (existingMeasure) {
            throw new Error('DOUBLE_REPORT');
        }

        // Preparar a imagem base64 para armazenamento temporário
        const fileBuffer = base64ToBuffer(data.image);
        const fileName = `${data.customer_code}-${getFormattedDate()}.${mimeType.split('/')[1]}`; // Nome do arquivo com código do cliente e mês
        const tempDir = os.tmpdir(); // Usar o diretório temporário do sistema
        const tempFilePath = path.join(tempDir, fileName);

        // Criar diretório temporário se não existir
        try {
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
        } catch (error) {
            throw new Error('TEMP_DIR_CREATION_ERROR: ' + error.message);
        }

        // Salvar a imagem em um arquivo temporário
        try {
            fs.writeFileSync(tempFilePath, fileBuffer);
        } catch (error) {
            throw new Error('FILE_WRITE_ERROR: ' + error.message);
        }

        let imageUrl: string;

        try {
            // Enviar o arquivo para o GoogleAIFileManager
            const uploadResponse = await fileManager.uploadFile(tempFilePath, {
                mimeType,
                displayName: fileName,
            });

            imageUrl = uploadResponse.file.uri;
        } catch (error) {
            throw new Error('FILE_UPLOAD_ERROR: ' + error.message);
        } finally {
            // Remover o arquivo temporário após o upload
            try {
                fs.unlinkSync(tempFilePath);
            } catch (error) {
                console.error('TEMP_FILE_DELETION_ERROR: ' + error.message);
            }
        }

        const prompt = "Análise a imagem fornecida e identifique o valor exibido no medidor. O medidor pode ser um medidor de água ou gás. Por favor, forneça o valor numérico visível no medidor. Se o valor não estiver visível, informe isso claramente.";

        let result;
        try {
            result = await model.generateContentStream([prompt, { inlineData: { data: fileBuffer.toString('base64'), mimeType } }]);
        } catch (error) {
            throw new Error('GEMINI_API_ERROR: ' + error.message);
        }

        let measureValue: number | null = null;

        // Processar a resposta do modelo
        for await (const chunk of result.stream) {
            const chunkText = await chunk.text();
            console.log(chunkText);  // Opcional: exibir a resposta no console

            const extractedValue = this.extractMeasureValue(chunkText);
            if (extractedValue !== null) {
                measureValue = extractedValue;
            }
        }

        if (measureValue === null) {
            throw new Error('MEASURE_VALUE_EXTRACTION_FAILED');
        }

        // Criar uma nova medida e salvá-la no banco de dados
        const measure = new Measure();
        measure.customer_code = data.customer_code;
        measure.measure_type = data.measure_type;
        measure.measure_value = measureValue;
        measure.measure_datetime = new Date(data.measure_datetime);
        measure.image_url = imageUrl; // Armazenar a URL da imagem

        await measureRepo.save(measure);

        return {
            image_url: imageUrl, // Retornar a URL da imagem
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
    
        // Validação do tipo de medida
        if (measure_type && !['WATER', 'GAS'].includes(measure_type.toUpperCase())) {
            throw new Error('INVALID_TYPE');
        }
    
        // Criar a cláusula WHERE opcionalmente
        const whereClause: FindOptionsWhere<Measure> = {
            customer_code,
            ...(measure_type ? { measure_type: measure_type.toUpperCase() as 'WATER' | 'GAS' } : {})
        };
    
        try {
            // Buscar medidas no repositório
            const measures = await measureRepo.find({
                where: whereClause,
            });
    
            // Verificar se foram encontradas medidas
            if (measures.length === 0) {
                throw new Error('MEASURES_NOT_FOUND');
            }
    
            // Mapear os resultados para a resposta
            return measures.map((measure: Measure) => ({
                measure_uuid: measure.uuid,
                measure_datetime: measure.measure_datetime,
                measure_type: measure.measure_type,
                has_confirmed: measure.has_confirmed,
                image_url: measure.image_url
            }));
        } catch (error) {
            // Tratar erros de banco de dados ou outros erros
            console.error(error);
            throw new Error('DATABASE_ERROR');
        }
    }

    private static extractMeasureValue(detectedText: string): number | null {
        const match = detectedText.match(/\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : null;
    }
}
