import type { ApiResponse, IslandTravelInfo } from '@badagil/shared';
import { API_BASE_URL } from './config';
import { requestJson } from './http';

export type IslandTravelInfoFilters = {
  islandName: string;
  provinceName?: string | null;
  cityName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function fetchIslandTravelInfo(filters: IslandTravelInfoFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await requestJson<ApiResponse<IslandTravelInfo>>(
    `${API_BASE_URL}/island-trips/travel-info?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return normalizeIslandTravelInfo(response.body.data);
}

function normalizeIslandTravelInfo(data: IslandTravelInfo): IslandTravelInfo {
  return {
    ...data,
    attractions: data.attractions ?? [],
    camps: data.camps ?? [],
    lodgings: data.lodgings ?? [],
    pensions: data.pensions ?? [],
    restaurants: data.restaurants ?? [],
    mudFlats: data.mudFlats ?? [],
    safetyIndexes: data.safetyIndexes ?? [],
    photos: data.photos ?? [],
    sourceSummary: {
      tourism: data.sourceSummary?.tourism ?? '관광정보 연결 준비',
      camping: data.sourceSummary?.camping ?? '캠핑정보 연결 준비',
      lodging: data.sourceSummary?.lodging ?? '숙박정보 연결 준비',
      pension: data.sourceSummary?.pension ?? '펜션정보 연결 준비',
      food: data.sourceSummary?.food ?? '식당정보 연결 준비',
      mudFlat: data.sourceSummary?.mudFlat ?? '갯벌정보 연결 준비',
      safety: data.sourceSummary?.safety ?? '안전정보 연결 준비',
      photo: data.sourceSummary?.photo ?? '사진정보 연결 준비'
    },
    apiStatus: {
      tourism: data.apiStatus?.tourism ?? { status: 'EMPTY', message: '관광정보가 존재하지 않습니다.' },
      camping: data.apiStatus?.camping ?? { status: 'EMPTY', message: '캠핑/차박정보가 존재하지 않습니다.' },
      lodging: data.apiStatus?.lodging ?? { status: 'EMPTY', message: '숙박정보가 존재하지 않습니다.' },
      pension: data.apiStatus?.pension ?? { status: 'EMPTY', message: '펜션정보가 존재하지 않습니다.' },
      food: data.apiStatus?.food ?? { status: 'EMPTY', message: '식당정보가 존재하지 않습니다.' },
      mudFlat: data.apiStatus?.mudFlat ?? { status: 'EMPTY', message: '갯벌정보가 존재하지 않습니다.' },
      safety: data.apiStatus?.safety ?? { status: 'EMPTY', message: '안전정보와 여행지수가 존재하지 않습니다.' },
      photo: data.apiStatus?.photo ?? { status: 'EMPTY', message: '관련 관광사진이 존재하지 않습니다.' }
    }
  };
}
