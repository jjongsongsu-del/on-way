import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IslandsService } from './islands.service';

@ApiTags('islands')
@Controller('islands')
export class IslandsController {
  constructor(private readonly islandsService: IslandsService) {}

  @Get()
  @ApiOkResponse({ description: 'Island list from VWorld island information source' })
  getIslands(@Query('keyword') keyword?: string) {
    return this.islandsService.getIslands(keyword);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Island detail from VWorld island information source' })
  getIsland(@Param('id') id: string) {
    return this.islandsService.getIsland(id);
  }
}
