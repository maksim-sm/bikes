/**
 * Russian message catalogue.
 *
 * Per ADR-0009, no user-facing string is written inline in a component. All
 * copy lives here, which is what keeps adding a second locale a matter of
 * translation rather than of archaeology.
 *
 * This is placeholder structure for the foundation: the keys sketch the shape
 * the storefront will need, and the copy will be replaced with real wording.
 */
export const ru = {
  site: {
    name: "Веломагазин",
    tagline: "Велосипеды и аксессуары",
    description: "Интернет-магазин велосипедов в Беларуси",
  },

  nav: {
    skipToContent: "Перейти к основному содержанию",
    main: "Основная навигация",
    catalog: "Каталог",
    delivery: "Доставка и оплата",
    about: "О магазине",
    contacts: "Контакты",
    cart: "Корзина",
    account: "Личный кабинет",
  },

  actions: {
    add: "Добавить",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    confirm: "Подтвердить",
    delete: "Удалить",
    back: "Назад",
    continue: "Продолжить",
    addToCart: "В корзину",
    checkout: "Оформить заказ",
    search: "Найти",
  },

  form: {
    optional: "необязательно",
    required: "обязательное поле",
    submit: "Отправить",
    invalidEmail: "Введите корректный адрес электронной почты",
    invalidPhone: "Введите корректный номер телефона",
  },

  fields: {
    name: "Имя",
    email: "Электронная почта",
    phone: "Телефон",
    city: "Город",
    address: "Адрес",
    comment: "Комментарий к заказу",
    deliveryMethod: "Способ доставки",
  },

  status: {
    loading: "Загрузка…",
    empty: "Пока ничего нет",
    error: "Произошла ошибка. Попробуйте ещё раз",
    notFound: "Страница не найдена",
  },

  footer: {
    rights: "Все права защищены",
    terms: "Условия использования",
    privacy: "Политика конфиденциальности",
  },

  dev: {
    underConstruction: "Приложение находится в разработке",
    foundationOnly:
      "Сейчас готова только техническая основа: витрина, корзина и оформление заказа появятся позже.",
    uiKit: "Библиотека компонентов",
  },
} as const;

export type Messages = typeof ru;
