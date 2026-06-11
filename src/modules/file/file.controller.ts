import {
  Controller, Get, Post, Param, Res, UploadedFile, UseInterceptors,
  HttpStatus, HttpCode, NotFoundException, BadRequestException, Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { researches, users } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { FileService } from './file.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
  ) {}

  @Public()
  @Get('pdf/:researchId')
  async streamPdf(@Param('researchId') researchId: string, @Res() res: Response) {
    const [research] = await this.db.select().from(researches).where(eq(researches.id, Number(researchId)));
    if (!research || !research.fileKey) throw new NotFoundException('Research or file not found');

    const { stream, contentType, filename } = await this.fileService.getPdfStream(research.fileKey);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    if (stream && typeof (stream as any).pipe === 'function') {
      (stream as any).pipe(res);
    } else {
      res.send(stream);
    }
  }

  @Post('pdf/:researchId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async replacePdf(
    @Param('researchId') researchId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('PDF file is required');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are allowed');

    const [research] = await this.db.select().from(researches).where(eq(researches.id, Number(researchId)));
    if (!research) throw new NotFoundException('Research not found');

    if (research.fileKey) {
      await this.fileService.deleteFile(research.fileKey);
    }

    const fileKey = await this.fileService.uploadPdf(file.buffer, file.originalname, research.id);
    await this.db.update(researches).set({ fileKey, filename: file.originalname, updatedAt: new Date() })
      .where(eq(researches.id, research.id));

    return { message: 'File updated successfully' };
  }

  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePic(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image files are allowed');

    const fileKey = await this.fileService.uploadProfilePic(file.buffer, userId);
    await this.db.update(users).set({ profilePictureKey: fileKey }).where(eq(users.id, userId));

    return { message: 'Profile picture uploaded successfully', url: fileKey };
  }

  @Public()
  @Get('profile-picture/:userId')
  async streamProfilePic(@Param('userId') userId: string, @Res() res: Response) {
    const [user] = await this.db.select().from(users).where(eq(users.id, Number(userId)));
    if (!user || !user.profilePictureKey) throw new NotFoundException('Profile picture not found');

    const { stream, contentType } = await this.fileService.getProfilePicStream(user.profilePictureKey);

    res.setHeader('Content-Type', contentType);
    if (stream && typeof (stream as any).pipe === 'function') {
      (stream as any).pipe(res);
    } else {
      res.send(stream);
    }
  }
}
