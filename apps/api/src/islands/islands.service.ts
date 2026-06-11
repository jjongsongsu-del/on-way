import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { IslandSummary } from '@badagil/shared';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../cache/cache-policy';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../database/prisma.service';
import { getMarineForecastLocations } from '../forecasts/marine-forecast-location-map';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import { extractItems, makeStableId, pickNumber, pickString } from '../public-api/public-api-response.util';
import { VworldIslandApiClient } from '../public-api/clients/vworld-island-api.client';
import type { PublicApiResult } from '../public-api/types/public-api.types';

type UnknownRecord = Record<string, unknown>;
type Bbox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
};

@Injectable()
export class IslandsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly vworldIslandApiClient: VworldIslandApiClient
  ) {}

  async getIslands(keyword?: string) {
    const normalizedKeyword = keyword?.trim();
    const cached = await this.cacheService.remember(
      CACHE_KEYS.islands(normalizedKeyword),
      CACHE_TTL_SECONDS.ISLANDS,
      async () => this.fetchIslands(normalizedKeyword)
    );

    return toApiResponse(cached.value, cached);
  }

  async getIsland(islandId: string) {
    const cached = await this.cacheService.remember(CACHE_KEYS.island(islandId), CACHE_TTL_SECONDS.ISLANDS, async () => {
      const list = await this.fetchIslands();
      return this.createResult(list.data.find((island) => island.id === islandId) ?? null, list.meta.provider, list.meta.source);
    });

    if (!cached.value.data) {
      throw new NotFoundException({
        code: 'ISLAND_NOT_FOUND',
        message: 'Island was not found',
        userMessage: '?붿껌?????뺣낫瑜?李얠쓣 ???놁뒿?덈떎.'
      });
    }

    return toApiResponse(cached.value, cached);
  }

  async getIslandFeatures(bboxText: string, ldCpsgCode?: string) {
    const bbox = parseBbox(bboxText);
    const masterIslands = await this.fetchIslandMasters();
    const masterIslandsInBounds = masterIslands.filter((island) => isIslandInBbox(island, bbox));

    try {
      const response = await this.vworldIslandApiClient.getIslandFeatures({
        bbox: ldCpsgCode ? undefined : toVworldEpsg4326Bbox(bbox),
        ldCpsgCode: normalizeLegalDongCode(ldCpsgCode),
        maxFeatures: 1000,
        resultType: 'results'
      });
      const islands = extractItems(response).map((item) => this.toIsland(item)).filter((island) => island.islandName);
      const islandsInBounds = uniqueByIslandIdentity([...masterIslandsInBounds, ...uniqueById(islands).filter((island) => isIslandInBbox(island, bbox))]);

      if (islandsInBounds.length > 0) {
        return toApiResponse(this.createResult(islandsInBounds, 'VWORLD', 'local-island-master+vworld-island-wfs', 'json'));
      }
    } catch {
      // Local development and static preview can run without a VWorld key.
    }

    return toApiResponse(this.createResult(masterIslandsInBounds, 'LOCAL', 'local-island-master-bbox', 'json'));
  }

  async getIslandWms(params: { bbox: string; width: number; height: number }) {
    const bbox = parseBbox(params.bbox);

    return this.vworldIslandApiClient.getWmsImage({
      bbox: toVworldEpsg4326Bbox(bbox),
      width: clampInteger(params.width, 256, 1600, 915),
      height: clampInteger(params.height, 256, 1600, 640),
      format: 'image/png',
      transparent: 'true'
    });
  }

  async getBaseMapTile(params: { z: number; x: number; y: number }) {
    return this.vworldIslandApiClient.getBaseTileImage({
      z: clampInteger(params.z, 5, 13, 7),
      x: clampInteger(params.x, 0, Number.MAX_SAFE_INTEGER, 0),
      y: clampInteger(params.y, 0, Number.MAX_SAFE_INTEGER, 0),
      layer: 'Base'
    });
  }

  private async fetchIslands(keyword?: string): Promise<PublicApiResult<IslandSummary[]>> {
    const masterIslands = await this.fetchIslandMasters(keyword);

    try {
      const response = await this.vworldIslandApiClient.getIslandAttributes({
        islndsNm: keyword,
        ldCode: normalizeLegalDongCode(keyword),
        numOfRows: 100,
        pageNo: 1
      });
      const islands = extractItems(response).map((item) => this.toIsland(item)).filter((island) => island.islandName);

      if (islands.length > 0) {
        return this.createResult(uniqueByIslandIdentity([...masterIslands, ...islands]), 'VWORLD', 'local-island-master+vworld-island-attributes', 'json');
      }
    } catch {
      // Local development and static preview can run without a VWorld key.
    }

    return this.createResult(masterIslands, 'LOCAL', 'local-island-master', 'json');
  }

  private async fetchIslandMasters(keyword?: string): Promise<IslandSummary[]> {
    const normalizedKeyword = keyword?.trim();
    const where = normalizedKeyword
      ? {
          OR: [
            { islandName: { contains: normalizedKeyword, mode: 'insensitive' as const } },
            { legalDongName: { contains: normalizedKeyword, mode: 'insensitive' as const } },
            { islandTypeName: { contains: normalizedKeyword, mode: 'insensitive' as const } },
            { connectionTypeName: { contains: normalizedKeyword, mode: 'insensitive' as const } }
          ]
        }
      : undefined;

    const masters = await this.prismaService.islandMaster.findMany({
      where,
      orderBy: [{ islandName: 'asc' }, { legalDongName: 'asc' }],
      take: normalizedKeyword ? 200 : undefined
    });

    return masters.map((master) => this.toIslandMasterSummary(master));
  }

  private toIslandMasterSummary(master: {
    islandKey: string;
    legalDongCode: string;
    legalDongName: string;
    islandUniqueNo: string;
    islandName: string;
    islandTypeName: string | null;
    connectionTypeName: string | null;
    bridgeNames: string | null;
    referenceDate: Date;
    forecastLocationId?: string | null;
    forecastLocationName?: string | null;
    travelRegionId?: string | null;
    travelRegionName?: string | null;
  }): IslandSummary {
    const [provinceName, ...cityParts] = master.legalDongName.split(' ').filter(Boolean);
    const forecastLocation = master.forecastLocationId
      ? { id: master.forecastLocationId, label: master.forecastLocationName ?? master.forecastLocationId, latitude: null, longitude: null }
      : findForecastLocationForIslandMaster(master.islandName, master.legalDongName);
    const connectionText = [master.islandTypeName, master.connectionTypeName].filter(Boolean).join(' · ');
    const bridgeText = master.bridgeNames ? `?곌껐: ${master.bridgeNames}` : null;

    return {
      id: makeStableId('island-master', [master.islandKey]),
      islandName: master.islandName,
      provinceName: provinceName || null,
      cityName: cityParts.join(' ') || null,
      address: master.legalDongName || null,
      latitude: forecastLocation?.latitude ?? null,
      longitude: forecastLocation?.longitude ?? null,
      areaSquareMeters: null,
      coastlineLengthMeters: null,
      population: null,
      description: [connectionText, bridgeText, forecastLocation ? `예보 권역: ${forecastLocation.label}` : null].filter(Boolean).join(' / ') || null,
      islandTypeName: master.islandTypeName,
      connectionTypeName: master.connectionTypeName,
      bridgeNames: master.bridgeNames,
      legalDongCode: master.legalDongCode,
      islandUniqueNo: master.islandUniqueNo,
      forecastLocationId: forecastLocation?.id ?? null,
      forecastLocationName: forecastLocation?.label ?? null,
      travelRegionId: master.travelRegionId ?? null,
      travelRegionName: master.travelRegionName ?? null,
      source: 'LOCAL_ISLAND_MASTER',
      updatedAt: master.referenceDate.toISOString()
    };
  }

  private toIsland(item: UnknownRecord): IslandSummary {
    const islandName = pickString(item, ISLAND_FIELD_KEYS.name) ?? '';
    const provinceName = pickString(item, ISLAND_FIELD_KEYS.province);
    const cityName = pickString(item, ISLAND_FIELD_KEYS.city);
    const address = pickString(item, ISLAND_FIELD_KEYS.address) ?? [provinceName, cityName].filter(Boolean).join(' ');
    const latitude = pickNumber(item, ISLAND_FIELD_KEYS.latitude);
    const longitude = pickNumber(item, ISLAND_FIELD_KEYS.longitude);

    return {
      id: makeStableId('island', [
        pickString(item, ISLAND_FIELD_KEYS.idCode),
        islandName,
        provinceName,
        cityName
      ]),
      islandName,
      provinceName,
      cityName,
      address: address || null,
      latitude,
      longitude,
      areaSquareMeters: pickNumber(item, ISLAND_FIELD_KEYS.area),
      coastlineLengthMeters: pickNumber(item, ISLAND_FIELD_KEYS.coastline),
      population: pickNumber(item, ISLAND_FIELD_KEYS.population),
      description: pickString(item, ISLAND_FIELD_KEYS.description),
      source: 'VWORLD',
      updatedAt: new Date().toISOString()
    };
  }

  private createResult<T>(
    data: T,
    provider: PublicApiResult<T>['meta']['provider'],
    source: string,
    rawFormat: PublicApiResult<T>['meta']['rawFormat'] = provider === 'MOCK' ? 'mock' : 'json'
  ): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider,
        source,
        fetchedAt: new Date().toISOString(),
        rawFormat
      }
    };
  }
}

