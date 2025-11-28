import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">МОДАНАГОЛОВУ</h3>
            <p className="text-muted-foreground text-sm">
              Оптовая продажа качественных головных уборов. Работаем с розничными магазинами и маркетплейсами.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Навигация</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalog" className="text-muted-foreground hover:text-primary transition-smooth">
                  Каталог
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-smooth">
                  О нас
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="text-muted-foreground hover:text-primary transition-smooth">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Мы на маркетплейсах</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.wildberries.ru/seller/285549"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-smooth"
                >
                  Wildberries 1
                </a>
              </li>
              <li>
                <a
                  href="https://www.wildberries.ru/seller/250051301"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-smooth"
                >
                  Wildberries 2
                </a>
              </li>
              <li>
                <a
                  href="https://www.ozon.ru/seller/modanagolovu-2581934/?miniapp=seller_2581934"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-smooth"
                >
                  OZON 1
                </a>
              </li>
              <li>
                <a
                  href="https://www.ozon.ru/seller/pugovka-1039508/?miniapp=seller_1039508"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-smooth"
                >
                  OZON 2
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} МОДАНАГОЛОВУ. Все права защищены.</p>
            <span className="hidden md:inline">|</span>
            <Link to="/terms" className="hover:text-primary transition-smooth">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
