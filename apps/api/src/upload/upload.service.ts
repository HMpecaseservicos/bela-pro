import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'tmp', 'uploads');

    // Cria diretório de uploads se não existir
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    workspaceId: string,
    category: 'logo' | 'cover' | 'gallery' | 'service',
  ): Promise<string> {
    // Valida tipo de arquivo
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Use: JPG, PNG, GIF ou WebP',
      );
    }

    // Valida tamanho
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 5MB');
    }

    // Gera nome único
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${workspaceId}-${category}-${randomUUID()}${ext}`;
    
    // Cria subdiretório para o workspace
    const workspaceDir = path.join(this.uploadDir, workspaceId);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Salva arquivo
    const filePath = path.join(workspaceDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // Retorna URL relativa (será servida pelo endpoint de arquivos estáticos)
    return `/api/v1/upload/files/${workspaceId}/${filename}`;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // Extrai caminho do arquivo da URL
    const match = imageUrl.match(/\/files\/(.+)$/);
    if (!match) return;

    const filePath = path.join(this.uploadDir, match[1]);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFilePath(workspaceId: string, filename: string): string | null {
    const filePath = path.join(this.uploadDir, workspaceId, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}
