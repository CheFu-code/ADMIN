# CheFu Admin

CheFu Admin is the internal operations console for admin-only workflows.

Production host:

```txt
https://internal.chefuinc.com
```

## Local Environment

Create `admin/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

The backend must allow the admin app origin. Local development uses:

```txt
http://localhost:3004
```

Production uses:

```txt
https://internal.chefuinc.com
```

For shared CheFu cookies in production, the backend should keep
`AUTH_COOKIE_DOMAIN=.chefuinc.com`.

## Development

```bash
npm install
npm run dev -- -p 3004
```

The first admin duty is Flow access-key management. Admins sign in with a
CheFu Account that has the `admin` role, generate a Flow employee key, copy the
key once, and give it to the employee.
