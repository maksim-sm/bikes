"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { Button, TextField } from "@/ui";
import styles from "../../admin.module.css";
import { uploadMediaAction } from "./media-actions";

export interface ImageDraft {
  key: string;
  alt: string;
}

function previewSrc(key: string): string {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function ImageFields({
  namePrefix,
  images,
  onChange,
}: {
  namePrefix: string;
  images: ImageDraft[];
  onChange: (images: ImageDraft[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className={styles.images}>
      <input type="hidden" name={`${namePrefix}Count`} value={images.length} />
      {images.map((image, index) => (
        <div key={`${image.key}-${index}`} className={styles.imageRow}>
          <input type="hidden" name={`${namePrefix}-${index}-key`} value={image.key} />
          {image.key ? (
            // eslint-disable-next-line @next/next/no-img-element -- opaque media keys
            <img className={styles.thumb} src={previewSrc(image.key)} alt={image.alt} />
          ) : null}
          <TextField
            name={`${namePrefix}-${index}-alt`}
            label={t.admin.imageAlt}
            required
            value={image.alt}
            onChange={(event) => {
              const alt = event.target.value;
              onChange(
                images.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, alt } : item,
                ),
              );
            }}
          />
          <div className={styles.imageActions}>
            <Button
              type="button"
              disabled={index === 0}
              onClick={() => {
                const next = [...images];
                const current = next[index];
                const previous = next[index - 1];
                if (!current || !previous) {
                  return;
                }
                next[index - 1] = current;
                next[index] = previous;
                onChange(next);
              }}
            >
              {t.admin.moveImageUp}
            </Button>
            <Button
              type="button"
              disabled={index === images.length - 1}
              onClick={() => {
                const next = [...images];
                const current = next[index];
                const following = next[index + 1];
                if (!current || !following) {
                  return;
                }
                next[index + 1] = current;
                next[index] = following;
                onChange(next);
              }}
            >
              {t.admin.moveImageDown}
            </Button>
            <Button
              type="button"
              onClick={() =>
                onChange(images.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              {t.admin.removeImage}
            </Button>
          </div>
        </div>
      ))}
      <label className={styles.upload}>
        <span>{t.admin.uploadImage}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending || images.length >= 8}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            setPending(true);
            setError(null);
            const data = new FormData();
            data.set("file", file);
            const result = await uploadMediaAction(data);
            setPending(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            onChange([...images, { key: result.key, alt: "" }]);
          }}
        />
      </label>
      <p className={styles.hint}>{t.admin.uploadHint}</p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
