import { Injectable, NotFoundException } from '@nestjs/common';
import type { CruiseOverview, CruisePort, CruiseSchedule, CruiseTourProduct } from '@badagil/shared';
import { PrismaService } from '../database/prisma.service';
import { toApiResponse } from '../normalizer/public-api.normalizer';
import type { PublicApiResult } from '../public-api/types/public-api.types';

type CruiseScheduleRow = {
  id: string;
  schedule_key: string;
  vessel_name: string;
  operator_name: string | null;
  arrival_date: Date | string;
  arrival_time: string | null;
  departure_date: Date | string | null;
  departure_time: string | null;
  home_port_code: string | null;
  home_port_name: string | null;
  previous_port_code: string | null;
  previous_port_name: string | null;
  next_port_code: string | null;
  next_port_name: string | null;
  berth_name: string | null;
  schedule_type: string | null;
  agent_name: string | null;
  agent_tel: string | null;
  source_name: string;
  source_url: string | null;
  collected_at: Date | string;
  port_id: string;
  port_key: string;
  port_name: string;
  region_name: string | null;
  city_name: string | null;
  terminal_name: string | null;
  port_source_name: string;
  port_source_url: string | null;
  vessel_id: string | null;
  vessel_key: string | null;
  registry_country: string | null;
  gross_tonnage: unknown;
  length_meter: unknown;
  max_draft_meter: unknown;
  air_draft_meter: unknown;
  crew_count: number | null;
  passenger_capacity: number | null;
  vessel_source_name: string | null;
};

type CruisePortRow = {
  id: string;
  port_key: string;
  port_name: string;
  region_name: string | null;
  city_name: string | null;
  terminal_name: string | null;
  source_name: string;
  source_url: string | null;
};

type CruiseProductRow = {
  id: string;
  product_key: string;
  product_name: string;
  address: string | null;
  price_text: string | null;
  operating_hours: string | null;
  closed_days: string | null;
  travel_time_text: string | null;
  image_included: boolean;
  accessibility: Record<string, unknown> | null;
  description: string | null;
  source_name: string;
  source_url: string | null;
  reference_date: Date | string | null;
  port_id: string | null;
  port_key: string | null;
  port_name: string | null;
  region_name: string | null;
  city_name: string | null;
  terminal_name: string | null;
  port_source_name: string | null;
  port_source_url: string | null;
};

@Injectable()
export class CruisesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview(params: { limit?: number }) {
    const limit = clampNumber(params.limit ?? 12, 4, 40);
    const [ports, schedules, tourProducts, counts, sources] = await Promise.all([
      this.prismaService.$queryRawUnsafe<CruisePortRow[]>('SELECT * FROM cruise_port ORDER BY port_name ASC'),
      this.findSchedules({ from: todayDateString(), limit }),
      this.findTourProducts(10),
      this.prismaService.$queryRawUnsafe<Array<Record<string, number>>>(`
        SELECT
          (SELECT count(*)::int FROM cruise_port) AS "totalPorts",
          (SELECT count(*)::int FROM cruise_vessel) AS "totalVessels",
          (SELECT count(*)::int FROM cruise_schedule) AS "totalSchedules",
          (SELECT count(*)::int FROM cruise_schedule WHERE arrival_date >= CURRENT_DATE) AS "upcomingSchedules",
          (SELECT count(*)::int FROM cruise_tour_product) AS "totalTourProducts"
      `),
      this.prismaService.$queryRawUnsafe<Array<{ source_name: string }>>(`
        SELECT source_name FROM cruise_schedule
        UNION
        SELECT source_name FROM cruise_tour_product
        ORDER BY source_name ASC
      `)
    ]);

    const overview: CruiseOverview = {
      ports: ports.map(toCruisePort),
      upcomingSchedules: schedules,
      tourProducts,
      summary: {
        totalPorts: Number(counts[0]?.totalPorts ?? 0),
        totalVessels: Number(counts[0]?.totalVessels ?? 0),
        totalSchedules: Number(counts[0]?.totalSchedules ?? 0),
        upcomingSchedules: Number(counts[0]?.upcomingSchedules ?? 0),
        totalTourProducts: Number(counts[0]?.totalTourProducts ?? 0),
        sourceNames: sources.map((source) => source.source_name)
      },
      updatedAt: new Date().toISOString()
    };

