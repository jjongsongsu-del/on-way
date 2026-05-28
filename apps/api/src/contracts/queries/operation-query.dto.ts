import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SailingStatusCode } from '@prisma/client';
import { IsBooleanString, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class RouteSearchQueryDto {
  @ApiProperty({ example: '인천항' })
  @IsString()
  departure!: string;

  @ApiProperty({ example: '백령도' })
  @IsString()
  arrival!: string;
}

export class ScheduleQueryDto extends RouteSearchQueryDto {
  @ApiProperty({ example: '2026-05-26' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '2026-05-26' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '섬사랑12호' })
  @IsOptional()
  @IsString()
  vesselName?: string;

  @ApiPropertyOptional({ enum: SailingStatusCode })
  @IsOptional()
  @IsEnum(SailingStatusCode)
  status?: SailingStatusCode;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBooleanString()
  onlyDisrupted?: string;
}

export class ScheduleCandidateQueryDto {
  @ApiProperty({ example: '2026-05-26' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '인천' })
  @IsOptional()
  @IsString()
  departure?: string;

  @ApiPropertyOptional({ example: '백령' })
  @IsOptional()
  @IsString()
  arrival?: string;

  @ApiPropertyOptional({ example: '코리아프라이드' })
  @IsOptional()
  @IsString()
  vesselName?: string;
}

export class WeeklyScheduleQueryDto {
  @ApiProperty({ example: '2026-05-26' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '2026-05-26' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '인천' })
  @IsOptional()
  @IsString()
  departure?: string;

  @ApiPropertyOptional({ example: '백령' })
  @IsOptional()
  @IsString()
  arrival?: string;

  @ApiPropertyOptional({ example: '코리아프라이드' })
  @IsOptional()
  @IsString()
  vesselName?: string;
}

export class TodayStatusQueryDto extends RouteSearchQueryDto {}

export class TomorrowForecastQueryDto extends RouteSearchQueryDto {}
