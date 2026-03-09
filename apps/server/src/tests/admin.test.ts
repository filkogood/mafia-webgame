import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  verifyTotp,
  createAdminSession,
  isValidAdminSession,
  revokeAdminSession,
  adminSessions,
  ADMIN_SESSION_EXPIRY_MS,
} from '../auth/adminAuth';
import {
  canDownloadFullLog,
  completedGames,
} from '../log/gameLog';
import { buildPublicLog, makeGameEnded } from '../log/gameLog';
import { GameLog, Player, Role, Phase, DEFAULT_SETTINGS } from '@mafia/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(id: string, role: Role, extra: Partial<Player> = {}): Player {
  return {
    id,
    nickname: `nick_${id}`,
    role,
    isAlive: true,
    isCouple: false,
    couplePairId: null,
    isDrunk: false,
    drunkExpiresAfterVote2: null,
    isVoteBlocked: false,
    voteBlockExpiresAfterVote2: null,
    isHypnotized: false,
    hypnotizedExpiresAtVote2: null,
    hasInheritedMafia: false,
    knownMafiaTeam: null,
    ghostVotesUsedVote1: false,
    ghostVotesUsedVote2: false,
    ...extra,
  };
}

function makeRoom(
  id: string,
  hostId: string,
  players: Player[],
  phase: Phase = Phase.ENDED
) {
  return {
    id,
    hostId,
    players,
    phase,
    round: 1,
    settings: { ...DEFAULT_SETTINGS },
    vote1Candidate: null,
    vote1Tally: {},
    vote2Tally: { yes: 0, no: 0 },
    nightActions: {},
    quickFinishVotes: [],
  };
}

// ---------------------------------------------------------------------------
// 1. TOTP verification
// ---------------------------------------------------------------------------

