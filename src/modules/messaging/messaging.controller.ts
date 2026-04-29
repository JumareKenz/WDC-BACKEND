import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import {
  BroadcastMessageDto,
  BroadcastResponseDto,
  DeliveryAttemptResponseDto,
  ListDeliveriesResponseDto,
} from './messaging.dto';

function reqId(req: AuthedRequest): string | null {
  const v = (req as AuthedRequest & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly svc: MessagingService) {}

  @Post('broadcast')
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Compose a broadcast message (director only)' })
  async broadcast(
    @Body() dto: BroadcastMessageDto,
    @Req() req: AuthedRequest,
  ): Promise<BroadcastResponseDto> {
    return this.svc.broadcast(rlsContextFromRequest(req), {
      body: dto.body,
      channels: dto.channels,
      scopeKind: dto.scopeKind,
      scopeIds: dto.scopeIds,
      urgent: dto.urgent,
      requestId: reqId(req),
    });
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List delivery attempts for the current user' })
  async listDeliveries(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ListDeliveriesResponseDto> {
    return this.svc.listDeliveries(rlsContextFromRequest(req), {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get a single delivery attempt' })
  async getDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<DeliveryAttemptResponseDto> {
    return this.svc.getDelivery(rlsContextFromRequest(req), id);
  }

  @Post('deliveries/:id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark a delivery attempt as read' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.svc.markRead(rlsContextFromRequest(req), id);
  }
}
