import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const TermsOfService = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">
                Пользовательское соглашение
              </CardTitle>
              <p className="text-center text-muted-foreground mt-2">
                Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm max-w-none space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-3">1. Общие положения</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      1.1. Настоящее Пользовательское соглашение (далее — «Соглашение») определяет условия использования 
                      интернет-магазина «МОДАНАГОЛОВУ» (далее — «Сервис»), расположенного по адресу в сети Интернет, 
                      и регулирует отношения между Администрацией Сервиса (далее — «Администрация») и пользователем Сервиса 
                      (далее — «Пользователь»).
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      1.2. Используя Сервис, Пользователь подтверждает, что он ознакомился с условиями настоящего Соглашения 
                      и принимает их в полном объеме без каких-либо изъятий и ограничений.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      1.3. Если Пользователь не согласен с условиями настоящего Соглашения, он обязан немедленно прекратить 
                      использование Сервиса.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">2. Термины и определения</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      2.1. <strong>Сервис</strong> — интернет-магазин «МОДАНАГОЛОВУ», предоставляющий возможность приобретения 
                      товаров оптом и в розницу через сеть Интернет.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      2.2. <strong>Пользователь</strong> — физическое или юридическое лицо, использующее Сервис для 
                      приобретения товаров.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      2.3. <strong>Товар</strong> — продукция, предлагаемая к продаже через Сервис.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      2.4. <strong>Заказ</strong> — оформленный Пользователем запрос на приобретение Товара через Сервис.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">3. Регистрация и учетная запись</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      3.1. Для использования некоторых функций Сервиса Пользователю необходимо пройти процедуру регистрации, 
                      в ходе которой он обязуется предоставить достоверную и актуальную информацию.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      3.2. Пользователь несет ответственность за сохранность своих учетных данных (логин, пароль) и за все 
                      действия, совершенные с использованием его учетной записи.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      3.3. Пользователь обязуется немедленно уведомить Администрацию о любом несанкционированном использовании 
                      его учетной записи.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">4. Оформление и оплата заказа</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      4.1. Оформляя Заказ, Пользователь подтверждает свое намерение приобрести указанные в Заказе Товары 
                      по указанным ценам.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      4.2. Оплата Заказа может производиться следующими способами: банковской картой через платежную систему 
                      ЮKassa, наличными при получении, по счету для юридических лиц.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      4.3. Минимальная сумма заказа для розничных покупателей составляет 1500 рублей, для оптовых — 5000 рублей.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      4.4. Администрация оставляет за собой право изменять цены на Товары без предварительного уведомления, 
                      при этом цена Товара на момент оформления Заказа является окончательной.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">5. Доставка товаров</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      5.1. Доставка Товаров осуществляется в соответствии с условиями, указанными на странице оформления Заказа.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      5.2. Сроки доставки являются ориентировочными и могут изменяться в зависимости от обстоятельств, 
                      не зависящих от Администрации.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      5.3. Риск случайной гибели или повреждения Товара переходит к Пользователю с момента передачи Товара 
                      курьеру или в службу доставки.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">6. Возврат и обмен товаров</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      6.1. Возврат и обмен Товаров осуществляется в соответствии с законодательством Российской Федерации 
                      о защите прав потребителей.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      6.2. Пользователь вправе отказаться от Товара надлежащего качества в течение 7 дней с момента передачи, 
                      если Товар не был в употреблении, сохранены его товарный вид, потребительские свойства, пломбы, фабричные ярлыки.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      6.3. Возврат Товара ненадлежащего качества осуществляется в соответствии с требованиями законодательства РФ.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">7. Обработка персональных данных</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      7.1. Администрация обрабатывает персональные данные Пользователя в соответствии с Федеральным законом 
                      от 27.07.2006 № 152-ФЗ «О персональных данных» и Политикой конфиденциальности.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      7.2. Регистрируясь в Сервисе, Пользователь дает свое согласие на обработку персональных данных, 
                      включая сбор, систематизацию, накопление, хранение, уточнение, использование, передачу третьим лицам 
                      (в случаях, предусмотренных законодательством).
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      7.3. Пользователь имеет право на получение информации, касающейся обработки его персональных данных, 
                      а также на их изменение и удаление в порядке, установленном законодательством РФ.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">8. Интеллектуальная собственность</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      8.1. Все материалы Сервиса, включая тексты, графические изображения, логотипы, являются объектами 
                      интеллектуальной собственности Администрации и защищены законодательством РФ об интеллектуальной собственности.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      8.2. Использование материалов Сервиса без письменного разрешения Администрации запрещено.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">9. Ответственность сторон</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      9.1. Администрация не несет ответственности за ущерб, причиненный Пользователю в результате использования 
                      или невозможности использования Сервиса, за исключением случаев, предусмотренных законодательством РФ.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      9.2. Пользователь несет ответственность за достоверность предоставленной информации при регистрации 
                      и оформлении Заказа.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      9.3. Администрация не несет ответственности за действия третьих лиц, включая службы доставки и 
                      платежные системы.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">10. Изменение условий соглашения</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      10.1. Администрация оставляет за собой право в любое время изменять условия настоящего Соглашения 
                      без предварительного уведомления Пользователя.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      10.2. Новая редакция Соглашения вступает в силу с момента ее размещения на странице Сервиса, 
                      если иное не предусмотрено новой редакцией Соглашения.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      10.3. Продолжение использования Сервиса после внесения изменений означает согласие Пользователя 
                      с новой редакцией Соглашения.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">11. Разрешение споров</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      11.1. Все споры, возникающие между Пользователем и Администрацией, подлежат разрешению путем переговоров.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      11.2. В случае невозможности разрешения спора путем переговоров, споры подлежат рассмотрению в суде 
                      по месту нахождения Администрации в соответствии с законодательством Российской Федерации.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-3">12. Контактная информация</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      12.1. По всем вопросам, связанным с использованием Сервиса, Пользователь может обращаться к Администрации 
                      через форму обратной связи на сайте или по контактным данным, указанным в разделе «Контакты».
                    </p>
                  </section>

                  <div className="mt-8 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Настоящее Соглашение составлено в соответствии с законодательством Российской Федерации.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;



