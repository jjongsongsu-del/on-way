import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PortDto } from '../contracts';
import { PortsService } from './ports.service';

@ApiTags('ports')
@Controller('ports')
export class PortsController {
  constructor(private readonly portsService: PortsService) {}

  @Get()
  @ApiOkResponse({ description: 'Port list', type: PortDto, isArray: true })
  getPorts() {
    return this.portsService.getPorts();
  }
}

