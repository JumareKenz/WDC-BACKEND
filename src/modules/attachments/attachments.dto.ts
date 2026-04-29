import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UploadAttachmentDto {
  @IsUUID()
  reportId!: string;

  @IsEnum(['image', 'audio', 'document'])
  kind!: 'image' | 'audio' | 'document';

  @IsOptional()
  @IsString()
  caption?: string;
}

export class AttachmentResponseDto {
  id!: string;
  reportId!: string;
  kind!: string;
  storageKey!: string;
  bytes!: number;
  mimeType!: string;
  transcript?: string | null;
  confidence?: number | null;
  processingState!: string;
  signedUrl?: string;
  uploadedBy!: string;
  createdAt!: string;
}
