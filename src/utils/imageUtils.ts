// utils/imageUtils.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileManager } from '../config/gemini';

export function processImage(base64String: string, customerCode: string) {
  // Converter a string base64 para Buffer
  const fileBuffer = Buffer.from(base64String.split(';base64,').pop() || '', 'base64');
  
  // Extrair o tipo MIME da string base64
  const mimeType = base64String.match(/^data:(image\/[a-zA-Z]*);base64,/)?.[1] || 'image/png';
  
  // Construir o nome do arquivo
  const fileName = `${customerCode}-${getFormattedDate()}.${mimeType.split('/')[1]}`;
  
  // Caminho para o diretório temporário do sistema
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, fileName);
  
  // Salvar o Buffer em um arquivo temporário
  fs.writeFileSync(tempFilePath, fileBuffer);
  
  return { fileName, mimeType, tempFilePath, fileBuffer };
}

export async function uploadImageToFileManager(filePath: string, fileName: string, mimeType: string): Promise<string> {
  try {
    // Enviar o arquivo para o fileManager usando o caminho do arquivo
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: fileName,
    });
    
    // Verificar se a URL está disponível na resposta
    if (!uploadResponse.file || !uploadResponse.file.uri) {
      throw new Error('UPLOAD_RESPONSE_ERROR: URL não encontrada');
    }
    
    return uploadResponse.file.uri;
  } catch (error) {
    const err = error as Error
    throw new Error(`FILE_UPLOAD_ERROR: ${err.message}`);
  }
}

function getFormattedDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
