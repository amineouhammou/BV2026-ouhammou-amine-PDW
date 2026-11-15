# Authentication security regression tests

Run with:

```text
npm run test:security
```

The suite combines focused cryptographic tests with real PostgreSQL/NestJS
attack tests. It covers ES256-only JWT verification, claim validation, opaque
refresh-token storage and rotation, replay-family revocation, concurrent
refreshes, transaction rollback, cookie transport, CSRF/origin enforcement,
session revocation, account/session mismatches, and authentication throttling.

These tests demonstrate resistance to the tested scenarios. They do not prove
that the application is free from all security vulnerabilities.

The integration suite creates a process-isolated PostgreSQL schema, runs the
real migrations, and removes that schema after completion. Database settings
come from existing environment variables or the local `.env`; production data
is never truncated or reused by the suite.
