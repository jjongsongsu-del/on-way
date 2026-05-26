import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RouteSearchQueryDto } from '../contracts';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOkResponse({ description: 'Route list' })
  getRoutes() {
    return this.routesService.getRoutes();
  }

  @Get('search')
  @ApiOkResponse({ description: 'Search routes by departure and arrival' })
  searchRoutes(@Query() query: RouteSearchQueryDto) {
    return this.routesService.searchRoutes(query);
  }

  @Get(':id/stops')
  @ApiOkResponse({ description: 'Route stop sequence' })
  getRouteStops(@Param('id') id: string) {
    return this.routesService.getRouteStops(id);
  }
}
