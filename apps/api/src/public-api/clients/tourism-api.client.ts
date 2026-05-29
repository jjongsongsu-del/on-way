import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicApiHttpClient } from './public-api-http.client';

const DEFAULT_GOCAMPING_URL = 'https://apis.data.go.kr/B551011/GoCamping';
const DEFAULT_KOR_SERVICE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const DEFAULT_CULTURE_CAMPING_URL = 'https://api.odcloud.kr/api/15111395/v1/uddi:8c528230-eda4-4d83-855a-bee73605e49f';
const DEFAULT_GENERAL_CAMPGROUND_URL = 'https://apis.data.go.kr/1741000/general_campgrounds';
const DEFAULT_SEA_TRIP_URL = 'https://apis.data.go.kr/1192136/fcstSeaTripv2';
const DEFAULT_LODGINGS_URL = 'https://apis.data.go.kr/1741000/lodgings';
const DEFAULT_TOURIST_RESTAURANTS_URL = 'https://apis.data.go.kr/1741000/tourist_restaurants';

@Injectable()
export class TourismApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PublicApiHttpClient
  ) {}

  searchTourAttractions<T = unknown>(keyword: string) {
    return this.getJson<T>(`${this.getKorServiceUrl()}/searchKeyword2`, {
      MobileOS: 'ETC',
      MobileApp: 'Badagil',
      _type: 'json',
      arrange: 'O',
      contentTypeId: 12,
      keyword,
      numOfRows: 10,
      pageNo: 1
    });
  }

  searchGoCamping<T = unknown>(keyword: string) {
    return this.getJson<T>(`${this.getGoCampingUrl()}/searchList`, {
      MobileOS: 'ETC',
      MobileApp: 'Badagil',
      _type: 'json',
      keyword,
      numOfRows: 10,
      pageNo: 1
    });
  }

  getGoCampingList<T = unknown>() {
    return this.getJson<T>(`${this.getGoCampingUrl()}/basedList`, {
      MobileOS: 'ETC',
      MobileApp: 'Badagil',
      _type: 'json',
      numOfRows: 10,
      pageNo: 1
    });
  }

  getCultureCamping<T = unknown>() {
    return this.getJson<T>(this.getCultureCampingUrl(), {
      page: 1,
      perPage: 20,
      returnType: 'JSON'
    });
  }

  getGeneralCampgrounds<T = unknown>() {
    return this.getJson<T>(`${this.getGeneralCampgroundUrl()}/info`, {
      type: 'json',
      numOfRows: 20,
      pageNo: 1
    });
  }

  getSeaTripIndexes<T = unknown>() {
    return this.getJson<T>(`${this.getSeaTripUrl()}/GetFcstSeaTripApiServicev2`, {
      type: 'json',
      numOfRows: 20,
      pageNo: 1
    });
  }

  getLodgings<T = unknown>() {
    return this.getJson<T>(`${this.getLodgingsUrl()}/info`, {
      type: 'json',
      numOfRows: 30,
      pageNo: 1
    });
  }

  getTouristRestaurants<T = unknown>() {
    return this.getJson<T>(`${this.getTouristRestaurantsUrl()}/info`, {
      type: 'json',
      numOfRows: 30,
      pageNo: 1
    });
  }

  private getJson<T>(url: string, params: Record<string, string | number | undefined>) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('Tourism API is not configured');
    }

    return this.httpClient.getJson<T>(
      this.httpClient.createUrl(url, {
        serviceKey,
        ...params
      })
    );
  }

  private getGoCampingUrl() {
    return this.configService.get<string>('GOCAMPING_API_URL') ?? DEFAULT_GOCAMPING_URL;
  }

  private getKorServiceUrl() {
    return this.configService.get<string>('KOR_TOURISM_API_URL') ?? DEFAULT_KOR_SERVICE_URL;
  }

  private getCultureCampingUrl() {
    return this.configService.get<string>('CULTURE_CAMPING_API_URL') ?? DEFAULT_CULTURE_CAMPING_URL;
  }

  private getGeneralCampgroundUrl() {
    return this.configService.get<string>('GENERAL_CAMPGROUND_API_URL') ?? DEFAULT_GENERAL_CAMPGROUND_URL;
  }

  private getSeaTripUrl() {
    return this.configService.get<string>('SEA_TRIP_INDEX_API_URL') ?? DEFAULT_SEA_TRIP_URL;
  }

  private getLodgingsUrl() {
    return this.configService.get<string>('LODGINGS_API_URL') ?? DEFAULT_LODGINGS_URL;
  }

  private getTouristRestaurantsUrl() {
    return this.configService.get<string>('TOURIST_RESTAURANTS_API_URL') ?? DEFAULT_TOURIST_RESTAURANTS_URL;
  }

  private getServiceKey() {
    return (
      this.configService.get<string>('TOURISM_SERVICE_KEY') ??
      this.configService.get<string>('DATA_GO_KR_SERVICE_KEY') ??
      this.configService.get<string>('PUBLIC_DATA_SERVICE_KEY')
    );
  }
}
