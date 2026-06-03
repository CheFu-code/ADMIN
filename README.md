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
NEXT_PUBLIC_ACCOUNT_APP_URL=http://localhost:3000
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

Admin sign-in is handled by CheFu Account. The Admin app redirects to:

```txt
{NEXT_PUBLIC_ACCOUNT_APP_URL}/login?app=admin&returnTo=...
```

## Development

```bash
npm install
npm run dev -- -p 3004
```

The first admin duty is Flow access-key management. Admins sign in with a
CheFu Account that has the `admin` role, generate a Flow employee key, copy the
key once, and give it to the employee.
