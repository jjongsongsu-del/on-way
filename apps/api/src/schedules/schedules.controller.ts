import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ScheduleQueryDto } from '../contracts';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOkResponse({ description: 'Sailing schedules by route and date' })
  getSchedules(@Query() query: ScheduleQueryDto) {
    return this.schedulesService.getSchedules(query);
  }
}

