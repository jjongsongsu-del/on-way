import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IslandTripsService } from './island-trips.service';

@ApiTags('island-trips')
@Controller('island-trips')
export class IslandTripsController {
  constructor(private readonly islandTripsService: IslandTripsService) {}

  @Get('travel-info')
  @ApiOkResponse({ description: 'Island travel content merged from tourism, camping, and sea trip index APIs' })
  getTravelInfo(
    @Query('islandName') islandName: string,
    @Query('provinceName') provinceName?: string,
    @Query('cityName') cityName?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string
  ) {
    return this.islandTripsService.getTravelInfo({
      islandName,
      provinceName,
      cityName,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });
  }
}
