import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TodayStatusQueryDto } from '../contracts';
import { StatusesService } from './statuses.service';

@ApiTags('statuses')
@Controller('status')
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get('today')
  @ApiOkResponse({ description: 'Today ferry operation status' })
  getTodayStatus(@Query() query: TodayStatusQueryDto) {
    return this.statusesService.getTodayStatus(query);
  }
}

