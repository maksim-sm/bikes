import path from "node:path";
import type { MediaRepository, MediaStore } from "./ports";

export async function createFilesystemMediaStore(
  rootDir = path.join(process.cwd(), "storage", "media"),
): Promise<MediaStore> {
  const { createFilesystemMediaStore: create } = await import(
    "../infrastructure/filesystem-store"
  );
  return create(rootDir);
}

export async function createPrismaMediaRepository(): Promise<MediaRepository> {
  const { createPrismaMediaRepository: create } = await import(
    "../infrastructure/prisma-media-repository"
  );
  return create();
}
