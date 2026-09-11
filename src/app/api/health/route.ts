import { NextResponse } from "next/server";
import { env } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Liveness endpoint for the deployment platform to poll.
 *
 * Database connectivity will be added to this check once a datastore exists;
 * until then it reports only that the process is up and its configuration
 * validated.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    environment: env.NODE_ENV,
    time: new Date().toISOString(),
  });
}
