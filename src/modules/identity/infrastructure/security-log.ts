import { logger } from "@/lib/logger";
import type { SecurityLog } from "../application/auth-ports";

export function createSecurityLog(): SecurityLog {
  return {
    record(event, context) {
      logger.info(event, {
        ...(context.requestId !== undefined ? { requestId: context.requestId } : {}),
        ...(context.userId !== undefined ? { userId: context.userId } : {}),
        ...(context.email !== undefined ? { email: context.email } : {}),
      });
    },
  };
}
