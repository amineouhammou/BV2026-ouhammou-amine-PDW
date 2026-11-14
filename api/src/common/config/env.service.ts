import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvService {
  constructor(private readonly configService: ConfigService) {}

  get appPort(): number {
    return this.configService.get<number>('PORT') ?? 3000;
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') ?? 'development';
  }
  get dbHost(): string {
    return this.configService.get<string>('DB_HOST') ?? 'localhost';
  }
  get dbPort(): number {
    return this.configService.get<number>('DB_PORT') ?? 5432;
  }
  get dbUser(): string {
    return this.configService.get<string>('DB_USER') ?? 'localhost';
  }
  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD') ?? 'localhost';
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME') ?? 'localhost';
  }

  get passwordMinLength(): number {
    return this.configService.get<number>('AUTH_PASSWORD_MIN_LENGTH') ?? 15;
  }
  get passwordMaxLength(): number {
    return this.configService.get<number>('AUTH_PASSWORD_MAX_LENGTH') ?? 128;
  }
  get passwordArgon2MemoryCost(): number {
    return (
      this.configService.get<number>('AUTH_PASSWORD_ARGON2_MEMORY_COST') ??
      19456
    );
  }
  get passwordArgon2TimeCost(): number {
    return (
      this.configService.get<number>('AUTH_PASSWORD_ARGON2_TIME_COST') ?? 2
    );
  }
  get passwordArgon2Parallelism(): number {
    return (
      this.configService.get<number>('AUTH_PASSWORD_ARGON2_PARALLELISM') ?? 1
    );
  }
  get passwordMaxAttempts(): number {
    return this.configService.get<number>('AUTH_PASSWORD_MAX_ATTEMPTS') ?? 5;
  }
  get passwordLockoutSeconds(): number {
    return (
      this.configService.get<number>('AUTH_PASSWORD_LOCKOUT_SECONDS') ?? 900
    );
  }
  get accessTokenTtlSeconds(): number {
    return (
      this.configService.get<number>('AUTH_ACCESS_TOKEN_TTL_SECONDS') ?? 600
    );
  }
  get refreshTokenTtlSeconds(): number {
    return (
      this.configService.get<number>('AUTH_REFRESH_TOKEN_TTL_SECONDS') ?? 604800
    );
  }
  get sessionAbsoluteTtlSeconds(): number {
    return (
      this.configService.get<number>('AUTH_SESSION_ABSOLUTE_TTL_SECONDS') ??
      2592000
    );
  }
  get refreshTokenPepper(): string {
    return this.configService.get<string>('AUTH_REFRESH_TOKEN_PEPPER') ?? '';
  }
  get jwtActiveKid(): string {
    return (
      this.configService.get<string>('AUTH_JWT_ACTIVE_KID') ?? 'dev-active'
    );
  }
  get jwtPrivateKeyBase64(): string {
    return this.configService.get<string>('AUTH_JWT_PRIVATE_KEY_BASE64') ?? '';
  }
  get jwtPublicKeysJson(): string {
    return this.configService.get<string>('AUTH_JWT_PUBLIC_KEYS_JSON') ?? '{}';
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
