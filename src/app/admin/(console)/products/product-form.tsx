"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n";
import { Button, SelectField, TextAreaField, TextField } from "@/ui";
import { minorToBynInput } from "../../_lib/money";
import styles from "../../admin.module.css";
import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "./actions";

const BICYCLE_TYPES = Object.keys(t.bicycleType) as Array<keyof typeof t.bicycleType>;
const VARIANT_STATUSES = Object.keys(t.variantStatus) as Array<
  keyof typeof t.variantStatus
>;

export interface ProductFormModel {
  id: string;
  slug: string;
  name: string;
  description: string;
  brandSlug: string;
  categorySlug: string;
  bicycleType: keyof typeof t.bicycleType;
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  modelYear: number | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    frameSize: string;
    wheelSize: string;
    color: string;
    listPriceMinor: number;
    status: keyof typeof t.variantStatus;
    isActive: boolean;
    images: Array<{ key: string; alt: string }>;
  }>;
}

interface CatalogOption {
  slug: string;
  name: string;
}

interface VariantDraft {
  id?: string;
  sku: string;
  barcode: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  price: string;
  status: keyof typeof t.variantStatus;
  mediaKey: string;
  mediaAlt: string;
}

function emptyDraft(): VariantDraft {
  return {
    sku: "",
    barcode: "",
    frameSize: "",
    wheelSize: "28",
    color: "",
    price: "",
    status: "active",
    mediaKey: "",
    mediaAlt: "",
  };
}

function toDrafts(product: ProductFormModel | null): VariantDraft[] {
  if (!product || product.variants.length === 0) {
    return [emptyDraft()];
  }
  return product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    price: minorToBynInput(variant.listPriceMinor),
    status: variant.status,
    mediaKey: variant.images[0]?.key ?? "",
    mediaAlt: variant.images[0]?.alt ?? "",
  }));
}

export function ProductForm({
  product,
  brands,
  categories,
}: {
  product: ProductFormModel | null;
  brands: CatalogOption[];
  categories: CatalogOption[];
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    null,
  );
  const [variants, setVariants] = useState<VariantDraft[]>(() => toDrafts(product));

  return (
    <form action={formAction} className={styles.form}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="variantCount" value={variants.length} />

      <TextField
        name="name"
        label={t.product.model}
        required
        defaultValue={product?.name ?? ""}
      />
      <TextField
        name="slug"
        label={t.admin.slug}
        required
        defaultValue={product?.slug ?? ""}
      />
      <TextAreaField
        name="description"
        label={t.product.description}
        required
        defaultValue={product?.description ?? ""}
      />
      <SelectField
        name="brandSlug"
        label={t.admin.brand}
        required
        defaultValue={product?.brandSlug}
      >
        {brands.map((brand) => (
          <option key={brand.slug} value={brand.slug}>
            {brand.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        name="categorySlug"
        label={t.admin.category}
        required
        defaultValue={product?.categorySlug}
      >
        {categories.map((category) => (
          <option key={category.slug} value={category.slug}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        name="bicycleType"
        label={t.product.type}
        required
        defaultValue={product?.bicycleType ?? "ROAD"}
      >
        {BICYCLE_TYPES.map((type) => (
          <option key={type} value={type}>
            {t.bicycleType[type]}
          </option>
        ))}
      </SelectField>
      <TextField
        name="modelYear"
        label={t.product.year}
        inputMode="numeric"
        defaultValue={product?.modelYear?.toString() ?? ""}
      />
      <TextField
        name="frameMaterial"
        label={t.product.frameMaterial}
        defaultValue={product?.frameMaterial ?? ""}
      />
      <TextField
        name="groupset"
        label={t.product.groupset}
        defaultValue={product?.groupset ?? ""}
      />
      <TextField
        name="brakeType"
        label={t.product.brakeType}
        defaultValue={product?.brakeType ?? ""}
      />
      <TextField
        name="warrantyMonths"
        label={t.product.warranty}
        inputMode="numeric"
        defaultValue={product?.warrantyMonths?.toString() ?? ""}
      />
      <TextField
        name="warrantyText"
        label={t.admin.warrantyDetails}
        defaultValue={product?.warrantyText ?? ""}
      />

      <fieldset className={styles.variant}>
        <legend>{t.admin.variants}</legend>
        {variants.map((variant, index) => (
          <div key={variant.id ?? `new-${index}`} className={styles.variant}>
            {variant.id ? (
              <input type="hidden" name={`variant-${index}-id`} value={variant.id} />
            ) : null}
            <TextField
              name={`variant-${index}-sku`}
              label={t.product.sku}
              required
              defaultValue={variant.sku}
            />
            <TextField
              name={`variant-${index}-barcode`}
              label={t.product.barcode}
              defaultValue={variant.barcode}
            />
            <TextField
              name={`variant-${index}-frameSize`}
              label={t.product.frameSize}
              required
              defaultValue={variant.frameSize}
            />
            <TextField
              name={`variant-${index}-wheelSize`}
              label={t.product.wheelSize}
              required
              defaultValue={variant.wheelSize}
            />
            <TextField
              name={`variant-${index}-color`}
              label={t.product.color}
              required
              defaultValue={variant.color}
            />
            <TextField
              name={`variant-${index}-price`}
              label={t.admin.priceByn}
              required
              defaultValue={variant.price}
            />
            <SelectField
              name={`variant-${index}-status`}
              label={t.admin.variantStatus}
              required
              defaultValue={variant.status}
            >
              {VARIANT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.variantStatus[status]}
                </option>
              ))}
            </SelectField>
            <TextField
              name={`variant-${index}-mediaKey`}
              label={t.admin.variantMediaKey}
              defaultValue={variant.mediaKey}
            />
            <TextField
              name={`variant-${index}-mediaAlt`}
              label={t.admin.variantMediaAlt}
              defaultValue={variant.mediaAlt}
            />
          </div>
        ))}
        <Button
          type="button"
          onClick={() => setVariants((current) => [...current, emptyDraft()])}
        >
          {t.admin.addVariant}
        </Button>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={pending}>
          {t.admin.save}
        </Button>
      </div>
      {state ? (
        <p
          className={state.ok ? styles.success : styles.error}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
