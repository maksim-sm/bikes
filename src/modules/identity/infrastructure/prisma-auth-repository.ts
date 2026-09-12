import { prisma } from "@/lib/db";
import type { AuthUser, StoredAuthToken, StoredSession } from "../domain/auth";
import type { StaffRole } from "../domain/roles";
import type {
  AuthTokenRepository,
  SessionRepository,
  UserAccountRepository,
} from "../application/auth-ports";

const fromPrismaRole: Record<
  "ADMIN" | "MANAGER" | "INVENTORY" | "ORDER_MANAGEMENT",
  StaffRole
> = {
  ADMIN: "admin",
  MANAGER: "manager",
  INVENTORY: "inventory",
  ORDER_MANAGEMENT: "order_management",
};

function toUser(row: {
  id: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "STAFF";
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
  staffRoles: Array<{ role: keyof typeof fromPrismaRole }>;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    staffRoles: row.staffRoles.map((assignment) => fromPrismaRole[assignment.role]),
    emailVerifiedAt: row.emailVerifiedAt,
    disabledAt: row.disabledAt,
  };
}

export function createPrismaUserAccounts(): UserAccountRepository {
  return {
    async findByEmail(email) {
      const row = await prisma.user.findUnique({
        where: { email },
        include: { staffRoles: true },
      });
      return row ? toUser(row) : null;
    },
    async findById(id) {
      const row = await prisma.user.findUnique({
        where: { id },
        include: { staffRoles: true },
      });
      return row ? toUser(row) : null;
    },
    async create(input) {
      const row = await prisma.user.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
        },
        include: { staffRoles: true },
      });
      return toUser(row);
    },
    async save(user) {
      const row = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: user.passwordHash,
          emailVerifiedAt: user.emailVerifiedAt,
          disabledAt: user.disabledAt,
        },
        include: { staffRoles: true },
      });
      return toUser(row);
    },
  };
}

export function createPrismaSessions(): SessionRepository {
  return {
    async insert(session: StoredSession) {
      await prisma.authSession.create({
        data: {
          id: session.id,
          userId: session.userId,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        },
      });
    },
    async findByTokenHash(tokenHash) {
      const row = await prisma.authSession.findUnique({ where: { tokenHash } });
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
      };
    },
    async revoke(id, at) {
      await prisma.authSession.update({
        where: { id },
        data: { revokedAt: at },
      });
    },
    async revokeAllForUser(userId, at) {
      const result = await prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: at },
      });
      return result.count;
    },
  };
}

export function createPrismaAuthTokens(): AuthTokenRepository {
  return {
    async insert(token: StoredAuthToken) {
      await prisma.authToken.create({
        data: {
          id: token.id,
          userId: token.userId,
          type: token.type,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
        },
      });
    },
    async findByHash(tokenHash) {
      const row = await prisma.authToken.findUnique({ where: { tokenHash } });
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        userId: row.userId,
        type: row.type,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt,
      };
    },
    async consume(id, at) {
      await prisma.authToken.update({
        where: { id },
        data: { consumedAt: at },
      });
    },
  };
}
