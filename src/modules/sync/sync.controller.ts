import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import { SyncBatchDto, SyncBatchResponseDto } from './sync.dto';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  @Post('batch')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply a batch of ops atomically (best-effort per-op) with idempotency' })
  async batch(
    @Body() dto: SyncBatchDto,
    @Req() req: AuthedRequest,
  ): Promise<SyncBatchResponseDto> {
    return this.sync.applyBatch(rlsContextFromRequest(req), dto);
  }
}
