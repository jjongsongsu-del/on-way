import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      data: {
        status: 'ok',
        service: 'badagil-api'
      },
      meta: {
        updatedAt: new Date().toISOString()
      }
    };
  }
}

