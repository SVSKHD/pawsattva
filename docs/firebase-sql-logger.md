# PawSattva Logger — Firebase SQL Connect

The `/logger` feature uses Firebase SQL Connect (Cloud SQL for PostgreSQL). It does not use Supabase.

## Resource defaults

The checked-in application defaults are:

- SQL Connect service: `pawsattva-logger`
- connector: `logger`
- region: `asia-south1`
- Cloud SQL instance: `pawsattva-postgres`
- PostgreSQL database: `pawsattva`

The SQL Connect service and the Cloud SQL PostgreSQL instance must be in the same region.

## First-time Firebase setup

From the repository root, authenticate the Firebase CLI and initialize/provision SQL Connect for the PawSattva Firebase project. Keep the resource names above, or update `dataconnect/dataconnect.yaml` to the resource names you choose.

Then deploy the schema and connector:

```bash
npx -y firebase-tools@latest deploy --only dataconnect
```

The Firebase console/CLI provisioning flow creates or links the Cloud SQL for PostgreSQL instance. The repository cannot provision a Cloud SQL instance without credentials for the target Firebase/Google Cloud project.

## Web runtime configuration

The checked-in runtime client uses the same defaults as `dataconnect.yaml`. If you choose different names, set:

```text
NEXT_PUBLIC_FIREBASE_SQL_SERVICE_ID=...
NEXT_PUBLIC_FIREBASE_SQL_CONNECTOR_ID=...
NEXT_PUBLIC_FIREBASE_SQL_LOCATION=...
```

These are resource identifiers, not database passwords. The web app authenticates using the existing Firebase Authentication session.

## Data model

`LoggerProfile`
- Firebase UID primary key
- phone
- WhatsApp phone
- same-as-phone flag
- created/updated timestamps

`PetLoggerEntry`
- Firebase UID owner
- log date
- pet name
- meal type/time
- food/recipe
- quantity
- water
- treats
- notes
- created timestamp

## Authorization

Every client operation is `@auth(level: USER)`.

Ownership is enforced inside the deployed connector:
- profile reads/writes use `auth.uid` directly as the profile key
- logger list queries always filter `userId == auth.uid`
- logger inserts set `userId` from `auth.uid`
- delete requires both the requested entry id and `userId == auth.uid`

The client never supplies an owner UID to the PostgreSQL mutation.
