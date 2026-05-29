import type { ApiResponse, IslandSummary } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

const PREVIEW_ISLANDS: IslandSummary[] = [
  {
    id: 'baengnyeongdo',
    islandName: '백령도',
    provinceName: '인천광역시',
    cityName: '옹진군',
    address: '인천광역시 옹진군 백령면',
    latitude: 37.9661,
    longitude: 124.6306,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '서해 최북단 주요 도서로 인천 여객 항로와 함께 조회할 수 있는 대표 섬입니다.',
    source: 'MOCK',
    updatedAt: '2026-05-28T00:00:00.000Z'
  },
  {
    id: 'deokjeokdo',
    islandName: '덕적도',
    provinceName: '인천광역시',
    cityName: '옹진군',
    address: '인천광역시 옹진군 덕적면',
    latitude: 37.2279,
    longitude: 126.1485,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '서해 도서 여행과 정기 여객선 스케줄 탐색을 연결할 수 있는 섬입니다.',
    source: 'MOCK',
    updatedAt: '2026-05-28T00:00:00.000Z'
  },
  {
    id: 'ulleungdo',
    islandName: '울릉도',
    provinceName: '경상북도',
    cityName: '울릉군',
    address: '경상북도 울릉군',
    latitude: 37.4845,
    longitude: 130.9057,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '동해 대표 도서로 기상, 예보, 여객선 운항 변동 안내와 함께 보여주기 좋습니다.',
    source: 'MOCK',
    updatedAt: '2026-05-28T00:00:00.000Z'
  },
  {
    id: 'jejudo',
    islandName: '제주도',
    provinceName: '제주특별자치도',
    cityName: '제주시',
    address: '제주특별자치도',
    latitude: 33.4996,
    longitude: 126.5312,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: '여객선, 항공, 관광 정보를 확장하기 좋은 국내 최대 도서입니다.',
    source: 'MOCK',
    updatedAt: '2026-05-28T00:00:00.000Z'
  }
];

export type IslandSearchResult = ApiResponse<IslandSummary[]>;
export type IslandMapBounds = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

export async function fetchIslands(keyword?: string) {
  const response = await fetchIslandsResponse(keyword);
  return response.data;
}

export async function fetchIslandsResponse(keyword?: string): Promise<IslandSearchResult> {
  const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  try {
    return await getResponse<IslandSummary[]>(`/islands${params}`);
  } catch {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const data = normalizedKeyword
      ? PREVIEW_ISLANDS.filter((island) =>
          [island.islandName, island.provinceName, island.cityName, island.address]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedKeyword))
        )
      : PREVIEW_ISLANDS;

    return {
      data,
      meta: {
        source: 'preview-island-seed',
        cached: false,
        fallback: true,
        updatedAt: new Date().toISOString()
      }
    };
  }
}

export async function fetchIslandFeatures(bounds: IslandMapBounds): Promise<IslandSearchResult> {
  const bbox = boundsToBbox(bounds);

  try {
    return await getResponse<IslandSummary[]>(`/islands/features?bbox=${encodeURIComponent(bbox)}`);
  } catch {
    return {
      data: filterPreviewByBounds(bounds),
      meta: {
        source: 'preview-island-seed',
        cached: false,
        fallback: true,
        updatedAt: new Date().toISOString()
      }
    };
  }
}

export function createIslandWmsUrl(bounds: IslandMapBounds, width = 915, height = 640) {
  const params = new URLSearchParams({
    bbox: boundsToBbox(bounds),
    width: String(width),
    height: String(height)
  });

  return `${API_BASE_URL}/islands/wms?${params.toString()}`;
}

export async function fetchIsland(islandId: string) {
  return get<IslandSummary>(`/islands/${encodeURIComponent(islandId)}`);
}

async function get<T>(path: string) {
  const response = await getResponse<T>(path);
  return response.data;
}

async function getResponse<T>(path: string) {
  const response = await requestJson<ApiResponse<T>>(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.body;
}

function boundsToBbox(bounds: IslandMapBounds) {
  return [bounds.minLongitude, bounds.minLatitude, bounds.maxLongitude, bounds.maxLatitude].join(',');
}

function filterPreviewByBounds(bounds: IslandMapBounds) {
  return PREVIEW_ISLANDS.filter((island) => {
    if (typeof island.latitude !== 'number' || typeof island.longitude !== 'number') {
      return false;
    }

    return (
      island.latitude >= bounds.minLatitude &&
      island.latitude <= bounds.maxLatitude &&
      island.longitude >= bounds.minLongitude &&
      island.longitude <= bounds.maxLongitude
    );
  });
}
