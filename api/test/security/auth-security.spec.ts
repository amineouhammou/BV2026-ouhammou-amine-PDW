import { jest } from '@jest/globals';
import { generateKeyPairSync, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import type { Response } from 'express';

import { TokenCryptoService } from '../../src/core/auth/service/token-crypto.service.js';
import { AuthCookieService } from '../../src/core/auth/service/auth-cookie.service.js';
import { CsrfService } from '../../src/core/auth/service/csrf.service.js';
import { AuthSessionEntity } from '../../src/core/auth/data/entity/auth-session.entity.js';

const accountId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const sessionId = '01ARZ3NDEKTSV4RRFFQ69G5FAW';

const createFixture = (): {
  service: TokenCryptoService;
  privateKey: string;
} => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const privateKey = pair.privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const publicKey = pair.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const env = {
    jwtActiveKid: 'test-kid',
    jwtPrivateKeyBase64: Buffer.from(privateKey).toString('base64'),
    jwtPublicKeysJson: JSON.stringify({
      'test-kid': Buffer.from(publicKey).toString('base64'),
    }),
    refreshTokenPepper: randomBytes(32).toString('base64'),
    accessTokenTtlSeconds: 600,
    isProduction: false,
  };
  return {
    service: new TokenCryptoService(env as never),
    privateKey,
  };
};

const createService = (): TokenCryptoService => createFixture().service;

