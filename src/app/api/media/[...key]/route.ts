import { getMediaServices } from "@/app/api/_lib/compose";
import { isMediaKey, placeholderSvg } from "@/modules/media";

export const dynamic = "force-dynamic";

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
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  }
  return new Response(placeholderSvg(key), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
