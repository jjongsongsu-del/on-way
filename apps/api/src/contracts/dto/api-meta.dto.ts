import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiProperty({ example: 'KOMSA' })
  source?: string;

  @ApiPropertyOptional({ example: true })
  cached?: boolean;

  @ApiProperty({ example: '2026-05-26T06:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: false })
  fallback?: boolean;

  @ApiPropertyOptional({ example: 'req_01JZ0000000000000000000000' })
  requestId?: string;
}

export class ApiErrorDto {
  @ApiProperty({ example: 'PUBLIC_API_UNAVAILABLE' })
  code!: string;

  @ApiProperty({ example: '운항 정보를 불러오지 못했습니다.' })
  message!: string;

  @ApiPropertyOptional({ example: '현재 외부 운항정보가 지연되고 있습니다.' })
  userMessage?: string;
}