describe('Authentication security regression suite', () => {
  it('JWT-01 rejects unsigned alg=none tokens', () => {
    const service = createService();
    const token = [
      Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'at+jwt', kid: 'test-kid' }),
      ).toString('base64url'),
      Buffer.from(
        JSON.stringify({ sub: accountId, sid: sessionId, ver: 1 }),
      ).toString('base64url'),
      '',
    ].join('.');
    expect(() => service.verifyAccessToken(token)).toThrow();
  });

  it('JWT-02 rejects HS256 algorithm confusion', () => {
    const service = createService();
    const token = jwt.sign(
      { sub: accountId, sid: sessionId, ver: 1 },
      'attacker-secret',
      {
        algorithm: 'HS256',
        header: { alg: 'HS256', typ: 'at+jwt', kid: 'test-kid' },
      },
    );
    expect(() => service.verifyAccessToken(token)).toThrow();
  });

  it('JWT-03 accepts only a correctly signed ES256 token', () => {
    const service = createService();
    const token = service.signAccessToken(accountId, sessionId, 1);
    expect(service.verifyAccessToken(token)).toMatchObject({
      sub: accountId,
      sid: sessionId,
      ver: 1,
    });
  });

  it('JWT-04 rejects modified payloads, wrong claims, unknown kid, and remote key metadata', () => {
    const service = createService();
    const valid = service.signAccessToken(accountId, sessionId, 1);
    const [header, , signature] = valid.split('.');
    const modified = `${header}.${Buffer.from(
      JSON.stringify({ sub: accountId, sid: sessionId, ver: 2 }),
    ).toString('base64url')}.${signature}`;
    expect(() => service.verifyAccessToken(modified)).toThrow();

    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const attacker = jwt.sign(
      { sub: accountId, sid: sessionId, ver: 1 },
      pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      {
        algorithm: 'ES256',
        issuer: 'wrong-issuer',
        audience: 'wrong-audience',
        header: {
          alg: 'ES256',
          typ: 'JWT',
          kid: '../attacker',
          jku: 'https://attacker.invalid/jwks.json',
        },
      },
    );
    expect(() => service.verifyAccessToken(attacker)).toThrow();
  });

  it('JWT-05 rejects malformed and oversized access tokens', () => {
    const service = createService();
    expect(() => service.verifyAccessToken('not-a-jwt')).toThrow();
    expect(() => service.verifyAccessToken('x'.repeat(4097))).toThrow();
  });

  it('JWT-06 rejects a wrong token type and unknown kid before verification', () => {
    const service = createService();
    const valid = service.signAccessToken(accountId, sessionId, 1);
    const [, payload, signature] = valid.split('.');
    const wrongType = `${Buffer.from(
      JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'test-kid' }),
    ).toString('base64url')}.${payload}.${signature}`;
    const unknownKid = `${Buffer.from(
      JSON.stringify({ alg: 'ES256', typ: 'at+jwt', kid: '../unknown' }),
    ).toString('base64url')}.${payload}.${signature}`;
    expect(() => service.verifyAccessToken(wrongType)).toThrow();
    expect(() => service.verifyAccessToken(unknownKid)).toThrow();
  });

  it('JWT-07 rejects correctly signed tokens with wrong issuer or audience', () => {
    const { service, privateKey } = createFixture();
    const sign = (issuer: string, audience: string): string =>
      jwt.sign({ sub: accountId, sid: sessionId, ver: 1 }, privateKey, {
        algorithm: 'ES256',
        issuer,
        audience,
        expiresIn: 600,
        jwtid: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
        header: { alg: 'ES256', typ: 'at+jwt', kid: 'test-kid' },
      });

    expect(() =>
      service.verifyAccessToken(sign('attacker-api', 'hoos-web')),
    ).toThrow();
    expect(() =>
      service.verifyAccessToken(sign('hoos-api', 'attacker-web')),
    ).toThrow();
  });

  it('JWT-08 rejects expired tokens and missing required claims', () => {
    const { service, privateKey } = createFixture();
    const options = {
      algorithm: 'ES256' as const,
      issuer: 'hoos-api',
      audience: 'hoos-web',
      jwtid: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
      header: {
        alg: 'ES256' as const,
        typ: 'at+jwt',
        kid: 'test-kid',
      },
    };
    const expired = jwt.sign(
      { sub: accountId, sid: sessionId, ver: 1 },
      privateKey,
      { ...options, expiresIn: -10 },
    );
    const missingSession = jwt.sign({ sub: accountId, ver: 1 }, privateKey, {
      ...options,
      expiresIn: 600,
    });

    expect(() => service.verifyAccessToken(expired)).toThrow();
    expect(() => service.verifyAccessToken(missingSession)).toThrow();
  });
  it('REFRESH-01 creates 256-bit opaque tokens and only stores fingerprints', () => {
    const service = createService();
    const token = service.createOpaqueToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(service.fingerprint(token)).not.toContain(token);
    expect(service.fingerprint(token)).toHaveLength(64);
  });

  it('CSRF-01 compares the submitted header against the session-bound hash', () => {
    const service = createService();
    const csrfToken = service.createOpaqueToken();
    const session = new AuthSessionEntity();
    session.csrfTokenHash = service.fingerprint(csrfToken);
    const request = {
      header: (name: string) =>
        name === 'X-CSRF-Token' ? csrfToken : undefined,
    } as never;
    expect(() =>
      new CsrfService(service).assertValid(request, session),
    ).not.toThrow();
    const invalidRequest = { header: () => 'wrong-token' } as never;
    expect(() =>
      new CsrfService(service).assertValid(invalidRequest, session),
    ).toThrow();
  });

  it('COOKIE-01 uses hardened production cookie attributes', () => {
    const service = new AuthCookieService({
      isProduction: true,
      accessTokenTtlSeconds: 600,
    } as never);
    const cookieMock = jest.fn();
    const clearCookieMock = jest.fn();
    const response = {
      cookie: cookieMock,
      clearCookie: clearCookieMock,
    } as unknown as Response;
    const expiresAt = new Date(Date.now() + 60_000);
    service.setAccessCookie(response, 'access');
    service.setRefreshCookie(response, 'refresh', expiresAt);
    service.setCsrfCookie(response, 'csrf', expiresAt);
    service.clearAuthCookies(response);

    expect(service.names).toEqual({
      access: '__Host-hoos-access',
      refresh: '__Host-hoos-refresh',
      csrf: '__Host-hoos-csrf',
    });
    expect(cookieMock).toHaveBeenCalledWith(
      '__Host-hoos-access',
      'access',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
    expect(cookieMock).toHaveBeenCalledWith(
      '__Host-hoos-refresh',
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        expires: expiresAt,
      }),
    );
    expect(cookieMock).toHaveBeenCalledWith(
      '__Host-hoos-csrf',
      'csrf',
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
    expect(clearCookieMock).toHaveBeenCalledTimes(3);
    expect(clearCookieMock).toHaveBeenCalledWith(
      '__Host-hoos-access',
      expect.objectContaining({ httpOnly: true, secure: true, path: '/' }),
    );
    expect(clearCookieMock).toHaveBeenCalledWith(
      '__Host-hoos-refresh',
      expect.objectContaining({ httpOnly: true, secure: true, path: '/' }),
    );
    expect(clearCookieMock).toHaveBeenCalledWith(
      '__Host-hoos-csrf',
      expect.objectContaining({ httpOnly: false, secure: true, path: '/' }),
    );
  });
});
