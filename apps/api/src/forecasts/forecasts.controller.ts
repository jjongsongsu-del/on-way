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
}

