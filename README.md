<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Banco PMVs DOT

Aplicacao React/Vite com servidor Express para o portfolio de PMVs DOT, integrada ao Firebase/Firestore e sincronizacao automatica via Google Sheets.

View your app in AI Studio: https://ai.studio/apps/a3d07f4f-6342-4699-a2ac-181066051ec0

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and configure the required Firebase/sync values.
3. Run the app:

   ```bash
   npm run dev
   ```

## Environment

Required for the frontend Firebase SDK:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`

Required for the server sync endpoint:

- `SYNC_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_ID`
- `FIREBASE_SERVICE_ACCOUNT`

Do not commit real service account keys, private keys, `.env` files, or GitHub tokens.

## Google Sheets Sync

The Apps Script sync reads credentials from Script Properties:

- `SYNC_API_KEY` for `sync-script.gs`
- `FIREBASE_PRIVATE_KEY` for `sync-script-direct.gs`

After adding these properties in Apps Script, schedule `syncPortfolio` with a trigger.

## Checks

```bash
npm run lint
npm run build
```
