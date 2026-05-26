import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  portCode!: string;

  @ApiProperty()
  portName!: string;

  @ApiPropertyOptional({ nullable: true })
  regionName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude!: number | null;
}

export class TerminalDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  portId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  terminalCode!: string | null;

  @ApiProperty()
  terminalName!: string;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
  mapUrl!: string | null;
}

export class RouteSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '인천항' })
  departurePortName!: string;

  @ApiProperty({ example: '백령도' })
  arrivalPortName!: string;

  @ApiProperty({ example: '인천-백령' })
  operationRouteName!: string;

  @ApiPropertyOptional({ nullable: true, example: '인천-백령' })
  licenseRouteName!: string | null;

  @ApiProperty({ example: 'KOMSA' })
  provider!: string;
}

export class RouteStopDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  routeId!: string;

  @ApiProperty({ example: 1 })
  stopSequence!: number;

  @ApiPropertyOptional({ nullable: true })
  portCode!: string | null;

  @ApiProperty({ example: '소청도' })
  portName!: string;

  @ApiPropertyOptional({ nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude!: number | null;
}

export class VesselDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  vesselCode!: string | null;

  @ApiProperty({ example: '하모니플라워호' })
  vesselName!: string;

  @ApiPropertyOptional({ nullable: true })
  passengerCapacity!: number | null;

  @ApiPropertyOptional({ nullable: true })
  operatorName!: string | null;
}

