"use client";

import { useActionState, useState } from "react";
import { BICYCLE_TYPES, type Product } from "@/modules/catalog";
import { t } from "@/lib/i18n";
import { Button, Checkbox, SelectField, TextAreaField, TextField } from "@/ui";
import { minorToBynInput } from "../../_lib/money";
import styles from "../../admin.module.css";
import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "./actions";

interface CatalogOption {
  slug: string;
  name: string;
}

interface VariantDraft {
  id?: string;
  sku: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  price: string;
  active: boolean;
}

function toDrafts(product: Product | null): VariantDraft[] {
  if (!product || product.variants.length === 0) {
    return [
      { sku: "", frameSize: "", wheelSize: "28", color: "", price: "", active: true },
    ];
  }
  return product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    price: minorToBynInput(variant.listPriceMinor),
    active: variant.isActive,
  }));
}

export function ProductForm({
  product,
  brands,
  categories,
}: {
  product: Product | null;
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
            <Checkbox
              name={`variant-${index}-active`}
              label={t.admin.activeVariant}
              defaultChecked={variant.active}
            />
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            setVariants((current) => [
              ...current,
              {
                sku: "",
                frameSize: "",
                wheelSize: "28",
                color: "",
                price: "",
                active: true,
              },
            ])
          }
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
