BEGIN;

CREATE TYPE public.account_status_enum AS ENUM (
    'ACTIVE',
    'LOCKED',
    'DISABLED',
    'PENDING_DELETION',
    'ANONYMIZED'
);

CREATE TABLE public.account (
    id VARCHAR(26) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    status public.account_status_enum NOT NULL DEFAULT 'ACTIVE',
    anonymized_at TIMESTAMPTZ NULL
);

ALTER TYPE public.account_status_enum OWNER TO hoos_app;
ALTER TABLE public.account OWNER TO hoos_app;

COMMIT;