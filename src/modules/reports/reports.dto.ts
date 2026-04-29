import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const STATES = ['draft', 'submitted', 'in_review', 'approved', 'returned', 'sealed'] as const;
const SOURCES = ['typed', 'voiced', 'scanned'] as const;
const METHODS = ['amira', 'wizard', 'snap'] as const;

export class CreateReportDto {
  @ApiProperty({ description: 'Deployed form_versions.id' })
  @IsUUID()
  formVersionId!: string;

  @ApiProperty({ enum: METHODS })
  @IsIn(METHODS)
  submissionMethod!: 'amira' | 'wizard' | 'snap';

  @ApiPropertyOptional({ description: 'Director may submit for any ward; secretary is restricted by RLS' })
  @IsOptional()
  @IsUUID()
  wardId?: string;
}

export class SetFieldDto {
  @ApiProperty({ example: 'household_count' })
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'key must be snake_case starting with a letter' })
  key!: string;

  @ApiProperty({ description: 'JSON value matching the form_versions.schema field type' })
  value!: unknown;

  @ApiProperty({ enum: SOURCES })
  @IsIn(SOURCES)
  source!: 'typed' | 'voiced' | 'scanned';

  @ApiPropertyOptional({ description: '0..1 for voiced/scanned; null for typed', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number | null;

  @ApiPropertyOptional({ description: 'UUIDv7 op id; client-generated to make sync de-duplicate idempotent' })
  @IsOptional()
  @IsUUID()
  opId?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 client wall-clock at op creation' })
  @IsOptional()
  @IsString()
  wallClockTs?: string;
}

export class ReturnReportDto {
  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  notes!: string;
}

export class ReportResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() formVersionId!: string;
  @ApiProperty() wardId!: string;
  @ApiProperty() submittedBy!: string;
  @ApiProperty({ enum: METHODS }) submissionMethod!: 'amira' | 'wizard' | 'snap';
  @ApiProperty({ enum: STATES }) state!: (typeof STATES)[number];
  @ApiPropertyOptional({ nullable: true }) sealedAt!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) canonical!: Record<string, unknown>;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ReportOpResponseDto {
  @ApiProperty() opId!: string;
  @ApiProperty() opKind!: string;
  @ApiProperty() actorUserId!: string;
  @ApiProperty() deviceId!: string;
  @ApiProperty() wallClockTs!: string;
  @ApiProperty() serverSeq!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload!: Record<string, unknown>;
}

// Suppress unused-import warnings; the enum decorator above imports IsEnum
// for parity with other modules even if it's not currently referenced.
export type _unusedIsEnum = typeof IsEnum;
export type _unusedIsObject = typeof IsObject;
