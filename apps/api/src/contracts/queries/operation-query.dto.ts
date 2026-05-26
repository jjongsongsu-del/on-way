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

  @ApiPropertyOptional({ enum: SailingStatusCode })
  @IsOptional()
  @IsEnum(SailingStatusCode)
  status?: SailingStatusCode;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBooleanString()
  onlyDisrupted?: string;
}

export class TodayStatusQueryDto extends RouteSearchQueryDto {}

export class TomorrowForecastQueryDto extends RouteSearchQueryDto {}

