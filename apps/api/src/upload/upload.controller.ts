import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/image
   * Faz upload de uma imagem
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Query('category') category: 'logo' | 'cover' | 'gallery' | 'service' = 'gallery',
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const { workspaceId } = req.user;
    const url = await this.uploadService.uploadImage(file, workspaceId, category);

    return {
      success: true,
      url,
      filename: file.originalname,
      size: file.size,
    };
  }

  /**
   * GET /upload/files/:workspaceId/:filename
   * Serve arquivos estáticos de imagens
   * Público - para exibir imagens na página de agendamento
   */
  @Get('files/:workspaceId/:filename')
  async serveFile(
    @Param('workspaceId') workspaceId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.uploadService.getFilePath(workspaceId, filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Define content-type baseado na extensão
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    // Cache de 1 dia para imagens
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