const ISLAND_FIELD_KEYS = {
  idCode: ['idCode', 'ldCode', 'ldCpsgCode', 'sigCd', 'emdCd', 'legalDongCode', '법정동코드', '도서고유번호'],
  name: ['islndsNm', 'islandsNm', 'islandNm', 'islndNm', 'isldNm', 'islandName', 'name', '도서명'],
  province: ['ctprvnNm', 'sidoNm', 'provNm', 'provinceName', '시도명'],
  city: ['signguNm', 'sggNm', 'sigunguNm', 'cityName', '시군구명'],
  address: ['addr', 'address', 'rnAdres', 'lnmAdres', 'legalDongName', '법정동명', '소재지', '주소'],
  latitude: ['lat', 'latitude', 'la', '위도', 'WGS84위도'],
  longitude: ['lon', 'lng', 'longitude', 'lo', '경도', 'WGS84경도'],
  area: ['area', 'ar', 'islandsAr', 'isldArea', '면적'],
  coastline: ['coastline', 'coastlineLen', 'coastLen', '해안선길이'],
  population: ['population', 'popltn', '인구'],
  description: ['rm', 'remark', 'description', '설명']
} as const;

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function uniqueByIslandIdentity(items: IslandSummary[]) {
  const map = new Map<string, IslandSummary>();

  items.forEach((item) => {
    const key = [item.islandName, item.provinceName, item.cityName].filter(Boolean).join('|') || item.id;
    if (!map.has(key)) map.set(key, item);
  });

  return [...map.values()];
}

