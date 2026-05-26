import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteType } from '@prisma/client';

export class UserFavoriteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: FavoriteType, example: FavoriteType.ROUTE })
  favoriteType!: FavoriteType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  notificationEnabled!: boolean;

  @ApiProperty({ example: '2026-05-26T06:00:00.000Z' })
  createdAt!: string;
}

export class NotificationRuleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ nullable: true })
  favoriteId!: string | null;

  @ApiProperty()
  notifyStatusChange!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 60 })
  notifyDepartureMinutesBefore!: number | null;

  @ApiProperty()
  notifyForecastUpdate!: boolean;

  @ApiProperty({ example: '2026-05-26T06:00:00.000Z' })
  updatedAt!: string;
}