describe('verifyTotp', () => {
  // Known TOTP test vector: secret 'JBSWY3DPEHPK3PXP' (base32 for 'Hello!')
  // We cannot easily pre-compute a valid code without time control, so we test
  // structural validations and invalid paths.

  it('returns false for an empty code', () => {
    expect(verifyTotp('', 'JBSWY3DPEHPK3PXP')).toBe(false);
  });

  it('returns false for an empty secret', () => {
    expect(verifyTotp('123456', '')).toBe(false);
  });

  it('returns false for a non-digit code', () => {
    expect(verifyTotp('abcdef', 'JBSWY3DPEHPK3PXP')).toBe(false);
  });

  it('returns false for a wrong-length code', () => {
    expect(verifyTotp('12345', 'JBSWY3DPEHPK3PXP')).toBe(false);
    expect(verifyTotp('1234567', 'JBSWY3DPEHPK3PXP')).toBe(false);
  });

  it('returns false for an invalid base32 secret', () => {
    expect(verifyTotp('123456', 'NOT!VALID@BASE32')).toBe(false);
  });

  it('returns false for a code that does not match current time window', () => {
    // '000000' is astronomically unlikely to be the real current TOTP
    expect(verifyTotp('000000', 'JBSWY3DPEHPK3PXP')).toBe(false);
  });

  it('returns true when the code matches the current TOTP window (mocked time)', () => {
    // Fix time to a known epoch so we can compute the expected HOTP value
    const fixedEpochMs = 1700000000000; // 2023-11-14T...
    const secret = 'JBSWY3DPEHPK3PXP';

    vi.spyOn(Date, 'now').mockReturnValue(fixedEpochMs);

    // Compute the expected code using the same algorithm
    const crypto = require('crypto');
    function base32Decode(input: string): Buffer {
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const s = input.toUpperCase().replace(/=+$/, '');
      let bits = 0, value = 0;
      const output: number[] = [];
      for (const ch of s) {
        const idx = alpha.indexOf(ch);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
      }
      return Buffer.from(output);
    }
    const key = base32Decode(secret);
    const counter = BigInt(Math.floor(fixedEpochMs / 1000 / 30));
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(counter);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const raw =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const expectedCode = (raw % 1_000_000).toString().padStart(6, '0');

    expect(verifyTotp(expectedCode, secret)).toBe(true);
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// 2. Session issuance and expiry
// ---------------------------------------------------------------------------

describe('createAdminSession / isValidAdminSession', () => {
  beforeEach(() => adminSessions.clear());
  afterEach(() => {
    adminSessions.clear();
    vi.restoreAllMocks();
  });

  it('creates a valid session token', () => {
    const token = createAdminSession();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes hex
    expect(isValidAdminSession(token)).toBe(true);
  });

  it('returns false for an unknown token', () => {
    expect(isValidAdminSession('unknown-token')).toBe(false);
  });

  it('returns false for undefined / null', () => {
    expect(isValidAdminSession(undefined)).toBe(false);
    expect(isValidAdminSession(null)).toBe(false);
  });

  it('returns false after the session has expired (fake timers)', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const token = createAdminSession();
    expect(isValidAdminSession(token)).toBe(true);

    // Advance time beyond 12h
    vi.spyOn(Date, 'now').mockReturnValue(now + ADMIN_SESSION_EXPIRY_MS + 1);
    expect(isValidAdminSession(token)).toBe(false);

    // Expired session should be removed from the store
    expect(adminSessions.has(token)).toBe(false);
  });

  it('allows multiple concurrent sessions', () => {
    const t1 = createAdminSession();
    const t2 = createAdminSession();
    expect(t1).not.toBe(t2);
    expect(isValidAdminSession(t1)).toBe(true);
    expect(isValidAdminSession(t2)).toBe(true);
  });
});

describe('revokeAdminSession', () => {
  beforeEach(() => adminSessions.clear());

  it('invalidates the token after revocation', () => {
    const token = createAdminSession();
    revokeAdminSession(token);
    expect(isValidAdminSession(token)).toBe(false);
  });

  it('does not throw when revoking an unknown token', () => {
    expect(() => revokeAdminSession('unknown')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Room creation forbidden without admin
// ---------------------------------------------------------------------------

describe('create_room requires admin', () => {
  // We test the guard logic directly (without a live socket server).
  // The actual socket handler calls isValidAdminSession(adminToken).

  beforeEach(() => adminSessions.clear());

  it('isValidAdminSession returns false for undefined (no token)', () => {
    expect(isValidAdminSession(undefined)).toBe(false);
  });

  it('isValidAdminSession returns true for a valid session (room creation allowed)', () => {
    const token = createAdminSession();
    expect(isValidAdminSession(token)).toBe(true);
  });

  it('isValidAdminSession returns false for a random string (room creation blocked)', () => {
    expect(isValidAdminSession('random-garbage')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Full audit log download: host without admin; admin without being host
// ---------------------------------------------------------------------------

describe('canDownloadFullLog with admin override', () => {
  const players = [
    makePlayer('host1', Role.MAFIA),
    makePlayer('player2', Role.CITIZEN),
  ];

  beforeEach(() => {
    adminSessions.clear();
    completedGames.clear();
  });

  it('allows host to download full log without admin session', () => {
    const room = makeRoom('ROOM_FL', 'host1', players, Phase.ENDED);
    expect(canDownloadFullLog('ROOM_FL', 'host1', room)).toBe(true);
  });

  it('denies non-host player without admin', () => {
    const room = makeRoom('ROOM_FL', 'host1', players, Phase.ENDED);
    expect(canDownloadFullLog('ROOM_FL', 'player2', room)).toBe(false);
  });

  it('admin session is valid independently of host status', () => {
    // A player who is NOT the host but has a valid admin session should be
    // granted access. The route handler checks isValidAdminSession(token)
    // as a bypass — we verify the session issuance side here.
    const adminToken = createAdminSession();
    expect(isValidAdminSession(adminToken)).toBe(true);
    // canDownloadFullLog itself only checks host; admin bypass lives in the route.
    // So we verify that the non-host player cannot pass the host check alone:
    const room = makeRoom('ROOM_FL2', 'host1', players, Phase.ENDED);
    expect(canDownloadFullLog('ROOM_FL2', 'player2', room)).toBe(false);
    // …but the admin token itself is valid (route would skip host check).
    expect(isValidAdminSession(adminToken)).toBe(true);
  });

  it('falls back to completedGames for host check when room is absent', () => {
    completedGames.set('OLD_ROOM', {
      timestamp: '2024-01-01T00-00-00-000Z',
      hostId: 'host1',
      playerIds: ['host1', 'player2'],
    });
    expect(canDownloadFullLog('OLD_ROOM', 'host1')).toBe(true);
    expect(canDownloadFullLog('OLD_ROOM', 'player2')).toBe(false);
    completedGames.delete('OLD_ROOM');
  });
});