function findForecastLocationForIslandMaster(islandName: string, legalDongName: string) {
  const normalizedIslandName = normalizeText(islandName);
  const normalizedHaystack = normalizeText(`${islandName} ${legalDongName}`);

  return getMarineForecastLocations()
    .map((location) => {
      const aliases = [location.label, location.helper, location.stationName, ...location.aliases].map((alias) => normalizeText(alias)).filter(Boolean);
      const bestAliasScore = aliases.reduce((best, alias) => {
        if (normalizedHaystack.includes(alias) || alias.includes(normalizedIslandName)) {
          return Math.max(best, alias.length);
        }

        return best;
      }, 0);

      const specificityBonus = location.kind === 'ISLAND' ? 0.5 : location.kind === 'PORT' ? 0.25 : 0;
      return {
        location,
        score: bestAliasScore > 0 ? bestAliasScore + specificityBonus : 0
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.location ?? null;
}

function normalizeText(value?: string | null) {
  return value?.replace(/\s/g, '').replace(/[도섬]/g, '').toLowerCase() ?? '';
}

function parseBbox(value?: string): Bbox {
  const numbers = value?.split(',').map((item) => Number(item.trim())) ?? [];

  if (numbers.length !== 4 || numbers.some((item) => !Number.isFinite(item))) {
    throw new BadRequestException({
      code: 'INVALID_BBOX',
      message: 'bbox must be minLongitude,minLatitude,maxLongitude,maxLatitude',
      userMessage: '吏??議고쉶 踰붿쐞媛 ?щ컮瑜댁? ?딆뒿?덈떎.'
    });
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = numbers;
  if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) {
    throw new BadRequestException({
      code: 'INVALID_BBOX_RANGE',
      message: 'bbox min values must be smaller than max values',
      userMessage: '吏??議고쉶 踰붿쐞媛 ?щ컮瑜댁? ?딆뒿?덈떎.'
    });
  }

  return { minLongitude, minLatitude, maxLongitude, maxLatitude };
}

function toVworldEpsg4326Bbox(bbox: Bbox) {
  return [bbox.minLatitude, bbox.minLongitude, bbox.maxLatitude, bbox.maxLongitude].join(',');
}

function normalizeLegalDongCode(value?: string) {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length >= 2 && digits.length <= 5 ? digits : undefined;
}

function isIslandInBbox(island: IslandSummary, bbox: Bbox) {
  if (typeof island.latitude !== 'number' || typeof island.longitude !== 'number') {
    return false;
  }

  return (
    island.latitude >= bbox.minLatitude &&
    island.latitude <= bbox.maxLatitude &&
    island.longitude >= bbox.minLongitude &&
    island.longitude <= bbox.maxLongitude
  );
}

function clampInteger(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
