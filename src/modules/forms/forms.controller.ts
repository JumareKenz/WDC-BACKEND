import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import {
  CreateFormDto,
  CreateFormVersionDto,
  FormResponseDto,
  FormVersionResponseDto,
  UpdateFormDto,
} from './forms.dto';

function reqId(req: AuthedRequest): string | null {
  const v = (req as AuthedRequest & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

@ApiTags('forms')
@ApiBearerAuth()
@Controller('forms')
export class FormsController {
  constructor(@Inject(FormsService) private readonly forms: FormsService) {}

  @Post()
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a draft form (director only)' })
  async create(
    @Body(new ValidationPipe({ expectedType: CreateFormDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: CreateFormDto,
    @Req() req: AuthedRequest,
  ): Promise<FormResponseDto> {
    return this.forms.create({
      actor: rlsContextFromRequest(req),
      slug: dto.slug,
      title: dto.title,
      titleHa: dto.titleHa,
      scopeKind: dto.scopeKind,
      scopeIds: dto.scopeIds,
      requestId: reqId(req),
    });
  }

  @Get()
  @ApiOperation({ summary: 'List forms (RLS-scoped)' })
  async list(@Req() req: AuthedRequest): Promise<FormResponseDto[]> {
    return this.forms.list(rlsContextFromRequest(req));
  }

  @Get('visible')
  @ApiOperation({ summary: 'Forms the caller can fill, computed from their RLS context' })
  async visible(@Req() req: AuthedRequest): Promise<FormResponseDto[]> {
    return this.forms.listVisible(rlsContextFromRequest(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one form by id' })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<FormResponseDto> {
    return this.forms.getById(rlsContextFromRequest(req), id);
  }

  @Patch(':id')
  @Roles('director')
  @ApiOperation({ summary: 'Update form metadata or scope (director only)' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ expectedType: UpdateFormDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: UpdateFormDto,
    @Req() req: AuthedRequest,
  ): Promise<FormResponseDto> {
    return this.forms.update(rlsContextFromRequest(req), id, dto, reqId(req));
  }

  @Post(':id/deploy')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deploy the latest version; freezes it (director only)' })
  async deploy(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<FormResponseDto> {
    return this.forms.deploy(rlsContextFromRequest(req), id, reqId(req));
  }

  @Post(':id/archive')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive a form; new reports cannot reference it (director only)' })
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<FormResponseDto> {
    return this.forms.archive(rlsContextFromRequest(req), id, reqId(req));
  }

  @Post(':id/versions')
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new draft version (director only)' })
  async createVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateFormVersionDto,
    @Req() req: AuthedRequest,
  ): Promise<FormVersionResponseDto> {
    return this.forms.createVersion(rlsContextFromRequest(req), id, dto.schema, reqId(req));
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions of a form' })
  async listVersions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<FormVersionResponseDto[]> {
    return this.forms.listVersions(rlsContextFromRequest(req), id);
  }

  @Get(':id/versions/:n')
  @ApiOperation({ summary: 'Get a specific version of a form' })
  async getVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('n', new ParseIntPipe()) n: number,
    @Req() req: AuthedRequest,
  ): Promise<FormVersionResponseDto> {
    return this.forms.getVersion(rlsContextFromRequest(req), id, n);
  }
}
