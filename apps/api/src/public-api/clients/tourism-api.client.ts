import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicApiHttpClient } from './public-api-http.client';

const DEFAULT_GOCAMPING_URL = 'https://apis.data.go.kr/B551011/GoCamping';
const DEFAULT_KOR_SERVICE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const DEFAULT_PHOTO_GALLERY_URL = 'https://apis.data.go.kr/B551011/PhotoGalleryService1';
const DEFAULT_CULTURE_CAMPING_URL = 'https://api.odcloud.kr/api/15111395/v1/uddi:8c528230-eda4-4d83-855a-bee73605e49f';
const DEFAULT_GENERAL_CAMPGROUND_URL = 'https://apis.data.go.kr/1741000/general_campgrounds';
const DEFAULT_SEA_TRIP_URL = 'https://apis.data.go.kr/1192136/fcstSeaTripv2';
const DEFAULT_LODGINGS_URL = 'https://apis.data.go.kr/1741000/lodgings';
const DEFAULT_TOURIST_RESTAURANTS_URL = 'https://apis.data.go.kr/1741000/tourist_restaurants';
const DEFAULT_TOURIST_PENSIONS_URL = 'https://apis.data.go.kr/1741000/tourist_pensions';
const DEFAULT_MUD_FLAT_URL = 'https://apis.data.go.kr/1192000/MudFlatInfoService';
const DEFAULT_BORYEONG_ISLAND_PHOTO_URL = 'https://apis.data.go.kr/4510000/GetIslandPhotoService/getIslandInfo';

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

  searchPhotoGallery<T = unknown>(keyword: string) {
    return this.getJson<T>(`${this.getPhotoGalleryUrl()}/gallerySearchList1`, {
      MobileOS: 'ETC',
      MobileApp: 'Badagil',
      _type: 'json',
      arrange: 'A',
      keyword,
      numOfRows: 20,
      pageNo: 1
    });
  }

  getPhotoGalleryList<T = unknown>() {
    return this.getJson<T>(`${this.getPhotoGalleryUrl()}/galleryList1`, {
      MobileOS: 'ETC',
      MobileApp: 'Badagil',
      _type: 'json',
      arrange: 'A',
      numOfRows: 100,
      pageNo: 1
    });
  }

  getBoryeongIslandPhotos<T = unknown>() {
    return this.getJson<T>(this.getBoryeongIslandPhotoUrl(), {
      type: 'json',
      numOfRows: 100,
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

  getLodgings<T = unknown>(keyword?: string) {
    return this.getJson<T>(`${this.getLodgingsUrl()}/info`, {
      type: 'json',
      numOfRows: keyword ? 100 : 1000,
      pageNo: 1,
      ...this.createLocalDataAddressFilter(keyword)
    });
  }

  getTouristRestaurants<T = unknown>(keyword?: string) {
    return this.getJson<T>(`${this.getTouristRestaurantsUrl()}/info`, {
      type: 'json',
      numOfRows: keyword ? 100 : 1000,
      pageNo: 1,
      ...this.createLocalDataAddressFilter(keyword)
    });
  }

  getTouristPensions<T = unknown>(keyword?: string) {
    return this.getJson<T>(`${this.getTouristPensionsUrl()}/info`, {
      type: 'json',
      numOfRows: keyword ? 100 : 1000,
      pageNo: 1,
      ...this.createLocalDataAddressFilter(keyword)
    });
  }

  getMudFlatEcInfo<T = unknown>() {
    return this.getXml<T>(`${this.getMudFlatUrl()}/MudFlatEcInfo`, {
      numOfRows: 20,
      pageNo: 1
    });
  }

  getMudFlatExperienceVillages<T = unknown>() {
    return this.getXml<T>(`${this.getMudFlatUrl()}/MudFlatExprVllgInfo`, {
      numOfRows: 20,
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

  private getXml<T>(url: string, params: Record<string, string | number | undefined>) {
    const serviceKey = this.getServiceKey();

    if (!serviceKey) {
      throw new Error('Tourism API is not configured');
    }

    return this.httpClient.getXml<T>(
      this.httpClient.createUrl(url, {
        serviceKey,
        ...params
      })
    );
  }

  private getGoCampingUrl() {
    return getConfiguredValue(this.configService, 'GOCAMPING_API_URL') ?? DEFAULT_GOCAMPING_URL;
  }

  private getKorServiceUrl() {
    return getConfiguredValue(this.configService, 'KOR_TOURISM_API_URL') ?? DEFAULT_KOR_SERVICE_URL;
  }

  private getPhotoGalleryUrl() {
    return getConfiguredValue(this.configService, 'PHOTO_GALLERY_API_URL') ?? DEFAULT_PHOTO_GALLERY_URL;
  }

  private getCultureCampingUrl() {
    return getConfiguredValue(this.configService, 'CULTURE_CAMPING_API_URL') ?? DEFAULT_CULTURE_CAMPING_URL;
  }

  private getGeneralCampgroundUrl() {
    return getConfiguredValue(this.configService, 'GENERAL_CAMPGROUND_API_URL') ?? DEFAULT_GENERAL_CAMPGROUND_URL;
  }

  private getSeaTripUrl() {
    return getConfiguredValue(this.configService, 'SEA_TRIP_INDEX_API_URL') ?? DEFAULT_SEA_TRIP_URL;
  }

  private getLodgingsUrl() {
    return getConfiguredValue(this.configService, 'LODGINGS_API_URL') ?? DEFAULT_LODGINGS_URL;
  }

  private getTouristRestaurantsUrl() {
    return getConfiguredValue(this.configService, 'TOURIST_RESTAURANTS_API_URL') ?? DEFAULT_TOURIST_RESTAURANTS_URL;
  }

  private getTouristPensionsUrl() {
    return getConfiguredValue(this.configService, 'TOURIST_PENSIONS_API_URL') ?? DEFAULT_TOURIST_PENSIONS_URL;
  }

  private getMudFlatUrl() {
    return getConfiguredValue(this.configService, 'MUD_FLAT_API_URL') ?? DEFAULT_MUD_FLAT_URL;
  }

  private getBoryeongIslandPhotoUrl() {
    return getConfiguredValue(this.configService, 'BORYEONG_ISLAND_PHOTO_API_URL') ?? DEFAULT_BORYEONG_ISLAND_PHOTO_URL;
  }

  private createLocalDataAddressFilter(keyword?: string) {
    const normalized = keyword?.trim().replace(/도$/, '');
    if (!normalized || normalized.length < 2) return {};

    return {
      'cond[LOTNO_ADDR::LIKE]': normalized
    };
  }

  private getServiceKey() {
    return (
      getConfiguredValue(this.configService, 'TOURISM_SERVICE_KEY') ??
      getConfiguredValue(this.configService, 'DATA_GO_KR_SERVICE_KEY') ??
      getConfiguredValue(this.configService, 'PUBLIC_DATA_SERVICE_KEY')
    );
  }
}

function getConfiguredValue(configService: ConfigService, key: string) {
  const value = configService.get<string>(key)?.trim();
  return value || undefined;
}
