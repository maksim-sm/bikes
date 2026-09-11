"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Checkbox,
  Cluster,
  Container,
  Dialog,
  FieldGroup,
  Grid,
  Radio,
  SelectField,
  Stack,
  TextAreaField,
  TextField,
  TextLink,
} from "@/ui";
import styles from "./ui-kit.module.css";

/**
 * Component gallery.
 *
 * Every primitive rendered on one page so that visual regressions, contrast,
 * and keyboard behaviour can be checked in one place. Tab through it: every
 * interactive element must show a visible focus ring, and the dialog must trap
 * focus and close on Escape.
 *
 * This is a development aid, not a storefront page.
 */
const COLORS: { name: string; token: string; note: string }[] = [
  { name: "text", token: "--color-text", note: "17.8:1 на белом" },
  { name: "text-muted", token: "--color-text-muted", note: "6.1:1 на белом" },
  { name: "brand", token: "--color-brand", note: "6.3:1 на белом" },
  { name: "danger", token: "--color-danger", note: "6.5:1 на белом" },
  { name: "success", token: "--color-success", note: "6.5:1 на белом" },
  { name: "focus", token: "--color-focus", note: "6.4:1 на белом" },
  {
    name: "border-interactive",
    token: "--color-border-interactive",
    note: "4.1:1 — граница полей",
  },
  { name: "surface", token: "--color-surface", note: "фон карточек" },
];

const TEXT_SCALE = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"];
const SPACE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8];

export default function UiKitPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={7}>
          <Stack space={3}>
            <h1>{t.dev.uiKit}</h1>
            <p>
              Набор базовых компонентов. Проверяйте клавиатурную навигацию: у каждого
              элемента должен быть видимый фокус.
            </p>
          </Stack>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Типографика</h2>
              {TEXT_SCALE.map((size) => (
                <div className={styles.scaleRow} key={size}>
                  <span className={styles.scaleLabel}>--text-{size}</span>
                  <span style={{ fontSize: `var(--text-${size})` }}>
                    Горный велосипед
                  </span>
                </div>
              ))}
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={3}>
              <h2>Отступы</h2>
              {SPACE_SCALE.map((step) => (
                <div className={styles.scaleRow} key={step}>
                  <span className={styles.scaleLabel}>--space-{step}</span>
                  <span
                    className={styles.spaceBar}
                    style={{ width: `var(--space-${step})` }}
                  />
                </div>
              ))}
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Цвета</h2>
              <div className={styles.swatches}>
                {COLORS.map((color) => (
                  <div className={styles.swatch} key={color.token}>
                    <div
                      className={styles.swatchChip}
                      style={{ background: `var(${color.token})` }}
                    />
                    <div>{color.name}</div>
                    <div className={styles.ratio}>{color.note}</div>
                  </div>
                ))}
              </div>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Кнопки</h2>
              <Cluster space={3}>
                <Button variant="primary">{t.actions.addToCart}</Button>
                <Button variant="secondary">{t.actions.continue}</Button>
                <Button variant="quiet">{t.actions.cancel}</Button>
                <Button variant="danger">{t.actions.delete}</Button>
                <Button disabled variant="primary">
                  {t.actions.save}
                </Button>
              </Cluster>
              <Cluster space={3}>
                <Button size="small" variant="secondary">
                  {t.actions.search}
                </Button>
                <Button size="small" variant="quiet">
                  {t.actions.back}
                </Button>
              </Cluster>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Ссылки</h2>
              <p>
                Обычная <TextLink href="/">ссылка внутри текста</TextLink> всегда
                подчёркнута, потому что одного цвета недостаточно.
              </p>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Карточки</h2>
              <Grid minColumnWidth="15rem" space={4}>
                <Card>
                  <CardTitle>Заголовок карточки</CardTitle>
                  <CardBody>Короткое описание содержимого.</CardBody>
                  <CardFooter>
                    <Button size="small" variant="secondary">
                      {t.actions.continue}
                    </Button>
                  </CardFooter>
                </Card>
                <Card filled>
                  <CardTitle>Карточка с заливкой</CardTitle>
                  <CardBody>Без рамки, на тонированном фоне.</CardBody>
                </Card>
                <Card interactive>
                  <CardTitle>
                    <TextLink href="/" subtle>
                      Интерактивная карточка
                    </TextLink>
                  </CardTitle>
                  <CardBody>Фокус виден на всей карточке.</CardBody>
                </Card>
              </Grid>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Поля формы</h2>
              <div className={styles.formWidth}>
                <Stack space={5}>
                  <TextField
                    hint="Как к вам обращаться"
                    label={t.fields.name}
                    name="name"
                    required
                  />
                  <TextField
                    error={t.form.invalidEmail}
                    label={t.fields.email}
                    name="email"
                    type="email"
                  />
                  <TextField
                    label={t.fields.phone}
                    name="phone"
                    optionalLabel={t.form.optional}
                    type="tel"
                  />
                  <SelectField label={t.fields.city} name="city">
                    <option value="minsk">Минск</option>
                    <option value="brest">Брест</option>
                    <option value="gomel">Гомель</option>
                  </SelectField>
                  <TextAreaField
                    label={t.fields.comment}
                    name="comment"
                    optionalLabel={t.form.optional}
                  />
                  <FieldGroup legend={t.fields.deliveryMethod}>
                    <Radio defaultChecked label="Самовывоз" name="delivery" />
                    <Radio label="Курьер по Минску" name="delivery" />
                    <Radio label="Почта по Беларуси" name="delivery" />
                  </FieldGroup>
                  <Checkbox label="Согласен с условиями обработки данных" />
                  <TextField disabled label="Недоступное поле" value="" readOnly />
                </Stack>
              </div>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack space={4}>
              <h2>Диалог</h2>
              <div>
                <Button onClick={() => setDialogOpen(true)} variant="secondary">
                  Открыть диалог
                </Button>
              </div>
              <Dialog
                closeLabel={t.actions.close}
                footer={
                  <>
                    <Button onClick={() => setDialogOpen(false)} variant="quiet">
                      {t.actions.cancel}
                    </Button>
                    <Button onClick={() => setDialogOpen(false)} variant="primary">
                      {t.actions.confirm}
                    </Button>
                  </>
                }
                onClose={() => setDialogOpen(false)}
                open={dialogOpen}
                title="Подтвердите действие"
              >
                <p>
                  Фокус заперт внутри диалога, Escape закрывает его, а после закрытия
                  фокус возвращается на кнопку.
                </p>
              </Dialog>
            </Stack>
          </section>
        </Stack>
      </div>
    </Container>
  );
}
