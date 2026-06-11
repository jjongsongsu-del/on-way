import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Get('features')
  @ApiOkResponse({ description: 'Island markers from VWorld WFS filtered by bbox' })
  getIslandFeatures(@Query('bbox') bbox: string, @Query('ldCpsgCode') ldCpsgCode?: string) {
    return this.islandsService.getIslandFeatures(bbox, ldCpsgCode);
  }

  @Get('wms')
  @ApiOkResponse({ description: 'Island WMS layer image proxied from VWorld' })
  async getIslandWms(
    @Query('bbox') bbox: string,
    @Query('width') width = '915',
    @Query('height') height = '640',
    @Res() response: Response
  ) {
    const image = await this.islandsService.getIslandWms({
      bbox,
      width: Number(width),
      height: Number(height)
    });

    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.send(Buffer.from(image.data));
  }

  @Get('base-tile')
  @ApiOkResponse({ description: 'VWorld base map tile proxied for web preview' })
  async getBaseMapTile(@Query('z') z: string, @Query('x') x: string, @Query('y') y: string, @Res() response: Response) {
    const image = await this.islandsService.getBaseMapTile({
      z: Number(z),
      x: Number(x),
      y: Number(y)
    });

    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(Buffer.from(image.data));
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Island detail from VWorld island information source' })
  getIsland(@Param('id') id: string) {
    return this.islandsService.getIsland(id);
  }
}
