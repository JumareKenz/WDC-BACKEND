import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { UploadAttachmentDto } from './attachments.dto';
import { rlsContextFromRequest } from '../../common/rls/rls-request-context';
import type { AuthedRequest } from '../../common/auth/jwt-auth.guard';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(
    @Inject(AttachmentsService) private readonly service: AttachmentsService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an attachment (image, audio, or document)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: AuthedRequest,
    @Body() dto: UploadAttachmentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const actor = rlsContextFromRequest(req);
    const result = await this.service.upload(actor, dto, file);
    return result;
  }

  @Get('report/:reportId')
  @ApiOperation({ summary: 'List attachments for a report' })
  async listByReport(
    @Req() req: AuthedRequest,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    const actor = rlsContextFromRequest(req);
    return this.service.listByReport(actor, reportId);
  }
}
