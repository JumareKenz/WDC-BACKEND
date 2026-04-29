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
import type { ConfigService } from '@nestjs/config';
import { ConfigService as ConfigServiceClass } from '@nestjs/config';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import {
  CreateReportDto,
  ReportOpResponseDto,
  ReportResponseDto,
  ReturnReportDto,
  SetFieldDto,
} from './reports.dto';
import type { AppConfig } from '../../config/configuration';
import type { ReportState } from './report-projection';

function reqId(req: AuthedRequest): string | null {
  const v = (req as AuthedRequest & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

function toResponse(row: {
  id: string;
  form_version_id: string;
  ward_id: string;
  submitted_by: string;
  submission_method: 'amira' | 'wizard' | 'snap';
  state: ReportState;
  sealed_at: Date | null;
  canonical: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}): ReportResponseDto {
  return {
    id: row.id,
    formVersionId: row.form_version_id,
    wardId: row.ward_id,
    submittedBy: row.submitted_by,
    submissionMethod: row.submission_method,
    state: row.state,
    sealedAt: row.sealed_at?.toISOString() ?? null,
    canonical: row.canonical,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(ConfigServiceClass) private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a draft report against a deployed form_version' })
  async create(@Body() dto: CreateReportDto, @Req() req: AuthedRequest): Promise<ReportResponseDto> {
    const row = await this.reports.create({
      actor: rlsContextFromRequest(req),
      formVersionId: dto.formVersionId,
      submissionMethod: dto.submissionMethod,
      wardId: dto.wardId,
    });
    return toResponse(row);
  }

  @Get()
  @ApiOperation({ summary: 'List reports (RLS-scoped)' })
  async list(
    @Query('state') state: ReportState | undefined,
    @Req() req: AuthedRequest,
  ): Promise<ReportResponseDto[]> {
    const rows = await this.reports.list(rlsContextFromRequest(req), { state });
    return rows.map(toResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one report' })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<ReportResponseDto> {
    const row = await this.reports.getById(rlsContextFromRequest(req), id);
    return toResponse(row);
  }

  @Get(':id/ops')
  @ApiOperation({ summary: 'List the append-only op log for a report' })
  async ops(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<ReportOpResponseDto[]> {
    const rows = await this.reports.listOps(rlsContextFromRequest(req), id);
    return rows.map((r) => ({
      opId: r.op_id,
      opKind: r.op_kind,
      actorUserId: r.actor_user_id,
      deviceId: r.device_id,
      wallClockTs: r.wall_clock_ts.toISOString(),
      serverSeq: r.server_seq,
      payload: r.payload,
    }));
  }

  @Post(':id/fields')
  @HttpCode(200)
  @ApiOperation({ summary: 'Append a field_set op (editable states only)' })
  async setField(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetFieldDto,
    @Req() req: AuthedRequest,
  ): Promise<ReportResponseDto> {
    const row = await this.reports.setField({
      actor: rlsContextFromRequest(req),
      reportId: id,
      payload: {
        key: dto.key,
        value: dto.value,
        source: dto.source,
        confidence: dto.confidence ?? null,
      },
      opId: dto.opId,
      wallClockTs: dto.wallClockTs,
      requestId: reqId(req),
    });
    return toResponse(row);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit the draft (secretary)' })
  async submit(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<ReportResponseDto> {
    return toResponse(
      await this.reports.transition({
        actor: rlsContextFromRequest(req),
        reportId: id,
        transition: 'submit',
        requestId: reqId(req),
      }),
    );
  }

  @Post(':id/open-review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Coordinator opens review on a submitted report' })
  async openReview(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<ReportResponseDto> {
    return toResponse(
      await this.reports.transition({
        actor: rlsContextFromRequest(req),
        reportId: id,
        transition: 'open_review',
        requestId: reqId(req),
      }),
    );
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Coordinator approves a report under review' })
  async approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<ReportResponseDto> {
    return toResponse(
      await this.reports.transition({
        actor: rlsContextFromRequest(req),
        reportId: id,
        transition: 'approve',
        requestId: reqId(req),
      }),
    );
  }

  @Post(':id/return')
  @HttpCode(200)
  @ApiOperation({ summary: 'Coordinator returns a report under review with notes' })
  async returnReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReturnReportDto,
    @Req() req: AuthedRequest,
  ): Promise<ReportResponseDto> {
    return toResponse(
      await this.reports.transition({
        actor: rlsContextFromRequest(req),
        reportId: id,
        transition: 'return',
        notes: dto.notes,
        requestId: reqId(req),
      }),
    );
  }

  @Post(':id/edit-returned')
  @HttpCode(200)
  @ApiOperation({ summary: 'Secretary moves a returned report back to draft to edit' })
  async editReturned(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<ReportResponseDto> {
    return toResponse(
      await this.reports.transition({
        actor: rlsContextFromRequest(req),
        reportId: id,
        transition: 'edit_returned',
        requestId: reqId(req),
      }),
    );
  }

  @Post('seal-due')
  @Roles('director', 'system')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger the sealing pass (admin / scheduler)' })
  async sealDue(@Req() req: AuthedRequest): Promise<{ sealed: number }> {
    const graceDays = this.config.get('reports', { infer: true }).sealGraceDays;
    return this.reports.runSealingPass({ graceDays, requestId: reqId(req) });
  }
}
