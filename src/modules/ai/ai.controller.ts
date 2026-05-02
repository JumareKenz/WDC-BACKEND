import { Controller, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { AiService } from './ai.service';
import { AskAiDto, AiQueryParams } from './ai.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('ask')
  @Roles('director')
  async ask(
    @Body() dto: AskAiDto,
    @Query() params: AiQueryParams,
    @Req() req: { user: { userId: string; role: string; lgaId?: string; wardId?: string } },
  ) {
    return this.ai.ask(dto, params, req.user);
  }
}