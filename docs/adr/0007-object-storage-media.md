# ADR-0007: Object storage for media, referenced by opaque keys

- Status: Accepted
- Date: 2026-09-11

## Context

Product photography is the bulk of this store's content and the main driver of
its page weight. Bicycles are sold on their appearance, so images are numerous,
large, and frequently replaced. The hosting target is unresolved, so the storage
backend cannot be assumed.

## Decision

Media lives in **S3-compatible object storage** in production, behind the
`media` module's interface. Other modules store and pass **opaque keys**, never
URLs.

```ts
export interface MediaStore {
  put(file: Blob, opts: { contentType: string }): Promise<{ key: string }>;
  urlFor(key: string, variant?: "thumb" | "card" | "full"): string;
  delete(key: string): Promise<void>;
}
```

- A **local filesystem implementation is the development default**, so the
  application runs with no cloud credentials.
- `catalog` owns which images belong to which product; `media` owns the bytes
  and knows nothing about products.
- Uploads validate content type and size at the boundary. Derivative sizes are
  generated rather than serving full-resolution originals to the storefront.
- Images are never committed to the repository.

## Alternatives considered

**Store images in PostgreSQL as bytea.** Rejected: it inflates the database and
its backups with data that has none of the transactional requirements the
database exists for, and serving bytes through the application wastes
connections.

**Store images on the application server's local disk in production.** Rejected:
it makes the deployment stateful, which conflicts with the redeploy-to-roll-back
model, and loses uploads on redeploy.

**Commit images to the repository.** Rejected: repository bloat that git never
forgets, and it makes content changes require a deployment.

**Use a hosted image CDN with upload (Cloudinary, imgix, Uploadcare).** A
reasonable option offering transformations for free. Rejected for now as a
provider commitment made before the hosting decision; the interface above
accommodates one later as just another implementation.

**Store full URLs on product records instead of keys.** Rejected explicitly,
because this is the decision that is expensive to undo. A URL embeds the bucket,
region, provider, and path structure into every product row, so changing storage
or adding a CDN becomes a data migration. A key survives all of those.

## Reasons

- Object storage is the standard, cheap answer for large immutable blobs and is
  available from every plausible host, keeping the hosting decision open.
- Opaque keys keep provider identity out of `catalog`'s data, matching the
  boundary discipline in ADR-0001.
- A filesystem implementation means a contributor can run the whole application
  without credentials, which matters given the baseline finding that no cloud
  secrets exist in the environment.
- Serving images from storage or a CDN keeps that traffic off the application.

## Consequences

- Two implementations to maintain, and a class of bug that appears only in
  production if the filesystem and object-storage backends diverge in behaviour.
- Deleting a product must not orphan its objects, and deleting an object must
  not break a live page. Cleanup is a background concern that needs an explicit
  approach.
- Object storage is not transactional with the database. An upload that
  succeeds while the enclosing transaction rolls back leaves an orphan; this is
  accepted and handled by cleanup rather than by distributed transactions.
- Derivative generation costs either upload time or first-request latency.
- Credentials for the production backend are required before launch and do not
  exist yet.

## When to revisit

- Image transformation needs outgrow our own derivative generation, making a
  hosted image CDN worth the provider commitment.
- Storage or bandwidth costs become material.
- The chosen hosting platform offers integrated storage with a materially better
  fit — which is a new implementation of the interface, not a change to this
  decision.
