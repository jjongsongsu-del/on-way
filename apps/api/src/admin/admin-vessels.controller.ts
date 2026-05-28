import { Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VesselsService } from '../vessels/vessels.service';

type SyncVesselsBody = {
  maxPages?: number;
};

@ApiTags('admin')
@Controller('admin/vessels')
export class AdminVesselsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly vesselsService: VesselsService
  ) {}

  @Post('sync')
  @ApiOkResponse({ description: 'Collect passenger vessel details from KOMSA and upsert into DB' })
  syncVessels(@Body() body: SyncVesselsBody, @Headers('x-admin-token') adminToken?: string) {
    this.assertAdminToken(adminToken);
    const maxPages = clampPageLimit(body?.maxPages);
    return this.vesselsService.syncFromKomsa(maxPages);
  }

  private assertAdminToken(adminToken?: string) {
    const expected = this.configService.get<string>('ADMIN_SYNC_TOKEN');
    if (expected && adminToken !== expected) {
      throw new ForbiddenException({
        code: 'ADMIN_TOKEN_INVALID',
        message: 'Admin sync token is invalid',
        userMessage: '관리자 수집 권한을 확인해 주세요.'
      });
    }
  }
}

function clampPageLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 26;
  }

  return Math.max(1, Math.min(Math.trunc(value), 26));
}
