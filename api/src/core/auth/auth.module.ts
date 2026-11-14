import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from '@core/account/account.module.js';

import { AuthIdentifierEntity } from './data/entity/auth-identifier.entity.js';
import { AuthRefreshTokenEntity } from './data/entity/auth-refresh-token.entity.js';
import { AuthSessionEntity } from './data/entity/auth-session.entity.js';
import { PasswordCredentialEntity } from './data/entity/password-credential.entity.js';
import { AuthCookieService } from './service/auth-cookie.service.js';
import { AuthIdentifierService } from './service/auth-identifier.service.js';
import { CsrfService } from './service/csrf.service.js';
import { PasswordCredentialService } from './service/password-credential.service.js';
import { PasswordHasherService } from './service/password-hasher.service.js';
import { PasswordPolicyService } from './service/password-policy.service.js';
import { TokenCryptoService } from './service/token-crypto.service.js';

@Module({
  imports: [
    AccountModule,
    TypeOrmModule.forFeature([
      AuthIdentifierEntity,
      PasswordCredentialEntity,
      AuthSessionEntity,
      AuthRefreshTokenEntity,
    ]),
  ],
  providers: [
    AuthIdentifierService,
    PasswordCredentialService,
    PasswordHasherService,
    PasswordPolicyService,
    AuthCookieService,
    CsrfService,
    TokenCryptoService,
  ],
})
export class AuthModule {}
