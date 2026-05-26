import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastStatusCode, RiskLevel, SailingStatusCode } from '@prisma/client';
import { RouteSummaryDto } from './domain.dto';

export class SailingScheduleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '2026-05-26' })
  sailingDate!: string;

  @ApiProperty({ example: '08:30' })
  departureTime!: string;

  @ApiProperty({ example: '인천항' })
  departurePortName!: string;

  @ApiProperty({ example: '백령도' })
  arrivalPortName!: string;

  @ApiPropertyOptional({ nullable: true })
  routeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  vesselId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '하모니플라워호' })
  vesselName!: string | null;

  @ApiProperty({ enum: SailingStatusCode, example: SailingStatusCode.NORMAL })
  status!: SailingStatusCode;

  @ApiPropertyOptional({ nullable: true })
  controlReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  passengerCapacity!: number | null;
}

export class TodayStatusSummaryDto {
  @ApiProperty({ type: RouteSummaryDto })
  route!: RouteSummaryDto;

  @ApiProperty({ enum: SailingStatusCode, example: SailingStatusCode.NORMAL })
  status!: SailingStatusCode;

  @ApiPropertyOptional({ type: SailingScheduleSummaryDto, nullable: true })
  nextDeparture!: SailingScheduleSummaryDto | null;

  @ApiProperty({ example: '2026-05-26T06:00:00.000Z' })
  updatedAt!: string;
}

export class TomorrowForecastSummaryDto {
  @ApiProperty({ type: RouteSummaryDto })
  route!: RouteSummaryDto;

  @ApiProperty({ enum: ForecastStatusCode, example: ForecastStatusCode.CAUTION })
  status!: ForecastStatusCode;

  @ApiPropertyOptional({ nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  weatherSummary!: string | null;

  @ApiProperty({ enum: RiskLevel, example: RiskLevel.MEDIUM })
  riskLevel!: RiskLevel;

  @ApiProperty({ example: '2026-05-26T06:00:00.000Z' })
  updatedAt!: string;
}

