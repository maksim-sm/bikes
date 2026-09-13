# Media

Status: companion to ADR-0007. Bicycle photos live behind the `media` module.
Other modules keep **opaque keys**, never bucket URLs.

## Object storage

`MediaStore` is the only place bytes are written:

| Environment | Implementation                         |
| ----------- | -------------------------------------- |
| Tests       | In-memory map                          |
| Development | Local filesystem under `storage/media` |
| Production  | Same filesystem interface today        |

An S3-compatible backend is a new `MediaStore` implementation, not a change to
catalog rows. Keys look like `2026/09/<uuid>.jpg` — generated ids, never the
upload filename.

## Validation

Uploads do **not** trust the file extension or the client `Content-Type`. The
service sniffs magic bytes and accepts only JPEG, PNG, and WebP, up to 8 MB.
HTML, SVG, and GIF are rejected even when named `bike.jpg` and sent as
`image/jpeg`. The stored key's extension comes from the sniffed type.

Metadata on `media`: key, sniffed content type, byte size, width, height, and a
sanitized original filename (path segments stripped; not used as the object
key).

`GET /api/media/…` serves stored bytes with `X-Content-Type-Options: nosniff`
and `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
Unknown demo keys still render the SVG placeholder. Storefront `<img>` tags
set width/height (default 1200×800) so cards do not shift (`docs/performance.md`).

## Associations

`catalog` owns `product_media` and `variant_media`: alt text, primary/gallery
role, and `sort_order`. Staff upload on `/admin/products`, then attach, reorder,
or remove images. Removing an image from a product deletes the object only when
no other product or variant still references that key.
