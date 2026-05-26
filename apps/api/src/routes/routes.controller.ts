import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RouteSearchQueryDto, RouteStopDto, RouteSummaryDto } from '../contracts';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOkResponse({ description: 'Route list', type: RouteSummaryDto, isArray: true })
  getRoutes() {
    return this.routesService.getRoutes();
  }

  @Get('search')
  @ApiOkResponse({ description: 'Search routes by departure and arrival', type: RouteSummaryDto, isArray: true })
  searchRoutes(@Query() query: RouteSearchQueryDto) {
    return this.routesService.searchRoutes(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Route detail', type: RouteSummaryDto })
  getRoute(@Param('id') id: string) {
    return this.routesService.getRoute(id);
  }

  @Get(':id/stops')
  @ApiOkResponse({ description: 'Route stop sequence', type: RouteStopDto, isArray: true })
  getRouteStops(@Param('id') id: string) {
    return this.routesService.getRouteStops(id);
  }
}
