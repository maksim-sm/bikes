import { getMediaServices } from "@/app/api/_lib/compose";
import { isMediaKey, placeholderSvg } from "@/modules/media";

export const dynamic = "force-dynamic";

/** Keys are immutable object ids. Redis is not required to cache these bytes. */
const MEDIA_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const key = (await context.params).key.map(decodeURIComponent).join("/");
  if (!isMediaKey(key)) {
    return new Response("Not found", { status: 404 });
  }
  const object = await (await getMediaServices()).getObject(key);
  if (object) {
    return new Response(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        "content-type": object.contentType,
        "cache-control": MEDIA_CACHE_CONTROL,
        "x-content-type-options": "nosniff",
      },
    });
  }
  return new Response(placeholderSvg(key), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": MEDIA_CACHE_CONTROL,
      "x-content-type-options": "nosniff",
    },
  });
}
