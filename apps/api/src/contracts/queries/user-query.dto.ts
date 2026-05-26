import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteType, Platform, PushProvider } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFavoriteRequestDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: FavoriteType })
  @IsEnum(FavoriteType)
  favoriteType!: FavoriteType;

  @ApiProperty()
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;
}

export class UpdateNotificationRuleRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyStatusChange?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  notifyDepartureMinutesBefore?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyForecastUpdate?: boolean;
}

export class RegisterPushTokenRequestDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: PushProvider })
  @IsEnum(PushProvider)
  provider!: PushProvider;
}

