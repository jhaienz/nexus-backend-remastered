import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly pdfsPrefix: string;
  private readonly profilesPrefix: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('r2.accountId')!;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('r2.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('r2.secretAccessKey')!,
      },
    });
    this.bucket = this.configService.get<string>('r2.bucketName', 'ncf-research-files');
    this.pdfsPrefix = this.configService.get<string>('r2.pdfsPrefix', 'pdfs');
    this.profilesPrefix = this.configService.get<string>('r2.profilesPrefix', 'profiles');
  }

  async uploadPdf(buffer: Buffer, filename: string, researchId: number): Promise<string> {
    const key = `${this.pdfsPrefix}/${researchId}/${Date.now()}_${filename}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));
    return key;
  }

  async getPdfStream(fileKey: string) {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }));
      return {
        stream: response.Body,
        contentType: response.ContentType ?? 'application/pdf',
        filename: fileKey.split('/').pop() ?? 'document.pdf',
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') throw new NotFoundException('File not found');
      throw error;
    }
  }

  async getPdfUrl(fileKey: string): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    }), { expiresIn: 3600 });
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }));
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') throw error;
    }
  }

  async uploadProfilePic(buffer: Buffer, userId: number): Promise<string> {
    const ext = 'jpg';
    const key = `${this.profilesPrefix}/${userId}.${ext}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }));
    return key;
  }

  async getProfilePicStream(fileKey: string) {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }));
      return {
        stream: response.Body,
        contentType: response.ContentType ?? 'image/jpeg',
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') throw new NotFoundException('Profile picture not found');
      throw error;
    }
  }
}
