import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const EVIDENCE_KINDS = ['report_ref', 'attachment_ref', 'note', 'external_link'] as const;

export class CreateInvestigationDto {
  @ApiProperty({ description: 'Investigation title' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ description: 'Initial summary' })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  summary?: string;

  @ApiPropertyOptional({ enum: PRIORITIES, default: 'normal' })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class UpdateInvestigationDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ description: 'Updated summary' })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  summary?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class AddEvidenceDto {
  @ApiProperty({ enum: EVIDENCE_KINDS })
  @IsIn(EVIDENCE_KINDS)
  kind!: 'report_ref' | 'attachment_ref' | 'note' | 'external_link';

  @ApiPropertyOptional({ description: 'Reference table for report_ref/attachment_ref' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  refTable?: string;

  @ApiPropertyOptional({ description: 'Reference id for report_ref/attachment_ref' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  refId?: string;

  @ApiPropertyOptional({ description: 'Free-text note or external URL' })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  note?: string;
}

export class EvidenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: EVIDENCE_KINDS }) kind!: 'report_ref' | 'attachment_ref' | 'note' | 'external_link';
  @ApiPropertyOptional({ nullable: true }) refTable!: string | null;
  @ApiPropertyOptional({ nullable: true }) refId!: string | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() addedBy!: string;
  @ApiProperty() createdAt!: string;
}

export class InvestigationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) summary!: string | null;
  @ApiProperty({ enum: STATUSES }) status!: 'open' | 'in_progress' | 'resolved' | 'closed';
  @ApiProperty({ enum: PRIORITIES }) priority!: 'low' | 'normal' | 'high' | 'urgent';
  @ApiProperty() openedBy!: string;
  @ApiPropertyOptional({ nullable: true }) closedAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: [EvidenceResponseDto] }) evidence?: EvidenceResponseDto[];
}

export class ListInvestigationsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  limit?: number;
}

export class TimelineEntryDto {
  @ApiProperty() occurredAt!: string;
  @ApiProperty() actorRole!: string;
  @ApiProperty() actorUserId!: string | null;
  @ApiProperty() eventKind!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload!: Record<string, unknown>;
}

export class ListInvestigationsResponseDto {
  @ApiProperty({ type: [InvestigationResponseDto] }) items!: InvestigationResponseDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

// Suppress unused-import warnings
export type _unusedIsUUID = typeof IsUUID;
