import type { MarineForecastLocation } from '@badagil/shared';

export type MarineForecastLocationMatch = MarineForecastLocation & {
  salinityStationCode: string;
};

export const MARINE_FORECAST_LOCATIONS: MarineForecastLocation[] = [
  {
    id: 'incheon-coast',
    label: '인천 연안',
    helper: '서해 중부 · 인천/백령/덕적',
    kind: 'SEA_AREA',
    aliases: ['인천', '인천항', '연안부두', '연평', '연평도'],
    nx: 55,
    ny: 124,
    stationCode: 'DT_0001',
    stationName: '인천',
    salinityGridCode: null,
    latitude: 37.45194,
    longitude: 126.59222,
    sourceNote: '조석/수온은 국립해양조사원 인천 조위관측소 기준입니다.'
  },
  {
    id: 'daechung-baengnyeong',
    label: '백령·대청 해역',
    helper: '서해 북부 도서',
    kind: 'ISLAND',
    aliases: ['백령도', '백령', '대청도', '대청', '소청도', '소청'],
    nx: 21,
    ny: 135,
    stationCode: 'DT_0036',
    stationName: '대청도',
    salinityGridCode: null,
    latitude: 37.825,
    longitude: 124.712,
    sourceNote: '백령·대청권은 대청도 조위관측소를 우선 사용합니다.'
  },
  {
    id: 'deokjeok-guleop',
    label: '덕적·굴업 해역',
    helper: '인천 남서 도서',
    kind: 'ISLAND',
    aliases: ['덕적도', '덕적', '굴업도', '굴업', '자월도', '자월', '이작도', '이작'],
    nx: 46,
    ny: 119,
    stationCode: 'DT_0038',
    stationName: '굴업도',
    salinityGridCode: null,
    latitude: 37.194,
    longitude: 125.995,
    sourceNote: '덕적·자월권은 가까운 굴업도 조위관측소를 사용합니다.'
  },
  {
    id: 'mokpo-coast',
    label: '목포 연안',
    helper: '서해 남부 · 신안/목포',
    kind: 'PORT',
    aliases: ['목포', '목포항', '신안', '암태', '비금', '도초'],
    nx: 50,
    ny: 67,
    stationCode: 'DT_0007',
    stationName: '목포',
    salinityGridCode: null,
    latitude: 34.77972,
    longitude: 126.37556,
    sourceNote: '목포항과 신안권 기본 기준점입니다.'
  },
  {
    id: 'heuksan-hongdo',
    label: '흑산·홍도 해역',
    helper: '서해 남부 먼바다 도서',
    kind: 'ISLAND',
    aliases: ['흑산', '흑산도', '홍도', '가거도', '만재도'],
    nx: 29,
    ny: 68,
    stationCode: 'DT_0035',
    stationName: '흑산도',
    salinityGridCode: null,
    latitude: 34.684,
    longitude: 125.435,
    sourceNote: '흑산·홍도권은 흑산도 조위관측소를 우선 사용합니다.'
  },
  {
    id: 'gunsan-coast',
    label: '군산 연안',
    helper: '서해 중남부',
    kind: 'PORT',
    aliases: ['군산', '군산항', '어청도', '선유도', '장항'],
    nx: 56,
    ny: 92,
    stationCode: 'DT_0018',
    stationName: '군산',
    salinityGridCode: null,
    latitude: 35.975,
    longitude: 126.563,
    sourceNote: '군산항 권역 기본 기준점입니다.'
  },
  {
    id: 'boryeong-coast',
    label: '보령·대천 연안',
    helper: '충남 서해 도서',
    kind: 'PORT',
    aliases: ['보령', '대천', '대천항', '원산도', '삽시도', '외연도', '효자도'],
    nx: 54,
    ny: 100,
    stationCode: 'DT_0025',
    stationName: '보령',
    salinityGridCode: null,
    latitude: 36.406,
    longitude: 126.486,
    sourceNote: '충남 도서권은 보령 조위관측소를 사용합니다.'
  },
  {
    id: 'wando-coast',
    label: '완도 연안',
    helper: '남해 서부 · 완도/청산',
    kind: 'PORT',
    aliases: ['완도', '완도항', '청산도', '보길도', '노화도', '소안도'],
    nx: 57,
    ny: 56,
    stationCode: 'DT_0027',
    stationName: '완도',
    salinityGridCode: null,
    latitude: 34.315,
    longitude: 126.759,
    sourceNote: '완도권 기본 조위관측소입니다.'
  },
  {
    id: 'jindo-coast',
    label: '진도 연안',
    helper: '서남해 도서',
    kind: 'PORT',
    aliases: ['진도', '팽목', '진도항', '하조도', '상조도', '관매도'],
    nx: 48,
    ny: 59,
    stationCode: 'DT_0028',
    stationName: '진도',
    salinityGridCode: null,
    latitude: 34.377,
    longitude: 126.308,
    sourceNote: '진도권 조석/수온 기준점입니다.'
  },
  {
    id: 'yeosu-coast',
    label: '여수 연안',
    helper: '남해 중부',
    kind: 'PORT',
    aliases: ['여수', '여수항', '금오도', '백야도', '돌산'],
    nx: 73,
    ny: 66,
    stationCode: 'DT_0016',
    stationName: '여수',
    salinityGridCode: null,
    latitude: 34.747,
    longitude: 127.765,
    sourceNote: '여수항과 남해 중부권 기본 기준점입니다.'
  },
  {
    id: 'geomundo',
    label: '거문도 해역',
    helper: '남해 외해',
    kind: 'ISLAND',
    aliases: ['거문도', '백도'],
    nx: 73,
    ny: 53,
    stationCode: 'DT_0031',
    stationName: '거문도',
    salinityGridCode: null,
    latitude: 34.028,
    longitude: 127.308,
    sourceNote: '거문도권은 거문도 조위관측소를 우선 사용합니다.'
  },
  {
    id: 'tongyeong-coast',
    label: '통영 연안',
    helper: '남해 동부 · 통영/거제',
    kind: 'PORT',
    aliases: ['통영', '통영항', '욕지도', '욕지', '한산도', '사량도', '매물도', '비진도'],
    nx: 87,
    ny: 68,
    stationCode: 'DT_0014',
    stationName: '통영',
    salinityGridCode: null,
    latitude: 34.827,
    longitude: 128.434,
    sourceNote: '통영항과 인근 섬 기본 기준점입니다.'
  },
  {
    id: 'geoje-coast',
    label: '거제 연안',
    helper: '남해 동부',
    kind: 'PORT',
    aliases: ['거제', '거제도', '장승포', '외도', '저도'],
    nx: 90,
    ny: 69,
    stationCode: 'DT_0029',
    stationName: '거제도',
    salinityGridCode: null,
    latitude: 34.801,
    longitude: 128.699,
    sourceNote: '거제권은 거제도 조위관측소를 사용합니다.'
  },
  {
    id: 'busan-coast',
    label: '부산 연안',
    helper: '남해 동부 · 부산',
    kind: 'PORT',
    aliases: ['부산', '부산항', '영도', '가덕도', '대마도'],
    nx: 98,
    ny: 76,
    stationCode: 'DT_0005',
    stationName: '부산',
    salinityGridCode: null,
    latitude: 35.096,
    longitude: 129.035,
    sourceNote: '부산항 기본 기준점입니다.'
  },
  {
    id: 'ulsan-coast',
    label: '울산 연안',
    helper: '동해 남부',
    kind: 'PORT',
    aliases: ['울산', '울산항', '방어진'],
    nx: 102,
    ny: 84,
    stationCode: 'DT_0020',
    stationName: '울산',
    salinityGridCode: null,
    latitude: 35.501,
    longitude: 129.387,
    sourceNote: '울산항 기본 기준점입니다.'
  },
  {
    id: 'pohang-coast',
    label: '포항 연안',
    helper: '동해 남부',
    kind: 'PORT',
    aliases: ['포항', '포항항', '구룡포'],
    nx: 102,
    ny: 94,
    stationCode: 'DT_0091',
    stationName: '포항',
    salinityGridCode: null,
    latitude: 36.051,
    longitude: 129.376,
    sourceNote: '포항항 기본 기준점입니다.'
  },
  {
    id: 'ulleung',
    label: '울릉도 해역',
    helper: '동해 도서',
    kind: 'ISLAND',
    aliases: ['울릉', '울릉도', '독도', '저동', '사동'],
    nx: 127,
    ny: 127,
    stationCode: 'DT_0013',
    stationName: '울릉도',
    salinityGridCode: null,
    latitude: 37.491,
    longitude: 130.913,
    sourceNote: '울릉도권은 울릉도 조위관측소를 우선 사용합니다.'
  },
  {
    id: 'jeju-coast',
    label: '제주 연안',
    helper: '제주 북부',
    kind: 'PORT',
    aliases: ['제주', '제주항', '우도'],
    nx: 52,
    ny: 38,
    stationCode: 'DT_0004',
    stationName: '제주',
    salinityGridCode: null,
    latitude: 33.527,
    longitude: 126.543,
    sourceNote: '제주항 기본 기준점입니다.'
  },
  {
    id: 'seogwipo-coast',
    label: '서귀포 연안',
    helper: '제주 남부',
    kind: 'PORT',
    aliases: ['서귀포', '서귀포항', '마라도', '가파도', '모슬포'],
    nx: 52,
    ny: 33,
    stationCode: 'DT_0010',
    stationName: '서귀포',
    salinityGridCode: null,
    latitude: 33.24,
    longitude: 126.561,
    sourceNote: '제주 남부권은 서귀포 조위관측소를 사용합니다.'
  }
];

