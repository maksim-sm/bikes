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

  catalog: {
    title: "Каталог велосипедов",
    fromPrice: "от",
    openProduct: "Открыть карточку",
  },

  product: {
    featured: "Популярный велосипед",
    model: "Модель",
    year: "Год",
    type: "Тип",
    price: "Цена",
    availability: "Наличие",
    inStock: "В наличии",
    outOfStock: "Нет в наличии",
    unitsLeft: "осталось",
    frameSize: "Размер рамы",
    wheelSize: "Размер колёс",
    color: "Цвет",
    specifications: "Характеристики",
    warranty: "Гарантия",
    warrantyMonths: "мес.",
    delivery: "Доставка",
    deliveryDays: "дн.",
    selected: "выбрано",
    addedToCart: "Товар добавлен в корзину",
    goToCart: "Перейти в корзину",
    unavailable: "Этой комплектации нет в наличии",
    pickVariant: "Выберите размер и цвет",
    sku: "Артикул",
    frameMaterial: "Материал рамы",
    groupset: "Групсет",
    brakeType: "Тормоза",
    description: "Описание",
    gallery: "Фотографии модели",
    addFailed: "Не удалось добавить товар в корзину",
  },

  bicycleType: {
    ROAD: "Шоссейный",
    MTB: "Горный",
    GRAVEL: "Гравел",
    CITY: "Городской",
    KIDS: "Детский",
  },

  cart: {
    title: "Корзина",
    empty: "В корзине пока ничего нет",
    continueShopping: "Вернуться в каталог",
    quantity: "Количество",
    added: "Товар добавлен",
  },

  dev: {
    underConstruction: "Приложение находится в разработке",
    foundationOnly:
      "Сейчас готова только техническая основа: витрина, корзина и оформление заказа появятся позже.",
    uiKit: "Библиотека компонентов",
  },
} as const;

export type Messages = typeof ru;
