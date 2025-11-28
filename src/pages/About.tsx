import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Users, Truck, Shield } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { defaultContentSettings } from '@/constants/contentDefaults';

const About = () => {
  const { getSetting } = useSettings();

  const aboutTitle = getSetting('about_title', defaultContentSettings.about_title);
  const aboutIntro = getSetting('about_intro', defaultContentSettings.about_intro);
  const companyName = getSetting('about_company_name', defaultContentSettings.about_company_name);
  const companyDescription = getSetting('about_company_description', defaultContentSettings.about_company_description);
  const aboutParagraphs = companyDescription
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const featuresData = getSetting('about_features', defaultContentSettings.about_features)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const iconSet = [Award, Users, Truck, Shield];
  const features = featuresData.map((line, index) => {
    const [title, description] = line.split('|').map((part) => part?.trim() || '');
    const Icon = iconSet[index % iconSet.length];
    return {
      icon: Icon,
      title: title || `Преимущество ${index + 1}`,
      description: description || '',
    };
  });

  const advantagesTitle = getSetting('about_benefits_title', defaultContentSettings.about_benefits_title);
  const advantagesList = getSetting('about_benefits_list', defaultContentSettings.about_benefits_list)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">{aboutTitle}</h1>
            <p className="text-muted-foreground text-lg mb-8">{aboutIntro}</p>

            <Card className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-primary">{companyName}</h2>
                <div className="space-y-4 text-muted-foreground">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <h2 className="text-3xl font-bold mb-6">Наши преимущества</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="p-6">
                    <feature.icon className="h-12 w-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-primary text-primary-foreground">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">{advantagesTitle}</h2>
                <ul className="space-y-3">
                  {advantagesList.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
