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

The production project must have the Firebase SQL Connect API enabled before any web query or mutation can succeed.

Enable the API for the PawSattva Google Cloud project:

```bash
gcloud services enable firebasedataconnect.googleapis.com --project=pawsattva
```

After the API reports enabled, deploy the checked-in Data Connect schema and connector:

```bash
npm run firebase:logger:deploy
```

Equivalent direct command:

```bash
npx -y firebase-tools@latest deploy --only dataconnect --project pawsattva
```

If the API was just enabled, allow a few minutes for Google Cloud service activation to propagate before retrying the web logger.

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

## Production 403: SERVICE_DISABLED

If the browser reports `403 PERMISSION_DENIED` with `reason: SERVICE_DISABLED` for `firebasedataconnect.googleapis.com`, the application code is reaching the correct Google API endpoint but the API is disabled for the project.

The fix is infrastructure activation, not a Netlify change:

1. Enable `firebasedataconnect.googleapis.com` for project `pawsattva`.
2. Deploy Data Connect with `npm run firebase:logger:deploy`.
3. Wait for activation/deployment propagation.
4. Reload `/logger` and use **Retry database** if the unavailable banner is still visible.

The web client now detects this specific condition and opens a local circuit breaker so it does not keep repeating failing SQL requests while the service is disabled.