    return toApiResponse(createLocalResult(overview));
  }

  async getSchedules(params: { portName?: string; keyword?: string; from?: string; to?: string; limit?: number }) {
    return toApiResponse(createLocalResult(await this.findSchedules(params)));
  }

  async getScheduleDetail(id: string) {
    const rows = await this.querySchedules(['s.id = $1'], [id], 1);
    const schedule = rows[0] ? toCruiseSchedule(rows[0]) : null;
    if (!schedule) throw new NotFoundException('Cruise schedule not found');
    return toApiResponse(createLocalResult(schedule));
  }

  private async findSchedules(params: { portName?: string; keyword?: string; from?: string; to?: string; limit?: number }) {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.portName) {
      values.push(params.portName);
      where.push(`p.port_name = $${values.length}`);
    }
    if (params.keyword) {
      values.push(`%${params.keyword}%`);
      where.push(`(s.vessel_name ILIKE $${values.length} OR s.operator_name ILIKE $${values.length} OR p.port_name ILIKE $${values.length})`);
    }
    if (params.from) {
      values.push(params.from);
      where.push(`s.arrival_date >= $${values.length}::date`);
    }
    if (params.to) {
      values.push(params.to);
      where.push(`s.arrival_date <= $${values.length}::date`);
    }

    return (await this.querySchedules(where, values, clampNumber(params.limit ?? 30, 1, 100))).map(toCruiseSchedule);
  }

  private async querySchedules(where: string[], values: unknown[], limit: number) {
    values.push(limit);
    const limitIndex = values.length;
    return this.prismaService.$queryRawUnsafe<CruiseScheduleRow[]>(
      `
        SELECT
          s.id, s.schedule_key, s.vessel_name, s.operator_name, s.arrival_date, s.arrival_time,
          s.departure_date, s.departure_time, s.home_port_code, s.home_port_name,
          s.previous_port_code, s.previous_port_name, s.next_port_code, s.next_port_name,
          s.berth_name, s.schedule_type, s.agent_name, s.agent_tel, s.source_name, s.source_url, s.collected_at,
          p.id AS port_id, p.port_key, p.port_name, p.region_name, p.city_name, p.terminal_name,
          p.source_name AS port_source_name, p.source_url AS port_source_url,
          v.id AS vessel_id, v.vessel_key, v.registry_country, v.gross_tonnage, v.length_meter,
          v.max_draft_meter, v.air_draft_meter, v.crew_count, v.passenger_capacity, v.source_name AS vessel_source_name
        FROM cruise_schedule s
        JOIN cruise_port p ON p.id = s.port_id
        LEFT JOIN cruise_vessel v ON v.id = s.vessel_id
        ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY s.arrival_date ASC, s.arrival_time ASC NULLS LAST, p.port_name ASC, s.vessel_name ASC
        LIMIT $${limitIndex}
      `,
      ...values
    );
  }

  private async findTourProducts(limit: number) {
    const rows = await this.prismaService.$queryRawUnsafe<CruiseProductRow[]>(
      `
        SELECT
          t.id, t.product_key, t.product_name, t.address, t.price_text, t.operating_hours,
          t.closed_days, t.travel_time_text, t.image_included, t.accessibility, t.description,
          t.source_name, t.source_url, t.reference_date,
          p.id AS port_id, p.port_key, p.port_name, p.region_name, p.city_name, p.terminal_name,
          p.source_name AS port_source_name, p.source_url AS port_source_url
        FROM cruise_tour_product t
        LEFT JOIN cruise_port p ON p.id = t.port_id
        ORDER BY t.product_name ASC
        LIMIT $1
      `,
      limit
    );
    return rows.map(toCruiseTourProduct);
  }
}

function toCruiseSchedule(row: CruiseScheduleRow): CruiseSchedule {
  return {
    id: row.id,
    scheduleKey: row.schedule_key,
    port: toCruisePort({
      id: row.port_id,
      port_key: row.port_key,
      port_name: row.port_name,
      region_name: row.region_name,
      city_name: row.city_name,
      terminal_name: row.terminal_name,
      source_name: row.port_source_name,
      source_url: row.port_source_url
    }),
    vessel: row.vessel_id
      ? {
          id: row.vessel_id,
          vesselKey: row.vessel_key ?? '',
          vesselName: row.vessel_name,
          operatorName: row.operator_name,
          registryCountry: row.registry_country,
          grossTonnage: toNumber(row.gross_tonnage),
          lengthMeter: toNumber(row.length_meter),
          maxDraftMeter: toNumber(row.max_draft_meter),
          airDraftMeter: toNumber(row.air_draft_meter),
          crewCount: row.crew_count,
          passengerCapacity: row.passenger_capacity,
          sourceName: row.vessel_source_name ?? row.source_name
        }
      : null,
    vesselName: row.vessel_name,
    operatorName: row.operator_name,
    arrivalDate: toDateString(row.arrival_date),
    arrivalTime: row.arrival_time,
    departureDate: row.departure_date ? toDateString(row.departure_date) : null,
    departureTime: row.departure_time,
    homePortCode: row.home_port_code,
    homePortName: row.home_port_name,
    previousPortCode: row.previous_port_code,
    previousPortName: row.previous_port_name,
    nextPortCode: row.next_port_code,
    nextPortName: row.next_port_name,
    berthName: row.berth_name,
    scheduleType: row.schedule_type,
    agentName: row.agent_name,
    agentTel: row.agent_tel,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    collectedAt: new Date(row.collected_at).toISOString()
  };
}

function toCruisePort(row: CruisePortRow): CruisePort {
  return {
    id: row.id,
    portKey: row.port_key,
    portName: row.port_name,
    regionName: row.region_name,
    cityName: row.city_name,
    terminalName: row.terminal_name,
    sourceName: row.source_name,
    sourceUrl: row.source_url
  };
}

function toCruiseTourProduct(row: CruiseProductRow): CruiseTourProduct {
  return {
    id: row.id,
    productKey: row.product_key,
    port: row.port_id
      ? toCruisePort({
          id: row.port_id,
          port_key: row.port_key ?? '',
          port_name: row.port_name ?? '',
          region_name: row.region_name,
          city_name: row.city_name,
          terminal_name: row.terminal_name,
          source_name: row.port_source_name ?? row.source_name,
          source_url: row.port_source_url
        })
      : null,
    productName: row.product_name,
    address: row.address,
    priceText: row.price_text,
    operatingHours: row.operating_hours,
    closedDays: row.closed_days,
    travelTimeText: row.travel_time_text,
    imageIncluded: row.image_included,
    accessibility: row.accessibility,
    description: row.description,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    referenceDate: row.reference_date ? toDateString(row.reference_date) : null
  };
}

function toDateString(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : min, min), max);
}

function createLocalResult<T>(data: T): PublicApiResult<T> {
  return {
    data,
    meta: {
      source: 'LOCAL_CRUISE_DATA',
      provider: 'LOCAL',
      rawFormat: 'json',
      fetchedAt: new Date().toISOString()
    }
  };
}
