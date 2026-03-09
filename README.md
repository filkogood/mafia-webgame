# mafia-webgame

A friend-only Mafia web game built with React + Socket.IO.

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Create your local environment file
cp .env.example .env

# 3. Start both server and client concurrently
pnpm dev
```

Run the test suite (no build step required):

```bash
pnpm test
```

## Admin Authentication (TOTP)

Room creation is restricted to the **admin** (service owner). Admin access is granted via a TOTP (Time-based One-Time Password) code – compatible with any standard authenticator app (Google Authenticator, Authy, etc.).

### Setup

1. Generate a Base32 TOTP secret:
   ```bash
   node -e "const b='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let s='';for(let i=0;i<32;i++)s+=b[Math.floor(Math.random()*32)];console.log(s)"
   ```

2. Add the secret to the server environment:
   ```env
   ADMIN_TOTP_SECRET=YOUR_BASE32_SECRET
   ```

3. Scan the secret into your authenticator app using this URI format:
   ```
   otpauth://totp/MafiaWebGame%3Aadmin?secret=YOUR_BASE32_SECRET&issuer=MafiaWebGame
   ```
   (Or use any TOTP QR code generator to produce a scannable QR code.)

4. Set `CLIENT_ORIGIN` and `VITE_SERVER_URL` in your `.env` if the client and server run on different hosts.

### Admin Login Flow

1. Open the game and click **🔑 관리자 로그인** (bottom-left of the lobby).
2. Enter the 6-digit TOTP code from your authenticator app.
3. On success, the session is valid for **12 hours** (HttpOnly cookie + in-memory token).
4. Once logged in, the **방 만들기** (Create Room) button appears in the lobby.

### Permissions Summary

| Action | Required |
|---|---|
| Create room | Admin session |
| Join room | Any player |
| Download public log | Game participant |
| Download full audit log | Host **or** Admin |

## Environment Variables

See [`.env.example`](.env.example) for all available variables.
