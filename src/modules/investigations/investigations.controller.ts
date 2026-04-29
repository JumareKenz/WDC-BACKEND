import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestigationsService } from './investigations.service';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import {
  CreateInvestigationDto,
  UpdateInvestigationDto,
  AddEvidenceDto,
  InvestigationResponseDto,
  EvidenceResponseDto,
  ListInvestigationsResponseDto,
  TimelineEntryDto,
} from './investigations.dto';

function reqId(req: AuthedRequest): string | null {
  const v = (req as AuthedRequest & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

@ApiTags('investigations')
@ApiBearerAuth()
@Controller('investigations')
export class InvestigationsController {
  constructor(@Inject(InvestigationsService) private readonly svc: InvestigationsService) {}

  @Post()
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new investigation case (director only)' })
  async create(
    @Body() dto: CreateInvestigationDto,
    @Req() req: AuthedRequest,
  ): Promise<InvestigationResponseDto> {
    return this.svc.create(rlsContextFromRequest(req), {
      title: dto.title,
      summary: dto.summary,
      priority: dto.priority,
      requestId: reqId(req),
    });
  }

  @Get()
  @Roles('director')
  @ApiOperation({ summary: 'List investigations with cursor pagination (director only)' })
  async list(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<ListInvestigationsResponseDto> {
    const result = await this.svc.list(rlsContextFromRequest(req), {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      items: result.items,
      nextCursor: result.nextCursor,
    };
  }

  @Get(':id')
  @Roles('director')
  @ApiOperation({ summary: 'Get investigation with evidence (director only)' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<InvestigationResponseDto> {
    const result = await this.svc.getById(rlsContextFromRequest(req), id);
    return {
      ...result,
      evidence: result.evidence,
    };
  }

  @Patch(':id')
  @Roles('director')
  @ApiOperation({ summary: 'Update investigation fields (director only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
    @Req() req: AuthedRequest,
  ): Promise<InvestigationResponseDto> {
    return this.svc.update(rlsContextFromRequest(req), id, dto, reqId(req));
  }

  @Post(':id/close')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Close an investigation (director only)' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<InvestigationResponseDto> {
    return this.svc.close(rlsContextFromRequest(req), id, reqId(req));
  }

  @Post(':id/reopen')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reopen a closed investigation (director only)' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<InvestigationResponseDto> {
    return this.svc.reopen(rlsContextFromRequest(req), id, reqId(req));
  }

  @Post(':id/evidence')
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add evidence to an investigation (director only)' })
  async addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddEvidenceDto,
    @Req() req: AuthedRequest,
  ): Promise<EvidenceResponseDto> {
    return this.svc.addEvidence(rlsContextFromRequest(req), id, {
      kind: dto.kind,
      refTable: dto.refTable,
      refId: dto.refId,
      note: dto.note,
      requestId: reqId(req),
    });
  }

  @Delete(':id/evidence/:evidenceId')
  @Roles('director')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove evidence from an investigation (director only)' })
  async removeEvidence(
    @Param('id', ParseUUIDPipe) investigationId: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.svc.removeEvidence(rlsContextFromRequest(req), investigationId, evidenceId, reqId(req));
  }

  @Get(':id/timeline')
  @Roles('director')
  @ApiOperation({ summary: 'Get investigation activity timeline (director only)' })
  async timeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<TimelineEntryDto[]> {
    return this.svc.timeline(rlsContextFromRequest(req), id);
  }
}
