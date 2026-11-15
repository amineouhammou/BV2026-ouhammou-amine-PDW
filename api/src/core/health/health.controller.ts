import { Controller, Get } from '@nestjs/common';

import { SkipApiTransform } from '@common/api/index.js';
import { Public } from '@core/auth/decorator/public.decorator.js';

@Public()
@SkipApiTransform()
@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}
