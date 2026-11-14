BEGIN;

CREATE TYPE public.auth_identifier_type_enum AS ENUM ('EMAIL');

CREATE TABLE public.auth_identifier (
    id VARCHAR(26) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    account_id VARCHAR(26) NOT NULL,
    type public.auth_identifier_type_enum NOT NULL,
    value VARCHAR(320) NOT NULL,
    verified_at TIMESTAMPTZ NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uq_auth_identifier_type_value ON public.auth_identifier (type, value);
CREATE INDEX idx_auth_identifier_account_id ON public.auth_identifier (account_id);
ALTER TABLE public.auth_identifier ADD CONSTRAINT "FK_auth_identifier_account" FOREIGN KEY (account_id) REFERENCES public.account (id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.password_credential (
    id VARCHAR(26) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    account_id VARCHAR(26) NOT NULL,
    password_hash TEXT NOT NULL,
    hash_version VARCHAR(32) NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    last_failed_at TIMESTAMPTZ NULL,
    last_used_at TIMESTAMPTZ NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    disabled_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX uq_password_credential_account_id ON public.password_credential (account_id);
ALTER TABLE public.password_credential ADD CONSTRAINT "FK_password_credential_account" FOREIGN KEY (account_id) REFERENCES public.account (id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.auth_session (
    id VARCHAR(26) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    account_id VARCHAR(26) NOT NULL,
    access_version INTEGER NOT NULL DEFAULT 1,
    csrf_token_hash VARCHAR(64) NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    revocation_reason VARCHAR(64) NULL
);
CREATE INDEX idx_auth_session_account_id ON public.auth_session (account_id);
ALTER TABLE public.auth_session ADD CONSTRAINT "FK_auth_session_account" FOREIGN KEY (account_id) REFERENCES public.account (id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.auth_refresh_token (
    id VARCHAR(26) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    session_id VARCHAR(26) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by_id VARCHAR(26) NULL,
    parent_id VARCHAR(26) NULL
);
CREATE UNIQUE INDEX uq_auth_refresh_token_hash ON public.auth_refresh_token (token_hash);
CREATE UNIQUE INDEX uq_auth_refresh_token_parent_id ON public.auth_refresh_token (parent_id);
CREATE INDEX idx_auth_refresh_token_session_id ON public.auth_refresh_token (session_id);
ALTER TABLE public.auth_refresh_token ADD CONSTRAINT "FK_auth_refresh_token_session" FOREIGN KEY (session_id) REFERENCES public.auth_session (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE public.auth_identifier_type_enum OWNER TO hoos_app;
ALTER TABLE public.auth_identifier OWNER TO hoos_app;
ALTER TABLE public.password_credential OWNER TO hoos_app;
ALTER TABLE public.auth_session OWNER TO hoos_app;
ALTER TABLE public.auth_refresh_token OWNER TO hoos_app;

COMMIT;
