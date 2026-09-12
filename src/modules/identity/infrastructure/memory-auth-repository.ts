import type { AuthUser, StoredAuthToken, StoredSession } from "../domain/auth";
import type {
  AuthTokenRepository,
  SessionRepository,
  UserAccountRepository,
} from "../application/auth-ports";

export function createMemoryUserAccounts(): UserAccountRepository {
  const users = new Map<string, AuthUser>();
  const byEmail = new Map<string, string>();
  return {
    async findByEmail(email) {
      const id = byEmail.get(email);
      return id ? (users.get(id) ?? null) : null;
    },
    async findById(id) {
      return users.get(id) ?? null;
    },
    async create(input) {
      const user: AuthUser = {
        id: crypto.randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        staffRoles: [],
        emailVerifiedAt: null,
        disabledAt: null,
      };
      users.set(user.id, user);
      byEmail.set(user.email, user.id);
      return user;
    },
    async save(user) {
      users.set(user.id, user);
      byEmail.set(user.email, user.id);
      return user;
    },
  };
}

export function createMemorySessions(): SessionRepository {
  const rows = new Map<string, StoredSession>();
  return {
    async insert(session) {
      rows.set(session.id, session);
    },
    async findByTokenHash(tokenHash) {
      return [...rows.values()].find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async revoke(id, at) {
      const row = rows.get(id);
      if (row) {
        rows.set(id, { ...row, revokedAt: at });
      }
    },
    async revokeAllForUser(userId, at) {
      let count = 0;
      for (const row of rows.values()) {
        if (row.userId === userId && row.revokedAt === null) {
          rows.set(row.id, { ...row, revokedAt: at });
          count += 1;
        }
      }
      return count;
    },
  };
}

export function createMemoryAuthTokens(): AuthTokenRepository {
  const rows = new Map<string, StoredAuthToken>();
  return {
    async insert(token) {
      rows.set(token.id, token);
    },
    async findByHash(tokenHash) {
      return [...rows.values()].find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async consume(id, at) {
      const row = rows.get(id);
      if (row) {
        rows.set(id, { ...row, consumedAt: at });
      }
    },
  };
}
