import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const OP_KINDS = [
  'field_set',
  'attachment_add',
  'submit',
  'open_review',
  'approve',
  'return',
  'edit_returned',
  'seal',
] as const;

export class SyncOpDto {
  @ApiProperty({ description: 'Report UUID this op targets' })
  @IsUUID()
  reportId!: string;

  @ApiProperty({ enum: OP_KINDS })
  @IsIn(OP_KINDS)
  opKind!: (typeof OP_KINDS)[number];

  @ApiProperty({ description: 'Operation-specific payload' })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client-generated op id (UUIDv7 preferred)' })
  @IsOptional()
  @IsUUID()
  opId?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 client wall-clock at op creation' })
  @IsOptional()
  @IsString()
  wallClockTs?: string;

  @ApiPropertyOptional({ description: 'Originating device id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SyncBatchDto {
  @ApiProperty({ description: 'Idempotency key for the entire batch' })
  @IsString()
  @Length(1, 256)
  idempotencyKey!: string;

  @ApiProperty({ type: [SyncOpDto], description: 'Ops to apply' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOpDto)
  ops!: SyncOpDto[];

  @ApiPropertyOptional({ description: 'If provided, server also returns ops with server_seq > sinceCursor' })
  @IsOptional()
  @IsString()
  sinceCursor?: string;
}

export class SyncOpResultDto {
  @ApiProperty() reportId!: string;
  @ApiProperty() opId!: string;
  @ApiProperty({ enum: ['applied', 'rejected', 'duplicate'] })
  status!: 'applied' | 'rejected' | 'duplicate';
  @ApiPropertyOptional() serverSeq?: string;
  @ApiPropertyOptional() error?: string;
}

export class SyncPulledOpDto {
  @ApiProperty() reportId!: string;
  @ApiProperty() opId!: string;
  @ApiProperty() opKind!: string;
  @ApiProperty() actorUserId!: string;
  @ApiProperty() deviceId!: string;
  @ApiProperty() wallClockTs!: string;
  @ApiProperty() serverSeq!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload!: Record<string, unknown>;
}

export class SyncBatchResponseDto {
  @ApiProperty({ description: 'Max server_seq of applied ops; use as sinceCursor in next sync' })
  nextCursor!: string;

  @ApiProperty({ description: 'Number of newly applied ops' })
  applied!: number;

  @ApiProperty({ description: 'Number of ops that failed' })
  rejected!: number;

  @ApiProperty({ type: [SyncOpResultDto] })
  results!: SyncOpResultDto[];

  @ApiPropertyOptional({ type: [SyncPulledOpDto], description: 'Ops the client has not yet seen (if sinceCursor was provided)' })
  pulledOps?: SyncPulledOpDto[];
}

// Suppress unused-import warnings
export type _unusedIsNumber = typeof IsNumber;
