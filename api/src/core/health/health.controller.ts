import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { SkipApiTransform } from '@common/api/index.js';
import { Public } from '@core/auth/index.js';

type HealthIndicatorExample = {
  status: 'up' | 'down';
  message?: string;
};

type HealthCheckExample = {
  status: 'ok' | 'error';
  info: Record<string, HealthIndicatorExample>;
  error: Record<string, HealthIndicatorExample>;
  details: Record<string, HealthIndicatorExample>;
};

type SwaggerResponseSchema = Extract<
  NonNullable<Parameters<typeof ApiOkResponse>[0]>,
  { schema: unknown }
>['schema'];

const healthIndicatorResultSchema: SwaggerResponseSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['up', 'down'] },
    message: { type: 'string' },
  },
};

const healthIndicatorResultsSchema: SwaggerResponseSchema = {
  type: 'object',
  additionalProperties: healthIndicatorResultSchema,
};

const healthCheckResponseSchema = (
  example: HealthCheckExample,
): SwaggerResponseSchema => ({
  type: 'object',
  required: ['status', 'info', 'error', 'details'],
  properties: {
    status: { type: 'string', enum: ['ok', 'error'], example: example.status },
    info: { ...healthIndicatorResultsSchema, example: example.info },
    error: { ...healthIndicatorResultsSchema, example: example.error },
    details: { ...healthIndicatorResultsSchema, example: example.details },
  },
  example,
});

const livenessOkExample: HealthCheckExample = {
  status: 'ok',
  info: { application: { status: 'up' } },
  error: {},
  details: { application: { status: 'up' } },
};

const readinessOkExample: HealthCheckExample = {
  status: 'ok',
  info: { database: { status: 'up' } },
  error: {},
  details: { database: { status: 'up' } },
};

const readinessUnavailableExample: HealthCheckExample = {
  status: 'error',
  info: {},
  error: {
    database: {
      status: 'down',
      message: 'Could not connect to the PostgreSQL database.',
    },
  },
  details: {
    database: {
      status: 'down',
      message: 'Could not connect to the PostgreSQL database.',
    },
  },
};

@ApiTags('Health')
@SkipApiTransform()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck({ noCache: true, swaggerDocumentation: false })
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Reports whether the application process is alive without checking external dependencies.',
  })
  @ApiOkResponse({
    description: 'Application process is alive.',
    schema: healthCheckResponseSchema(livenessOkExample),
  })
  live(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => Promise.resolve({ application: { status: 'up' } }),
    ]);
  }

  @Get('ready')
  @HealthCheck({ noCache: true, swaggerDocumentation: false })
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Reports whether the PostgreSQL database connection managed by TypeORM is ready.',
  })
  @ApiOkResponse({
    description: 'PostgreSQL database connection is ready.',
    schema: healthCheckResponseSchema(readinessOkExample),
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL database connection is not ready.',
    schema: healthCheckResponseSchema(readinessUnavailableExample),
  })
  ready(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () =>
        this.typeOrmHealthIndicator.pingCheck('database', {
          timeout: 1000,
        }),
    ]);
  }
}
