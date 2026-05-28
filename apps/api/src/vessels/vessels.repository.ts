import { Injectable } from '@nestjs/common';
import type { VesselDetail } from '@badagil/shared';
import { PrismaService } from '../database/prisma.service';
import type { KomsaVesselScrapeItem } from './vessel-detail.types';

type VesselDetailRow = {
  id: string;
  ship_no: string;
  vessel_name: string;
  image_url: string | null;
  image_data_url: string | null;
  source_url: string;
  gross_tonnage: string | null;
  dimensions: string | null;
  ship_type: string | null;
  ship_kind: string | null;
  max_speed: string | null;
  cruise_speed: string | null;
  engine_type: string | null;
  engine_power: string | null;
  navigation_area: string | null;
  passenger_capacity: string | null;
  route_name: string | null;
  operator_name: string | null;
  collected_at: Date;
};

@Injectable()
export class VesselsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vessel_detail (
        id TEXT PRIMARY KEY,
        ship_no TEXT NOT NULL UNIQUE,
        vessel_name TEXT NOT NULL,
        image_url TEXT,
        image_data_url TEXT,
        source_url TEXT NOT NULL,
        gross_tonnage TEXT,
        dimensions TEXT,
        ship_type TEXT,
        ship_kind TEXT,
        max_speed TEXT,
        cruise_speed TEXT,
        engine_type TEXT,
        engine_power TEXT,
        navigation_area TEXT,
        passenger_capacity TEXT,
        route_name TEXT,
        operator_name TEXT,
        collected_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS vessel_detail_vessel_name_idx ON vessel_detail (vessel_name)');
    await this.prisma.$executeRawUnsafe('ALTER TABLE vessel_detail ADD COLUMN IF NOT EXISTS image_data_url TEXT');
  }

  async findByName(vesselName: string) {
    await this.ensureTable();
    const normalized = normalizeVesselName(vesselName);
    const rows = await this.prisma.$queryRawUnsafe<VesselDetailRow[]>(
      `
        SELECT * FROM vessel_detail
        WHERE REPLACE(REPLACE(vessel_name, ' ', ''), '호', '') = $1
           OR REPLACE(vessel_name, ' ', '') = $2
        ORDER BY collected_at DESC
        LIMIT 1
      `,
      normalized,
      vesselName.replace(/\s+/g, '')
    );

    return rows[0] ? toVesselDetail(rows[0]) : null;
  }

  async upsertMany(items: KomsaVesselScrapeItem[]) {
    await this.ensureTable();
    const collectedAt = new Date();
    let upserted = 0;

    for (const item of items) {
      await this.prisma.$executeRawUnsafe(
        `
          INSERT INTO vessel_detail (
            id, ship_no, vessel_name, image_url, image_data_url, source_url, gross_tonnage, dimensions,
            ship_type, ship_kind, max_speed, cruise_speed, engine_type, engine_power,
            navigation_area, passenger_capacity, route_name, operator_name, collected_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $19
          )
          ON CONFLICT (ship_no) DO UPDATE SET
            vessel_name = EXCLUDED.vessel_name,
            image_url = EXCLUDED.image_url,
            image_data_url = EXCLUDED.image_data_url,
            source_url = EXCLUDED.source_url,
            gross_tonnage = EXCLUDED.gross_tonnage,
            dimensions = EXCLUDED.dimensions,
            ship_type = EXCLUDED.ship_type,
            ship_kind = EXCLUDED.ship_kind,
            max_speed = EXCLUDED.max_speed,
            cruise_speed = EXCLUDED.cruise_speed,
            engine_type = EXCLUDED.engine_type,
            engine_power = EXCLUDED.engine_power,
            navigation_area = EXCLUDED.navigation_area,
            passenger_capacity = EXCLUDED.passenger_capacity,
            route_name = EXCLUDED.route_name,
            operator_name = EXCLUDED.operator_name,
            collected_at = EXCLUDED.collected_at,
            updated_at = EXCLUDED.updated_at
        `,
        `komsa-${item.shipNo}`,
        item.shipNo,
        item.vesselName,
        item.imageUrl,
        item.imageDataUrl,
        item.sourceUrl,
        item.grossTonnage,
        item.dimensions,
        item.shipType,
        item.shipKind,
        item.maxSpeed,
        item.cruiseSpeed,
        item.engineType,
        item.enginePower,
        item.navigationArea,
        item.passengerCapacity,
        item.routeName,
        item.operatorName,
        collectedAt
      );
      upserted += 1;
    }

    return upserted;
  }
}

function normalizeVesselName(value: string) {
  return value.replace(/\s+/g, '').replace(/호$/, '');
}

function toVesselDetail(row: VesselDetailRow): VesselDetail {
  return {
    id: row.id,
    shipNo: row.ship_no,
    vesselName: row.vessel_name,
    imageUrl: row.image_url,
    imageDataUrl: row.image_data_url,
    sourceUrl: row.source_url,
    grossTonnage: row.gross_tonnage,
    dimensions: row.dimensions,
    shipType: row.ship_type,
    shipKind: row.ship_kind,
    maxSpeed: row.max_speed,
    cruiseSpeed: row.cruise_speed,
    engineType: row.engine_type,
    enginePower: row.engine_power,
    navigationArea: row.navigation_area,
    passengerCapacity: row.passenger_capacity,
    routeName: row.route_name,
    operatorName: row.operator_name,
    collectedAt: row.collected_at.toISOString()
  };
}
