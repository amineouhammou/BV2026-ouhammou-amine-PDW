import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getLive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}