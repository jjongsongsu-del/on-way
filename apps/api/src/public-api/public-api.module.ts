import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncheonPortApiClient } from './clients/incheon-port-api.client';
import { KomsaApiClient } from './clients/komsa-api.client';
import { PublicApiHttpClient } from './clients/public-api-http.client';
import { MockFerryApiClient } from './mock/mock-ferry-api.client';
import { FERRY_API_CLIENT } from './public-api.tokens';

@Module({
  providers: [
    PublicApiHttpClient,
    KomsaApiClient,
    IncheonPortApiClient,
    MockFerryApiClient,
    {
      provide: FERRY_API_CLIENT,
      inject: [ConfigService, MockFerryApiClient],
      useFactory: (configService: ConfigService, mockClient: MockFerryApiClient) => {
        const mode = configService.get<string>('PUBLIC_API_MODE', 'mock');

        if (mode !== 'mock') {
          // M3 keeps the interface swappable while M4 fills endpoint-specific implementations.
          return mockClient;
        }

        return mockClient;
      }
    }
  ],
  exports: [FERRY_API_CLIENT, PublicApiHttpClient, KomsaApiClient, IncheonPortApiClient]
})
export class PublicApiModule {}

