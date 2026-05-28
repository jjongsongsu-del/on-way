import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VesselsService } from './vessels.service';

@ApiTags('vessels')
@Controller('vessels')
export class VesselsController {
  constructor(private readonly vesselsService: VesselsService) {}

  @Get('detail')
  @ApiOkResponse({ description: 'Passenger vessel detail by vessel name' })
  getVesselDetail(@Query('name') name: string) {
    return this.vesselsService.findDetailByName(name);
  }
}
