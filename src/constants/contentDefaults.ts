export interface ContentSettings {
  about_title: string;
  about_intro: string;
  about_company_name: string;
  about_company_description: string;
  about_features: string;
  about_benefits_title: string;
  about_benefits_list: string;
  contacts_title: string;
  contacts_phone: string;
  contacts_email: string;
  contacts_address: string;
  contacts_schedule: string;
  contacts_description: string;
  contacts_cta: string;
  contacts_marketplaces: string;
}

export const defaultContentSettings: ContentSettings = {
  about_title: 'О компании',
  about_intro: 'Компания «МОДАНАГОЛОВУ» — надежный оптовый поставщик головных уборов по всей России.',
  about_company_name: 'МОДАНАГОЛОВУ',
  about_company_description: `Компания "МОДАНАГОЛОВУ" является ведущим поставщиком головных уборов на оптовом рынке России. 
Мы специализируемся на поставках платков, косынок, бандан и капоров для розничных магазинов и торговых сетей.

Наш широкий ассортимент включает продукцию из натуральных материалов высочайшего качества. 
Мы тщательно отбираем производителей и контролируем качество на всех этапах производства.

Работаем напрямую с производителями, что позволяет нам предлагать конкурентные цены и гибкие условия сотрудничества. 
Наши товары представлены на маркетплейсах Wildberries и OZON.`,
  about_features: [
    'Опыт работы|Более 10 лет на рынке оптовой торговли головными уборами',
    'Довольные клиенты|Более 500 постоянных партнеров по всей России',
    'Логистика|Собственный склад и отлаженная система доставки',
    'Гарантия качества|Работаем только с проверенными производителями',
  ].join('\n'),
  about_benefits_title: 'Почему выбирают нас?',
  about_benefits_list: [
    'Гибкая система скидок в зависимости от объема заказа',
    'Быстрая обработка и отгрузка заказов',
    'Индивидуальный подход к каждому клиенту',
    'Профессиональная консультация по выбору товара',
    'Возможность самовывоза со склада или доставка по всей России',
  ].join('\n'),
  contacts_title: 'Контакты',
  contacts_phone: '+7 (999) 123-45-67',
  contacts_email: 'opt@modanagolovu.ru',
  contacts_address: 'г. Москва, ул. Складская, д. 10',
  contacts_schedule: 'Пн-Пт: 9:00 - 18:00\nСб-Вс: Выходной',
  contacts_description: `Для оптовых заказов свяжитесь с нами по телефону или email. Наши менеджеры проконсультируют вас по ассортименту, ценам и условиям сотрудничества.

Вы также можете оформить заказ на нашем сайте, добавив товары в корзину. После оформления заказа мы свяжемся с вами для подтверждения.`,
  contacts_cta: 'Минимальная партия для оптового заказа — от 10 единиц товара.',
  contacts_marketplaces: [
    'Wildberries 1|https://www.wildberries.ru/seller/285549',
    'Wildberries 2|https://www.wildberries.ru/seller/250051301',
    'OZON 1|https://www.ozon.ru/seller/modanagolovu-2581934/?miniapp=seller_2581934',
    'OZON 2|https://www.ozon.ru/seller/pugovka-1039508/?miniapp=seller_1039508',
  ].join('\n'),
};

