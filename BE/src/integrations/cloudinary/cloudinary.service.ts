import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;

  constructor(configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.folder = configService.get<string>(
      'CLOUDINARY_FOLDER',
      'smart-clinic',
    );
  }

  uploadAvatar(buffer: Buffer, userId: number) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `${this.folder}/avatars`,
          public_id: `user-${userId}-${Date.now()}`,
          resource_type: 'image',
          overwrite: false,
          transformation: [
            {
              width: 800,
              height: 800,
              crop: 'fill',
              gravity: 'face',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadGatewayException(
                'Không thể tải ảnh lên Cloudinary lúc này',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      upload.end(buffer);
    });
  }

  uploadMedicineImage(buffer: Buffer, medicineId: number) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `${this.folder}/medicines`,
          public_id: `medicine-${medicineId}-${Date.now()}`,
          resource_type: 'image',
          overwrite: false,
          transformation: [
            {
              width: 1000,
              height: 1000,
              crop: 'pad',
              background: 'white',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadGatewayException(
                'Không thể tải ảnh thuốc lên Cloudinary lúc này',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      upload.end(buffer);
    });
  }

  async deleteImage(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch (error) {
      this.logger.warn(
        `Không thể xóa ảnh Cloudinary ${publicId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
