import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ScheduleCandidateQueryDto, ScheduleQueryDto, WeeklyScheduleQueryDto } from '../contracts';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('candidates')
  @ApiOkResponse({ description: 'Schedule search candidates by date, route, or vessel' })
  getScheduleCandidates(@Query() query: ScheduleCandidateQueryDto) {
    return this.schedulesService.getScheduleCandidates(query);
  }

  @Get('weekly')
  @ApiOkResponse({ description: 'Weekly sailing schedules by date and optional route' })
  getWeeklySchedules(@Query() query: WeeklyScheduleQueryDto) {
    return this.schedulesService.getWeeklySchedules(query);
  }

  @Get()
  @ApiOkResponse({ description: 'Sailing schedules by route and date' })
  getSchedules(@Query() query: ScheduleQueryDto) {
    return this.schedulesService.getSchedules(query);
  }
}
