import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TomorrowForecastQueryDto } from '../contracts';
import { ForecastsService } from './forecasts.service';

@ApiTags('forecasts')
@Controller('forecasts')
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Get('tomorrow')
  @ApiOkResponse({ description: 'Tomorrow ferry operation forecast' })
  getTomorrowForecast(@Query() query: TomorrowForecastQueryDto) {
    return this.forecastsService.getTomorrowForecast(query);
  }

  @Get('marine')
  @ApiOkResponse({ description: 'Integrated marine weather, warning, tide, water temperature, and salinity forecast' })
  getMarineForecast(
    @Query('locationName') locationName?: string,
    @Query('nx') nx?: string,
    @Query('ny') ny?: string,
    @Query('stationCode') stationCode?: string,
    @Query('salinityStationCode') salinityStationCode?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string
  ) {
    return this.forecastsService.getMarineForecast({
      locationName,
      nx: nx ? Number(nx) : undefined,
      ny: ny ? Number(ny) : undefined,
      stationCode,
      salinityStationCode,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });
  }

  @Get('marine/locations')
  @ApiOkResponse({ description: 'Marine forecast location mapping table' })
  getMarineForecastLocations() {
    return this.forecastsService.getMarineForecastLocations();
  }
}
