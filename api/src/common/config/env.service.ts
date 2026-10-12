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
  get dbHost():string{
    return this.configService.get<string>('DB_HOST') ?? 'localhost';
  }
  get dbPort():number{
    return this.configService.get<number>('DB_PORT') ?? 5432;
  }
  get dbUser():string{
    return this.configService.get<string>('DB_USER') ?? 'localhost';
  }
  get dbPassword():string{
    return this.configService.get<string>('DB_PASSWORD') ?? 'localhost';
  }

  get dbName():string{
    return this.configService.get<string>('DB_NAME') ?? 'localhost';
  }
}