import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

const CHANNELS = ['in_app', 'email', 'sms', 'whatsapp'] as const;
const SCOPE_KINDS = ['state', 'lga', 'ward'] as const;

export class BroadcastMessageDto {
  @ApiProperty({ description: 'Broadcast body text' })
  @IsString()
  @Length(1, 4000)
  body!: string;

  @ApiProperty({ enum: CHANNELS, isArray: true, description: 'Delivery channels' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  channels!: ('in_app' | 'email' | 'sms' | 'whatsapp')[];

  @ApiProperty({ enum: SCOPE_KINDS, description: 'Broadcast scope' })
  @IsIn(SCOPE_KINDS)
  scopeKind!: 'state' | 'lga' | 'ward';

  @ApiPropertyOptional({ isArray: true, description: 'Scope ids for lga/ward targeting' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  scopeIds?: string[];

  @ApiPropertyOptional({ description: 'Skip quiet-hours gate', default: false })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}

export class BroadcastResponseDto {
  @ApiProperty() messageId!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty() recipientCount!: number;
  @ApiProperty() deliveryCount!: number;
  @ApiProperty() queuedDuringQuietHours!: boolean;
}

export class DeliveryAttemptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) providerRef!: string | null;
  @ApiProperty() payload!: Record<string, unknown>;
  @ApiProperty() queuedAt!: string;
  @ApiPropertyOptional({ nullable: true }) sentAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) deliveredAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) readAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) failedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) errorMessage!: string | null;
}

export class ListDeliveriesResponseDto {
  @ApiProperty({ type: [DeliveryAttemptResponseDto] }) items!: DeliveryAttemptResponseDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}
