import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncheonPortApiClient } from './clients/incheon-port-api.client';
import { KomsaApiClient } from './clients/komsa-api.client';
import { PublicApiHttpClient } from './clients/public-api-http.client';
import { TourismApiClient } from './clients/tourism-api.client';
import { VworldIslandApiClient } from './clients/vworld-island-api.client';
import { MockFerryApiClient } from './mock/mock-ferry-api.client';
import { FERRY_API_CLIENT } from './public-api.tokens';
import { RealFerryApiClient } from './real-ferry-api.client';

@Module({
  providers: [
    PublicApiHttpClient,
    TourismApiClient,
    VworldIslandApiClient,
    KomsaApiClient,
    IncheonPortApiClient,
    MockFerryApiClient,
    RealFerryApiClient,
    {
      provide: FERRY_API_CLIENT,
      inject: [ConfigService, MockFerryApiClient, RealFerryApiClient],
      useFactory: (
        configService: ConfigService,
        mockClient: MockFerryApiClient,
        realClient: RealFerryApiClient
      ) => {
        const mode = configService.get<string>('PUBLIC_API_MODE', 'mock');

        if (mode === 'real') {
          return realClient;
        }

        return mockClient;
      }
    }
  ],
  exports: [
    FERRY_API_CLIENT,
    PublicApiHttpClient,
    TourismApiClient,
    KomsaApiClient,
    IncheonPortApiClient,
    VworldIslandApiClient,
    RealFerryApiClient
  ]
})
export class PublicApiModule {}
