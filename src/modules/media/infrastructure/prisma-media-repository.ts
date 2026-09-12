import { prisma } from "@/lib/db";
import type { MediaAsset } from "../domain/image";
import type { MediaRepository } from "../application/ports";

function toAsset(row: {
  id: string;
  key: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  originalName: string | null;
  createdAt: Date;
}): MediaAsset {
  return {
    id: row.id,
    key: row.key,
    contentType: row.contentType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    originalName: row.originalName,
    createdAt: row.createdAt,
  };
}

export function createPrismaMediaRepository(): MediaRepository {
  return {
    async save(asset) {
      const row = await prisma.mediaAsset.upsert({
        where: { id: asset.id },
        create: {
          id: asset.id,
          key: asset.key,
          contentType: asset.contentType,
          byteSize: asset.byteSize,
          width: asset.width,
          height: asset.height,
          originalName: asset.originalName,
          createdAt: asset.createdAt,
        },
        update: {
          key: asset.key,
          contentType: asset.contentType,
          byteSize: asset.byteSize,
          width: asset.width,
          height: asset.height,
          originalName: asset.originalName,
        },
      });
      return toAsset(row);
    },
    async findByKey(key) {
      const row = await prisma.mediaAsset.findUnique({ where: { key } });
      return row ? toAsset(row) : null;
    },
    async findById(id) {
      const row = await prisma.mediaAsset.findUnique({ where: { id } });
      return row ? toAsset(row) : null;
    },
    async delete(id) {
      await prisma.mediaAsset.delete({ where: { id } });
    },
  };
}
