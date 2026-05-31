import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import type { MarineForecastApiStatus, MarineForecastLocation, MarineForecastOverview, RiskLevel } from '@badagil/shared';
import { AlertTriangle, CloudSun, Droplets, RefreshCcw, Search, Thermometer, Waves, Wind, X } from 'lucide-react-native';
import { fetchMarineForecast, fetchMarineForecastLocations } from '@/api/forecasts';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';

const fallbackForecastLocations: MarineForecastLocation[] = [
  {
    id: 'incheon-coast',
    label: '인천 연안',
    helper: '서해 중부',
    kind: 'SEA_AREA',
    aliases: ['인천', '백령도', '덕적도'],
    nx: 55,
    ny: 124,
    stationCode: 'DT_0001',
    stationName: '인천',
    salinityGridCode: null,
    latitude: 37.45194,
    longitude: 126.59222,
    sourceNote: '기본 예보 기준점입니다.'
  }
];

export default function ForecastScreen() {
  const routeParams = useLocalSearchParams();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const locationsQuery = useQuery({
    queryKey: ['marine-forecast-locations'],
    queryFn: fetchMarineForecastLocations,
    staleTime: 24 * 60 * 60 * 1000
  });
  const forecastLocations = locationsQuery.data?.length ? locationsQuery.data : fallbackForecastLocations;
  const selectedLocation =
    forecastLocations.find((location) => location.id === selectedLocationId) ?? forecastLocations[0] ?? fallbackForecastLocations[0];
  const activeLocationName = submittedKeyword || selectedLocation.label;
  const isSearchMode = submittedKeyword.length > 0;
  const marineForecastQuery = useQuery({
    queryKey: [
      'marine-forecast',
      activeLocationName,
      isSearchMode ? 'search' : selectedLocation.nx,
      isSearchMode ? 'search' : selectedLocation.ny,
      isSearchMode ? 'search' : selectedLocation.stationCode
    ],
    queryFn: () =>
      isSearchMode
        ? fetchMarineForecast({ locationName: activeLocationName })
        : fetchMarineForecast({
            locationName: selectedLocation.label,
            nx: selectedLocation.nx,
            ny: selectedLocation.ny,
            stationCode: selectedLocation.stationCode,
            salinityStationCode: selectedLocation.salinityGridCode ?? ''
          }),
    staleTime: 10 * 60 * 1000
  });

  const forecast = marineForecastQuery.data;
  const primaryMetrics = useMemo(() => buildPrimaryMetrics(forecast), [forecast]);
  const forecastTimeline = useMemo(() => buildForecastTimeline(forecast), [forecast]);
  const riskInsight = useMemo(() => buildRiskInsight(forecast), [forecast]);
  const tideTimeline = useMemo(() => buildTideTimeline(forecast), [forecast]);

  useEffect(() => {
    const locationName = getRouteParam(routeParams.locationName);
    if (!locationName) return;
    setSearchKeyword(locationName);
    setSubmittedKeyword(locationName);
  }, [routeParams.locationName]);

  const runSearch = () => {
    const keyword = searchKeyword.trim();
    if (!keyword) return;
    setSubmittedKeyword(keyword);
  };

  const clearSearch = () => {
    setSearchKeyword('');
    setSubmittedKeyword('');
  };

  return (
    <Screen
      title="예보"
      subtitle="날씨, 특보, 조석, 수온, 염분을 함께 보고 출항 전 위험을 확인해요."
      mascotSource={require('../../assets/mascot/boogi_bg4.png')}
    >
      <MascotBanner
        eyebrow="통합 해양 예보"
        title="부기가 바다 상태를 한 번에 모아볼게요"
        description="기상청과 해양수산부 API를 연결해 섬 여행과 여객선 이용 전 확인할 정보를 정리합니다."
        imageSource={require('../../assets/mascot/boogi-forecast.png')}
        tone="amber"
      />

      <View style={styles.searchPanel}>
        <View style={styles.searchBox}>
          <Search color={colors.primary} size={20} />
          <TextInput
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={runSearch}
            placeholder="섬 또는 항구를 입력하세요"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchKeyword ? (
            <Pressable accessibilityRole="button" onPress={clearSearch} style={styles.clearButton}>
              <X color={colors.muted} size={17} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={runSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>검색</Text>
        </Pressable>
        {submittedKeyword ? (
          <Text style={styles.searchHint}>`{submittedKeyword}` 기준으로 가장 가까운 기상 격자와 해양 관측소를 자동 매칭했습니다.</Text>
        ) : (
          <Text style={styles.searchHint}>예: 진도, 백령도, 덕적도, 완도항, 울릉도</Text>
        )}
      </View>

      <View style={styles.locationPanel}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>조회 권역</Text>
            <Text style={styles.secondary}>항구와 가까운 해역을 선택하면 해당 좌표와 관측소 기준으로 조회합니다.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => marineForecastQuery.refetch()} style={styles.refreshButton}>
            <RefreshCcw color={colors.primary} size={18} />
          </Pressable>
        </View>
        <View style={styles.locationGrid}>
          {forecastLocations.map((location) => {
            const selected = selectedLocation.id === location.id;

            return (
              <Pressable
                key={location.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedLocationId(location.id);
                  setSubmittedKeyword('');
                  setSearchKeyword('');
                }}
                style={[styles.locationButton, selected && styles.locationButtonSelected]}
              >
                <Text style={[styles.locationLabel, selected && styles.locationLabelSelected]}>{location.label}</Text>
                <Text style={[styles.locationHelper, selected && styles.locationHelperSelected]}>{location.helper}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.mappingNote}>{selectedLocation.sourceNote}</Text>
      </View>

      <View style={styles.weatherCard}>
        <View style={styles.weatherIcon}>
          <CloudSun color={colors.primary} size={28} />
        </View>
        <View style={styles.weatherCopy}>
          <View style={styles.weatherTitleRow}>
            <Text style={styles.weatherTitle}>{forecast?.locationName ?? selectedLocation.label}</Text>
            <StatusPill label={riskLabel(forecast?.riskLevel)} tone={riskTone(forecast?.riskLevel)} />
          </View>
          <Text style={styles.weatherText}>{forecast?.summary ?? '예보 정보를 불러오는 중입니다.'}</Text>
        </View>
      </View>

      {marineForecastQuery.isFetching ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.secondary}>5개 날씨·해양 API를 통합 조회하는 중입니다.</Text>
        </View>
      ) : null}
      {marineForecastQuery.isError ? (
        <ForecastFailurePanel
          locationName={activeLocationName}
          onRetry={() => marineForecastQuery.refetch()}
          onClearSearch={submittedKeyword ? clearSearch : undefined}
        />
      ) : null}

      <View style={styles.metricGrid}>
        {primaryMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <View key={metric.label} style={styles.metric}>
              <View style={[styles.metricIcon, { backgroundColor: `${metric.color}16` }]}>
                <Icon color={metric.color} size={18} />
              </View>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {metric.value}
              </Text>
              <Text style={styles.metricSource} numberOfLines={1}>
                {metric.source}
              </Text>
            </View>
          );
        })}
      </View>

      <InfoCard title="운항 위험 점수" eyebrow="출항 전 체크">
        <View style={styles.riskScoreCard}>
          <View style={styles.riskScoreHeader}>
            <View>
              <Text style={styles.riskScoreValue}>{riskInsight.score}</Text>
              <Text style={styles.riskScoreUnit}>/ 100</Text>
            </View>
            <View style={styles.riskScoreLabel}>
              <StatusPill label={riskInsight.label} tone={riskInsight.tone} />
              <Text style={styles.riskRecommendation}>{riskInsight.recommendation}</Text>
            </View>
          </View>
          <View style={styles.riskProgressTrack}>
            <View style={[styles.riskProgressFill, { width: `${riskInsight.score}%`, backgroundColor: riskInsight.color }]} />
          </View>
          <View style={styles.riskReasonList}>
            {riskInsight.reasons.map((reason) => (
              <View key={reason} style={styles.riskReasonItem}>
                <AlertTriangle color={riskInsight.color} size={15} />
                <Text style={styles.riskReasonText}>{reason}</Text>
              </View>
            ))}
          </View>
          <View style={styles.riskDetailGrid}>
            {riskInsight.details.map((detail) => (
              <View key={detail.label} style={styles.riskDetailItem}>
                <Text style={styles.riskDetailLabel}>{detail.label}</Text>
                <Text style={styles.riskDetailValue} numberOfLines={1}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </InfoCard>

      <InfoCard title="시간대별 예보" eyebrow="출발 시간 판단">
        <ApiStatusNotice status={forecast?.apiStatus.shortTerm} />
        {forecastTimeline.length ? (
          <View style={styles.timelineList}>
            {forecastTimeline.map((item) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineTimeBox}>
                  <Text style={styles.timelineTime}>{item.timeLabel}</Text>
                  <Text style={styles.timelineDate}>{item.dateLabel}</Text>
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>{item.sky || item.rain || '예보 확인'}</Text>
                  <View style={styles.timelineMetaRow}>
                    <Text style={styles.timelineMeta}>{item.temp}</Text>
                    <Text style={styles.timelineMeta}>{item.wind}</Text>
                    <Text style={styles.timelineMeta}>{item.wave}</Text>
                  </View>
                </View>
                <StatusPill label={item.riskLabel} tone={item.riskTone} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.secondary}>시간대별 예보 데이터가 아직 없습니다.</Text>
        )}
      </InfoCard>

      <InfoCard title="단기예보" eyebrow={forecast?.sourceSummary.shortTerm ?? '기상청'}>
        <ApiStatusNotice status={forecast?.apiStatus.shortTerm} />
        {forecast?.shortTermForecasts.length ? (
          <View style={styles.forecastGrid}>
            {forecast.shortTermForecasts.slice(0, 8).map((item) => (
              <View key={item.id} style={styles.forecastItem}>
                <Text style={styles.forecastItemLabel}>{item.label}</Text>
                <Text style={styles.forecastItemValue}>
                  {item.value}
                  {item.unit ? ` ${item.unit}` : ''}
                </Text>
                <Text style={styles.forecastItemTime}>{formatForecastTime(item.forecastDate, item.forecastTime)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </InfoCard>

      <InfoCard title="기상특보" eyebrow={forecast?.sourceSummary.warning ?? '기상청'}>
        <ApiStatusNotice status={forecast?.apiStatus.warning} />
        {forecast?.weatherWarnings.length ? (
          <View style={styles.list}>
            {forecast.weatherWarnings.map((warning) => (
              <View key={warning.id} style={styles.warningItem}>
                <AlertTriangle color={colors.warning} size={18} />
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle}>{warning.title}</Text>
                  <Text style={styles.listMeta}>{[warning.areaName, warning.issuedAt].filter(Boolean).join(' · ') || '전국 특보'}</Text>
                  <Text style={styles.listDescription} numberOfLines={3}>
                    {warning.message}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </InfoCard>

      <InfoCard title="조석 타임라인" eyebrow="만조·간조 흐름">
        <ApiStatusNotice status={forecast?.apiStatus.tide} />
        {tideTimeline.length ? (
          <View style={styles.tideTimelineList}>
            {tideTimeline.map((item) => (
              <View key={item.id} style={styles.tideTimelineItem}>
                <View style={styles.tideTimeBox}>
                  <Text style={styles.tideTime}>{item.timeLabel}</Text>
                  <Text style={styles.tideDate}>{item.dateLabel}</Text>
                </View>
                <View style={styles.tideTimelineCopy}>
                  <View style={styles.tideTitleRow}>
                    <Text style={styles.tideTitle}>{item.eventType}</Text>
                    <Text style={styles.tideStation}>{item.stationName}</Text>
                  </View>
                  <View style={styles.tideBarTrack}>
                    <View
                      style={[
                        styles.tideBarFill,
                        {
                          width: `${item.widthPercent}%`,
                          backgroundColor: item.tone === 'high' ? colors.primary : colors.mint
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.tideLevel}>{item.levelLabel}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.secondary}>조석 타임라인 데이터가 아직 없습니다.</Text>
        )}
      </InfoCard>

      <InfoCard title="조석·수온·염분" eyebrow="해양수산부·국립해양조사원">
        <View style={styles.marineSection}>
          <MarineList
            title="만조·간조"
            status={forecast?.apiStatus.tide}
            items={forecast?.tideForecasts.map((item) => ({
              id: item.id,
              title: item.eventType ?? '조석',
              meta: [item.stationName, item.eventTime].filter(Boolean).join(' · '),
              value: item.tideLevel ? `${item.tideLevel} cm` : '수위 확인 필요'
            }))}
          />
          <MarineList
            title="실측 수온"
            status={forecast?.apiStatus.waterTemperature}
            items={forecast?.waterTemperatures.map((item) => ({
              id: item.id,
              title: item.stationName ?? '관측소',
              meta: item.observedAt ?? '관측시간 확인 필요',
              value: item.temperature ? `${item.temperature} °C` : '수온 확인 필요'
            }))}
          />
          <MarineList
            title="염분"
            status={forecast?.apiStatus.salinity}
            items={forecast?.salinities.map((item) => ({
              id: item.id,
              title: item.stationName ?? '관측소',
              meta: item.observedAt ?? '관측시간 확인 필요',
              value: item.salinity ?? '염분 확인 필요'
            }))}
          />
        </View>
      </InfoCard>
    </Screen>
  );
}

function ApiStatusNotice({ status }: { status?: MarineForecastApiStatus }) {
  if (!status || status.status === 'OK') return null;
  return <Text style={status.status === 'ERROR' ? styles.errorText : styles.secondary}>{status.message}</Text>;
}

function ForecastFailurePanel({
  locationName,
  onRetry,
  onClearSearch
}: {
  locationName: string;
  onRetry: () => void;
  onClearSearch?: () => void;
}) {
  return (
    <View style={styles.failurePanel}>
      <View style={styles.failureHeader}>
        <AlertTriangle color={colors.danger} size={18} />
        <View style={styles.failureCopy}>
          <Text style={styles.failureTitle}>예보 데이터를 불러오지 못했습니다.</Text>
          <Text style={styles.failureText}>
            {locationName} 기준 API 호출이 실패했습니다. 잠시 후 다시 시도하거나 조회 권역을 바꿔 확인해 주세요.
          </Text>
        </View>
      </View>
      <View style={styles.failureActionRow}>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.failurePrimaryButton}>
          <RefreshCcw color={colors.surface} size={15} />
          <Text style={styles.failurePrimaryText}>다시 시도</Text>
        </Pressable>
        {onClearSearch ? (
          <Pressable accessibilityRole="button" onPress={onClearSearch} style={styles.failureSecondaryButton}>
            <X color={colors.primary} size={15} />
            <Text style={styles.failureSecondaryText}>검색 초기화</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function MarineList({
  title,
  status,
  items = []
}: {
  title: string;
  status?: MarineForecastApiStatus;
  items?: { id: string; title: string; meta: string; value: string }[];
}) {
  return (
    <View style={styles.marineListBlock}>
      <Text style={styles.blockTitle}>{title}</Text>
      <ApiStatusNotice status={status} />
      {items.slice(0, 4).map((item) => (
        <View key={item.id} style={styles.marineListItem}>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.listMeta}>{item.meta}</Text>
          </View>
          <Text style={styles.marineValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function buildRiskInsight(forecast?: MarineForecastOverview) {
  const shortTerms = forecast?.shortTermForecasts ?? [];
  const windValues = shortTerms.filter((item) => item.category === 'WSD').map((item) => parseNumber(item.value));
  const waveValues = shortTerms.filter((item) => item.category === 'WAV').map((item) => parseNumber(item.value));
  const popValues = shortTerms.filter((item) => item.category === 'POP').map((item) => parseNumber(item.value));
  const ptyValues = shortTerms.filter((item) => item.category === 'PTY').map((item) => item.value);
  const tideValues = (forecast?.tideForecasts ?? []).map((item) => parseNumber(item.tideLevel)).filter((value) => value > 0);

  const maxWind = Math.max(0, ...windValues);
  const maxWave = Math.max(0, ...waveValues);
  const maxPop = Math.max(0, ...popValues);
  const hasRainType = ptyValues.some((value) => value && value !== '0' && value !== '없음' && value !== '강수없음');
  const tideRange = tideValues.length ? Math.max(...tideValues) - Math.min(...tideValues) : 0;
  const warnings = forecast?.weatherWarnings.length ?? 0;

  let score = forecast ? 20 : 0;
  const reasons: string[] = [];

  if (warnings > 0) {
    score += 45;
    reasons.push(`기상특보 ${warnings}건이 조회되었습니다.`);
  }

  if (maxWind >= 14) {
    score += 35;
    reasons.push(`최대 풍속이 ${maxWind}m/s 수준으로 높습니다.`);
  } else if (maxWind >= 9) {
    score += 22;
    reasons.push(`풍속이 ${maxWind}m/s까지 올라 주의가 필요합니다.`);
  } else if (maxWind >= 6) {
    score += 10;
    reasons.push(`풍속 변화가 있어 출항 전 재확인이 좋습니다.`);
  }

  if (maxWave >= 2) {
    score += 30;
    reasons.push(`파고가 ${maxWave}m 수준으로 높게 예보되었습니다.`);
  } else if (maxWave >= 1.5) {
    score += 20;
    reasons.push(`파고가 ${maxWave}m까지 올라갈 수 있습니다.`);
  } else if (maxWave >= 1) {
    score += 10;
    reasons.push('파고가 다소 있어 멀미와 결항 가능성을 확인하세요.');
  }

  if (hasRainType) {
    score += 15;
    reasons.push('비 또는 강수 형태가 예보에 포함되어 있습니다.');
  }

  if (maxPop >= 60) {
    score += 10;
    reasons.push(`강수확률이 최대 ${maxPop}%입니다.`);
  } else if (maxPop >= 30) {
    score += 5;
    reasons.push(`강수확률이 ${maxPop}% 수준입니다.`);
  }

  if (tideRange >= 600) {
    score += 10;
    reasons.push('조위 변동폭이 커서 갯벌·접안 시간을 확인해야 합니다.');
  } else if (tideRange >= 300) {
    score += 5;
    reasons.push('만조·간조 차이가 있어 이동 시간을 맞추는 것이 좋습니다.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tone: 'good' | 'warning' | 'danger' = score >= 70 ? 'danger' : score >= 40 ? 'warning' : 'good';
  const label = score >= 70 ? '위험 높음' : score >= 40 ? '주의' : '양호';
  const color = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.mint;

  return {
    score,
    tone,
    label,
    color,
    recommendation:
      tone === 'danger'
        ? '출항 여부를 선사와 반드시 확인하세요.'
        : tone === 'warning'
          ? '시간대별 예보와 복귀편을 함께 확인하세요.'
          : '현재 기준으로 운항 위험 신호가 낮습니다.',
    reasons: reasons.length ? reasons.slice(0, 4) : ['현재 조회 기준 위험 신호가 낮습니다.'],
    details: [
      { label: '최대 풍속', value: maxWind ? `${maxWind} m/s` : '확인 필요' },
      { label: '최대 파고', value: maxWave ? `${maxWave} m` : '확인 필요' },
      { label: '강수확률', value: maxPop ? `${maxPop}%` : hasRainType ? '강수 예보' : '낮음' },
      { label: '조위 변동', value: tideRange ? `${Math.round(tideRange)} cm` : '확인 필요' }
    ]
  };
}

function buildTideTimeline(forecast?: MarineForecastOverview) {
  const tideForecasts = forecast?.tideForecasts ?? [];
  const levels = tideForecasts.map((item) => parseNumber(item.tideLevel)).filter((value) => value > 0);
  const maxLevel = Math.max(1, ...levels);

  return [...tideForecasts]
    .sort((a, b) => String(a.eventTime ?? '').localeCompare(String(b.eventTime ?? '')))
    .slice(0, 8)
    .map((item) => {
      const level = parseNumber(item.tideLevel);
      const eventType = item.eventType ?? '조석';
      return {
        id: item.id,
        eventType,
        stationName: item.stationName ?? '관측소',
        dateLabel: formatTideDate(item.eventTime),
        timeLabel: formatTideTime(item.eventTime),
        levelLabel: item.tideLevel ? `${item.tideLevel} cm` : '수위 확인',
        widthPercent: Math.max(12, Math.min(100, Math.round((level / maxLevel) * 100))),
        tone: eventType.includes('고') || eventType.includes('만') ? 'high' : 'low'
      } as const;
    });
}

function buildPrimaryMetrics(forecast?: MarineForecastOverview) {
  const wind = forecast?.shortTermForecasts.find((item) => item.category === 'WSD');
  const wave = forecast?.shortTermForecasts.find((item) => item.category === 'WAV');
  const rain = forecast?.shortTermForecasts.find((item) => item.category === 'POP' || item.category === 'PTY');
  const temp = forecast?.waterTemperatures[0];

  return [
    {
      label: '풍속',
      value: wind ? `${wind.value}${wind.unit ? ` ${wind.unit}` : ''}` : '조회 중',
      source: '단기예보',
      icon: Wind,
      color: colors.amber
    },
    {
      label: '파고',
      value: wave ? `${wave.value}${wave.unit ? ` ${wave.unit}` : ''}` : '확인 필요',
      source: '단기예보',
      icon: Waves,
      color: colors.primary
    },
    {
      label: '강수',
      value: rain ? `${rain.value}${rain.unit ? ` ${rain.unit}` : ''}` : '조회 중',
      source: '단기예보',
      icon: Droplets,
      color: colors.mint
    },
    {
      label: '수온',
      value: temp?.temperature ? `${temp.temperature} °C` : '확인 필요',
      source: '관측소',
      icon: Thermometer,
      color: colors.coral
    }
  ];
}

function buildForecastTimeline(forecast?: MarineForecastOverview) {
  if (!forecast?.shortTermForecasts.length) return [];

  const groups = new Map<string, Record<string, string | null>>();
  forecast.shortTermForecasts.forEach((item) => {
    const key = `${item.forecastDate ?? 'unknown'}-${item.forecastTime ?? 'unknown'}`;
    const current = groups.get(key) ?? { forecastDate: item.forecastDate, forecastTime: item.forecastTime };
    current[item.category] = item.unit ? `${item.value} ${item.unit}` : item.value;
    groups.set(key, current);
  });

  return [...groups.entries()].slice(0, 8).map(([id, group]) => {
    const windValue = parseNumber(group.WSD);
    const waveValue = parseNumber(group.WAV);
    const rainValue = group.PTY && group.PTY !== '없음' ? group.PTY : group.POP ? `강수 ${group.POP}` : '강수 없음';
    const riskTone = windValue >= 9 || waveValue >= 1.5 ? 'warning' : 'good';

    return {
      id,
      dateLabel: formatForecastDate(group.forecastDate),
      timeLabel: formatForecastHour(group.forecastTime),
      sky: group.SKY,
      rain: rainValue,
      temp: group.TMP ? `기온 ${group.TMP}` : '기온 확인 필요',
      wind: group.WSD ? `풍속 ${group.WSD}` : '풍속 확인 필요',
      wave: group.WAV ? `파고 ${group.WAV}` : '파고 확인 필요',
      riskLabel: riskTone === 'warning' ? '주의' : '양호',
      riskTone
    } as const;
  });
}

function riskLabel(riskLevel?: RiskLevel) {
  if (riskLevel === 'HIGH') return '위험 높음';
  if (riskLevel === 'MEDIUM') return '주의';
  if (riskLevel === 'LOW') return '양호';
  return '확인 중';
}

function riskTone(riskLevel?: RiskLevel): 'good' | 'warning' | 'danger' | 'neutral' {
  if (riskLevel === 'HIGH') return 'danger';
  if (riskLevel === 'MEDIUM') return 'warning';
  if (riskLevel === 'LOW') return 'good';
  return 'neutral';
}

function formatForecastTime(date: string | null, time: string | null) {
  if (!date && !time) return '예보시간 확인 필요';
  const dateLabel = date && date.length === 8 ? `${date.slice(4, 6)}/${date.slice(6, 8)}` : date;
  const timeLabel = time && time.length >= 4 ? `${time.slice(0, 2)}:${time.slice(2, 4)}` : time;
  return [dateLabel, timeLabel].filter(Boolean).join(' ');
}

function formatForecastDate(value: string | null) {
  return value && value.length === 8 ? `${value.slice(4, 6)}/${value.slice(6, 8)}` : value ?? '날짜';
}

function formatForecastHour(value: string | null) {
  return value && value.length >= 4 ? `${value.slice(0, 2)}:${value.slice(2, 4)}` : value ?? '시간';
}

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTideDate(value: string | null) {
  if (!value) return '날짜';
  const match = value.match(/(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})/);
  if (match) return `${match[2]}/${match[3]}`;
  return value.split(' ')[0] ?? value;
}

function formatTideTime(value: string | null) {
  if (!value) return '시간';
  const timeMatch = value.match(/(\d{2}):?(\d{2})/g);
  const lastTime = timeMatch?.at(-1);
  if (!lastTime) return value;
  return lastTime.includes(':') ? lastTime : `${lastTime.slice(0, 2)}:${lastTime.slice(2, 4)}`;
}

function parseNumber(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 11
  },
  searchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
    paddingVertical: 8
  },
  clearButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42
  },
  searchButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900'
  },
  searchHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  locationPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  sectionTitleWrap: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  locationButton: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 3,
    minHeight: 54,
    minWidth: 134,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  locationButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  locationLabel: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  locationLabelSelected: {
    color: colors.surface
  },
  locationHelper: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  locationHelperSelected: {
    color: '#d7f4ff'
  },
  mappingNote: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16
  },
  weatherCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    padding: 16
  },
  weatherIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    width: 54
  },
  weatherCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  weatherTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  weatherTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  weatherText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  loadingPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  failurePanel: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffd1d1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  failureHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9
  },
  failureCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  failureTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900'
  },
  failureText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  failureActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  failurePrimaryButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 118,
    paddingHorizontal: 10
  },
  failurePrimaryText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900'
  },
  failureSecondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 118,
    paddingHorizontal: 10
  },
  failureSecondaryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 5,
    minHeight: 118,
    minWidth: 142,
    padding: 12,
    width: '47%'
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  metricValue: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  metricSource: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  riskScoreCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  riskScoreHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  riskScoreValue: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40
  },
  riskScoreUnit: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  riskScoreLabel: {
    alignItems: 'flex-end',
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  riskRecommendation: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'right'
  },
  riskProgressTrack: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden'
  },
  riskProgressFill: {
    borderRadius: 999,
    height: '100%'
  },
  riskReasonList: {
    gap: 7
  },
  riskReasonItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7
  },
  riskReasonText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  riskDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  riskDetailItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexGrow: 1,
    gap: 3,
    minWidth: 118,
    padding: 9,
    width: '47%'
  },
  riskDetailLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900'
  },
  riskDetailValue: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  timelineList: {
    gap: 8
  },
  timelineItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 10
  },
  timelineTimeBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 2,
    justifyContent: 'center',
    minHeight: 48,
    width: 58
  },
  timelineTime: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  timelineDate: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800'
  },
  timelineCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  timelineTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  timelineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5
  },
  timelineMeta: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  tideTimelineList: {
    gap: 8
  },
  tideTimelineItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 66,
    padding: 10
  },
  tideTimeBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 2,
    justifyContent: 'center',
    minHeight: 46,
    width: 56
  },
  tideTime: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  tideDate: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800'
  },
  tideTimelineCopy: {
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  tideTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tideTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  tideStation: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  tideBarTrack: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden'
  },
  tideBarFill: {
    borderRadius: 999,
    height: '100%'
  },
  tideLevel: {
    color: colors.primary,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 54,
    textAlign: 'right'
  },
  forecastItem: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 4,
    minHeight: 82,
    minWidth: 126,
    padding: 10,
    width: '48%'
  },
  forecastItemLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  forecastItemValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  forecastItemTime: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700'
  },
  list: {
    gap: 8
  },
  warningItem: {
    alignItems: 'flex-start',
    backgroundColor: '#fff8e8',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    padding: 10
  },
  listCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  listTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  listMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  listDescription: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  marineSection: {
    gap: 12
  },
  marineListBlock: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 8,
    padding: 10
  },
  blockTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  marineListItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    padding: 9
  },
  marineValue: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right'
  },
  secondary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19
  }
});
