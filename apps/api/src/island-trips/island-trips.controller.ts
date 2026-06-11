import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IslandTripsService } from './island-trips.service';

@ApiTags('island-trips')
@Controller('island-trips')
export class IslandTripsController {
  constructor(private readonly islandTripsService: IslandTripsService) {}

  @Get('recommendations')
  @ApiOkResponse({ description: 'Trip recommendations from curated public travel assets' })
  getRecommendations(
    @Query('regionKind') regionKind?: string,
    @Query('regionId') regionId?: string,
    @Query('regionName') regionName?: string,
    @Query('keyword') keyword?: string,
    @Query('assetId') assetId?: string,
    @Query('travelRegionId') travelRegionId?: string,
    @Query('islandId') islandId?: string,
    @Query('style') style?: string,
    @Query('duration') duration?: string,
    @Query('companions') companions?: string,
    @Query('transport') transport?: string,
    @Query('difficulty') difficulty?: string,
    @Query('budget') budget?: string,
    @Query('stayType') stayType?: string,
    @Query('facilities') facilities?: string,
    @Query('activities') activities?: string,
    @Query('limit') limit?: string
  ) {
    return this.islandTripsService.getRecommendations({
      regionKind,
      regionId,
      regionName,
      keyword,
      assetId,
      travelRegionId,
      islandId,
      style,
      duration,
      companions,
      transport,
      difficulty,
      budget,
      stayType,
      facilities: splitQueryList(facilities),
      activities: splitQueryList(activities),
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get('travel-assets/search')
  @ApiOkResponse({ description: 'Search curated public travel assets by keyword' })
  searchTravelAssets(@Query('keyword') keyword?: string, @Query('limit') limit?: string) {
    return this.islandTripsService.searchTravelAssets({
      keyword,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get('recommended-islands')
  @ApiOkResponse({ description: 'Curated recommended islands with source descriptions and ferry notes' })
  getRecommendedIslands(@Query('limit') limit?: string, @Query('travelRegionId') travelRegionId?: string, @Query('regionName') regionName?: string) {
    return this.islandTripsService.getRecommendedIslands({
      limit: limit ? Number(limit) : undefined,
      travelRegionId,
      regionName
    });
  }

  @Get('travel-info')
  @ApiOkResponse({ description: 'Island travel content merged from tourism, camping, and sea trip index APIs' })
  getTravelInfo(
    @Query('islandName') islandName: string,
    @Query('provinceName') provinceName?: string,
    @Query('cityName') cityName?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string
  ) {
    return this.islandTripsService.getTravelInfo({
      islandName,
      provinceName,
      cityName,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });
  }
}

function splitQueryList(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
