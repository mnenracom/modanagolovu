import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { defaultContentSettings } from '@/constants/contentDefaults';

const Contacts = () => {
  const { getSetting } = useSettings();

  const contactsTitle = getSetting('contacts_title', defaultContentSettings.contacts_title);
  const contactsPhone = getSetting('contacts_phone', defaultContentSettings.contacts_phone);
  const contactsEmail = getSetting('contacts_email', defaultContentSettings.contacts_email);
  const contactsAddress = getSetting('contacts_address', defaultContentSettings.contacts_address);
  const contactsSchedule = getSetting('contacts_schedule', defaultContentSettings.contacts_schedule)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const contactsDescription = getSetting('contacts_description', defaultContentSettings.contacts_description)
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const contactsCta = getSetting('contacts_cta', defaultContentSettings.contacts_cta);
  const marketplaces = getSetting('contacts_marketplaces', defaultContentSettings.contacts_marketplaces)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split('|').map((part) => part?.trim() || '');
      return { label, url };
    })
    .filter((item) => item.label && item.url);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">{contactsTitle}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <Phone className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Телефон</h3>
                  <a href={`tel:${contactsPhone.replace(/\s|\(|\)/g, '')}`} className="text-muted-foreground hover:text-primary transition-smooth">
                    {contactsPhone}
                  </a>
                  <p className="text-sm text-muted-foreground mt-2">
                    Отдел оптовых продаж
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Mail className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Email</h3>
                  <a href={`mailto:${contactsEmail}`} className="text-muted-foreground hover:text-primary transition-smooth">
                    {contactsEmail}
                  </a>
                  <p className="text-sm text-muted-foreground mt-2">
                    По вопросам сотрудничества
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <MapPin className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Адрес склада</h3>
                  <p className="text-muted-foreground">
                    {contactsAddress}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Самовывоз по предварительной договоренности
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Clock className="h-8 w-8 mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Режим работы</h3>
                  {contactsSchedule.map((line, index) => (
                    <p key={index} className="text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-primary text-primary-foreground">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Как с нами связаться?</h2>
                <div className="space-y-3">
                  {contactsDescription.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                  <p className="font-semibold">
                    {contactsCta}
                  </p>
                </div>
              </CardContent>
            </Card>

            {marketplaces.length > 0 && (
              <Card className="mt-8">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">Наши маркетплейсы</h2>
                  <p className="text-muted-foreground mb-4">
                    Найдите нашу продукцию на ведущих торговых площадках:
                  </p>
                  <div className="flex flex-col gap-3">
                    {marketplaces.map((item, index) => (
                      <a 
                        key={index}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        → {item.label}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contacts;
