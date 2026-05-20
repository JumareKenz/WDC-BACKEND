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
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateUserDto,
  CreateUserResponseDto,
  ListUsersQueryDto,
  UpdateUserAssignmentDto,
  UserResponseDto,
} from './users.dto';
import { UsersService } from './users.service';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';

function reqId(req: AuthedRequest): string | null {
  const v = (req as AuthedRequest & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post()
  @Roles('director')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a user; returns a one-time enrolment token (director only)' })
  async create(
    @Body(new ValidationPipe({ expectedType: CreateUserDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: CreateUserDto,
    @Req() req: AuthedRequest,
  ): Promise<CreateUserResponseDto> {
    const result = await this.users.create({
      actor: rlsContextFromRequest(req),
      role: dto.role,
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      lgaId: dto.lgaId,
      wardId: dto.wardId,
      requestId: reqId(req),
    });
    return {
      ...result,
      enrolmentExpiresAt: result.enrolmentExpiresAt.toISOString(),
    };
  }

  @Get()
  @Roles('director')
  @ApiOperation({ summary: 'List users (director only)' })
  async list(
    @Query(new ValidationPipe({ expectedType: ListUsersQueryDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) q: ListUsersQueryDto,
    @Req() req: AuthedRequest,
  ) {
    return this.users.list(rlsContextFromRequest(req), {
      role: q.role,
      lgaId: q.lgaId,
      wardId: q.wardId,
      cursor: q.cursor,
      limit: q.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user by id (RLS-scoped)' })
  async get(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<UserResponseDto> {
    return this.users.getById(rlsContextFromRequest(req), id);
  }

  @Patch(':id/assignment')
  @Roles('director')
  @ApiOperation({ summary: 'Reassign a user to a different LGA / ward (director only)' })
  async updateAssignment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ expectedType: UpdateUserAssignmentDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: UpdateUserAssignmentDto,
    @Req() req: AuthedRequest,
  ): Promise<UserResponseDto> {
    return this.users.updateAssignment(
      rlsContextFromRequest(req),
      id,
      { lgaId: dto.lgaId ?? null, wardId: dto.wardId ?? null },
      reqId(req),
    );
  }

  @Post(':id/suspend')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend a user (director only)' })
  async suspend(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<UserResponseDto> {
    return this.users.setStatus(rlsContextFromRequest(req), id, 'suspended', reqId(req));
  }

  @Post(':id/reactivate')
  @Roles('director')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reactivate a suspended user (director only)' })
  async reactivate(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<UserResponseDto> {
    return this.users.setStatus(rlsContextFromRequest(req), id, 'active', reqId(req));
  }

  @Delete(':id')
  @Roles('director')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a user (director only)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthedRequest): Promise<void> {
    await this.users.softDelete(rlsContextFromRequest(req), id, reqId(req));
  }
}