export function getMarineForecastLocations() {
  return MARINE_FORECAST_LOCATIONS;
}

export function findMarineForecastLocation(params: { locationName?: string; latitude?: number; longitude?: number }): MarineForecastLocationMatch {
  if (Number.isFinite(params.latitude) && Number.isFinite(params.longitude)) {
    return toMatch(findNearestMarineForecastLocation(Number(params.latitude), Number(params.longitude)));
  }

  const normalized = normalizeText(params.locationName);
  if (!normalized) return toMatch(MARINE_FORECAST_LOCATIONS[0]);

  const direct = MARINE_FORECAST_LOCATIONS.map((location) => ({
    location,
    score: getAliasMatchScore(normalized, location)
  }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.location;

  return toMatch(direct ?? MARINE_FORECAST_LOCATIONS[0]);
}

function findNearestMarineForecastLocation(latitude: number, longitude: number) {
  return MARINE_FORECAST_LOCATIONS.reduce((nearest, location) => {
    if (location.latitude === null || location.longitude === null) return nearest;
    const distance = distanceSquared(latitude, longitude, location.latitude, location.longitude);
    const nearestDistance =
      nearest.latitude === null || nearest.longitude === null ? Number.POSITIVE_INFINITY : distanceSquared(latitude, longitude, nearest.latitude, nearest.longitude);
    return distance < nearestDistance ? location : nearest;
  }, MARINE_FORECAST_LOCATIONS[0]);
}

function toMatch(location: MarineForecastLocation): MarineForecastLocationMatch {
  return {
    ...location,
    salinityStationCode: location.salinityGridCode ?? ''
  };
}

function normalizeText(value?: string | null) {
  return value?.replace(/\s/g, '').toLowerCase() ?? '';
}

function getAliasMatchScore(normalized: string, location: MarineForecastLocation) {
  const baseScore = [location.label, location.stationName, ...location.aliases]
    .map((alias) => normalizeText(alias))
    .filter((alias) => alias && normalized.includes(alias))
    .reduce((best, alias) => Math.max(best, alias.length), 0);
  const specificityBonus = location.kind === 'ISLAND' ? 0.5 : location.kind === 'PORT' ? 0.25 : 0;
  return baseScore > 0 ? baseScore + specificityBonus : 0;
}

function distanceSquared(lat1: number, lon1: number, lat2: number, lon2: number) {
  return (lat1 - lat2) ** 2 + (lon1 - lon2) ** 2;
}
