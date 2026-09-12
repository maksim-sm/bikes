"use server";

import { getMediaServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { requireAdminCatalog } from "../../_lib/staff";

export type MediaUploadState = { ok: true; key: string } | { ok: false; message: string };

const UPLOAD_ERRORS: Record<string, string> = {
  media_empty: t.admin.uploadEmpty,
  media_too_large: t.admin.uploadTooLarge,
  media_type_invalid: t.admin.uploadTypeInvalid,
};

export async function uploadMediaAction(formData: FormData): Promise<MediaUploadState> {
  const principal = await requireAdminCatalog();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: t.admin.uploadEmpty };
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = await getMediaServices();
    const asset = await media.upload(principal, {
      bytes,
      filename: file.name,
      claimedType: file.type,
    });
    return { ok: true, key: asset.key };
  } catch (error) {
    if (isAppError(error)) {
      const reason = String(error.context.reason ?? "");
      return { ok: false, message: UPLOAD_ERRORS[reason] ?? t.admin.uploadFailed };
    }
    return { ok: false, message: t.admin.uploadFailed };
  }
}
