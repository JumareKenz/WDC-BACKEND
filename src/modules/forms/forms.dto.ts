import 'reflect-metadata';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SCOPE_KINDS = ['state', 'lga', 'ward'] as const;
const STATUSES = ['draft', 'deployed', 'archived'] as const;

export class CreateFormDto {
  @ApiProperty({ example: 'monthly-ward-summary' })
  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z][a-z0-9-]*$/, { message: 'slug must be kebab-case starting with a letter' })
  slug!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) titleHa!: string;

  @ApiProperty({ enum: SCOPE_KINDS })
  @IsIn(SCOPE_KINDS)
  scopeKind!: 'state' | 'lga' | 'ward';

  @ApiPropertyOptional({ description: 'LGA ids (when scopeKind=lga) or ward ids (when scopeKind=ward)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(255)
  @IsUUID('all', { each: true })
  scopeIds?: string[];
}

export class UpdateFormDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) titleHa?: string;

  @ApiPropertyOptional({ enum: SCOPE_KINDS })
  @IsOptional()
  @IsIn(SCOPE_KINDS)
  scopeKind?: 'state' | 'lga' | 'ward';

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(255)
  @IsUUID('all', { each: true })
  scopeIds?: string[];
}

export class CreateFormVersionDto {
  @ApiProperty({ description: 'Form schema JSON; validated server-side via Zod' })
  @IsObject()
  schema!: Record<string, unknown>;
}

export class FormResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() titleHa!: string;
  @ApiProperty({ enum: SCOPE_KINDS }) scopeKind!: 'state' | 'lga' | 'ward';
  @ApiProperty({ type: [String] }) scopeIds!: string[];
  @ApiProperty({ enum: STATUSES }) status!: 'draft' | 'deployed' | 'archived';
  @ApiPropertyOptional({ nullable: true }) currentVersionId!: string | null;
  @ApiProperty() createdBy!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class FormVersionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() formId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ type: 'object', additionalProperties: true }) schema!: Record<string, unknown>;
  @ApiPropertyOptional({ nullable: true }) deployedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) deployedBy!: string | null;
  @ApiProperty() createdAt!: string;
}
