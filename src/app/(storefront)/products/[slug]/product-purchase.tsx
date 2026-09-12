"use client";

import { useActionState, useMemo, useState } from "react";
import { formatPrice, t } from "@/lib/i18n";
import { Button, TextLink } from "@/ui";
import {
  resolveSelection,
  uniqueColors,
  uniqueFrameSizes,
} from "../../_lib/variant-selection";
import type { ProductPageVariant } from "../../_lib/load-product-page";
import { MediaImage } from "../../_lib/media-image";
import { addToCartAction, type AddToCartState } from "./actions";
import styles from "./product-detail.module.css";

const COLOR_SWATCH: Record<string, string> = {
  чёрный: "#16181d",
  красный: "#b3261e",
};

function swatch(color: string): string {
  return COLOR_SWATCH[color] ?? "#767d8a";
}

export function ProductPurchase({ variants }: { variants: ProductPageVariant[] }) {
  const first = variants[0];
  const [frameSize, setFrameSize] = useState(first?.frameSize ?? "");
  const [color, setColor] = useState(first?.color ?? "");
  const [state, formAction, pending] = useActionState<AddToCartState | null, FormData>(
    addToCartAction,
    null,
  );

  const selected = useMemo(
    () => resolveSelection(variants, frameSize, color),
    [variants, frameSize, color],
  );
  const detail = variants.find((variant) => variant.id === selected?.id) ?? null;
  const sizes = uniqueFrameSizes(variants);
  const colors = uniqueColors(variants);
  const inStock = (detail?.available ?? 0) > 0;

  return (
    <form action={formAction} className={styles.purchase}>
      <input type="hidden" name="variantId" value={detail?.id ?? ""} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.product.frameSize}</legend>
        <div
          className={styles.options}
          role="radiogroup"
          aria-label={t.product.frameSize}
        >
          {sizes.map((size) => {
            const isSelected = size === selected?.frameSize;
            return (
              <label
                key={size}
                className={
                  isSelected ? `${styles.option} ${styles.optionSelected}` : styles.option
                }
              >
                <input
                  type="radio"
                  name="frameSize"
                  value={size}
                  checked={isSelected}
                  aria-checked={isSelected}
                  onChange={() => {
                    setFrameSize(size);
                    const next = resolveSelection(variants, size, color);
                    if (next) {
                      setColor(next.color);
                    }
                  }}
                />
                <span className={styles.optionName}>{size}</span>
                {isSelected ? (
                  <span className={styles.selectedMark}>{t.product.selected}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t.product.color}</legend>
        <div className={styles.options} role="radiogroup" aria-label={t.product.color}>
          {colors.map((value) => {
            const isSelected = value === selected?.color;
            return (
              <label
                key={value}
                className={
                  isSelected ? `${styles.option} ${styles.optionSelected}` : styles.option
                }
              >
                <input
                  type="radio"
                  name="color"
                  value={value}
                  checked={isSelected}
                  aria-checked={isSelected}
                  onChange={() => {
                    setColor(value);
                    const next = resolveSelection(variants, frameSize, value);
                    if (next) {
                      setFrameSize(next.frameSize);
                    }
                  }}
                />
                <span
                  className={styles.swatch}
                  style={{ background: swatch(value) }}
                  aria-hidden="true"
                />
                <span className={styles.optionName}>{value}</span>
                {isSelected ? (
                  <span className={styles.selectedMark}>{t.product.selected}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {detail ? (
        <>
          <dl className={styles.meta}>
            <div>
              <dt>{t.product.price}</dt>
              <dd className={styles.price}>{formatPrice(detail.listPriceMinor)}</dd>
            </div>
            <div>
              <dt>{t.product.availability}</dt>
              <dd>
                {inStock
                  ? `${t.product.inStock} · ${detail.available} ${t.product.unitsLeft}`
                  : t.product.outOfStock}
              </dd>
            </div>
            <div>
              <dt>{t.product.wheelSize}</dt>
              <dd>{detail.wheelSize}</dd>
            </div>
            <div>
              <dt>{t.product.sku}</dt>
              <dd>{detail.sku}</dd>
            </div>
            {detail.barcode ? (
              <div>
                <dt>{t.product.barcode}</dt>
                <dd>{detail.barcode}</dd>
              </div>
            ) : null}
          </dl>
          {detail.images[0] ? (
            <figure className={styles.hero}>
              <MediaImage src={detail.images[0].src} alt={detail.images[0].alt} />
            </figure>
          ) : null}
        </>
      ) : (
        <p>{t.product.pickVariant}</p>
      )}

      <Button type="submit" variant="primary" fullWidth disabled={!inStock || pending}>
        {t.actions.addToCart}
      </Button>

      {state ? (
        <p
          className={state.ok ? styles.success : styles.error}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}{" "}
          {state.ok ? <TextLink href="/cart">{t.product.goToCart}</TextLink> : null}
        </p>
      ) : null}
    </form>
  );
}
