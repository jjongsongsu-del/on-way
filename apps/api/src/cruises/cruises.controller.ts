import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CruisesService } from './cruises.service';

@ApiTags('cruises')
@Controller('cruises')
export class CruisesController {
  constructor(private readonly cruisesService: CruisesService) {}

  @Get('overview')
  @ApiOkResponse({ description: 'Cruise ports, upcoming schedules, and tour products' })
  getOverview(@Query('limit') limit?: string) {
    return this.cruisesService.getOverview({ limit: limit ? Number(limit) : undefined });
  }

  @Get('schedules')
  @ApiOkResponse({ description: 'Cruise schedule list' })
  getSchedules(
    @Query('portName') portName?: string,
    @Query('keyword') keyword?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string
  ) {
    return this.cruisesService.getSchedules({
      portName,
      keyword,
      from,
      to,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get('schedules/:id')
  @ApiOkResponse({ description: 'Cruise schedule detail' })
  getScheduleDetail(@Param('id') id: string) {
    return this.cruisesService.getScheduleDetail(id);
  }
}
