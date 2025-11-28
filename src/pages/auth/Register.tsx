import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UserPlus, Mail, Lock, User, MapPin, Phone, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    address: '',
    phone: '',
    telegram: '',
    whatsapp: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация
    if (!acceptedTerms) {
      setError('Необходимо принять пользовательское соглашение');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      // Проверяем, что Supabase настроен
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase не настроен. Проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
      }

      // Регистрация через Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: formData.fullName,
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            telegram: formData.telegram || null,
            whatsapp: formData.whatsapp || null,
            role: 'user', // Роль по умолчанию для обычных пользователей
          },
        },
      });

      if (authError) {
        console.error('Ошибка регистрации в Supabase Auth:', authError);
        throw authError;
      }

      console.log('Результат регистрации:', {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: !authData.session && authData.user
      });

      if (authData.user) {
        console.log('Пользователь создан в auth.users:', {
          id: authData.user.id,
          email: authData.user.email,
          confirmed: authData.user.email_confirmed_at !== null,
          created_at: authData.user.created_at
        });

        // Проверяем, создался ли пользователь в таблице users через триггер
        // Подождём немного, чтобы триггер успел выполниться
        setTimeout(async () => {
          try {
            const { data: userData, error: checkError } = await supabase
              .from('users')
              .select('*')
              .eq('id', authData.user!.id)
              .single();

            if (userData) {
              console.log('Пользователь найден в таблице users (триггер сработал):', userData);
            } else if (checkError && !checkError.message.includes('No rows returned')) {
              console.warn('Ошибка проверки пользователя в таблице users:', checkError);
            } else {
              console.warn('Пользователь не найден в таблице users. Возможно, триггер не сработал.');
            }
          } catch (err) {
            console.warn('Не удалось проверить пользователя в таблице users:', err);
          }
        }, 1000);

        // Не пытаемся создать запись вручную - триггер должен сделать это автоматически
        // Прямое создание может привести к конфликтам и ошибкам RLS

        // Проверяем, требуется ли подтверждение email
        if (!authData.session && authData.user) {
          // Email требует подтверждения
          toast.success('Регистрация успешна!', {
            description: 'Проверьте вашу почту для подтверждения аккаунта. Ссылка для подтверждения отправлена на ' + formData.email,
          });
        } else if (authData.session) {
          // Пользователь автоматически залогинен (email подтверждение отключено)
          toast.success('Регистрация успешна!', {
            description: 'Вы успешно зарегистрированы и автоматически вошли в систему.',
          });
        } else {
          toast.success('Регистрация успешна!', {
            description: 'Аккаунт создан. Проверьте почту для дальнейших инструкций.',
          });
        }

        navigate('/auth/login', { 
          state: { message: 'Регистрация успешна! Войдите в систему.' } 
        });
      } else {
        throw new Error('Не удалось создать пользователя');
      }
    } catch (err: any) {
      console.error('Ошибка регистрации:', err);
      
      // Обрабатываем различные типы ошибок
      let errorMessage = 'Ошибка при регистрации';
      
      if (err.message) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Ошибка подключения к серверу. Проверьте интернет-соединение и настройки Supabase.';
        } else if (err.message.includes('already registered') || err.message.includes('already exists')) {
          errorMessage = 'Пользователь с таким email уже зарегистрирован';
        } else if (err.message.includes('password')) {
          errorMessage = 'Пароль слишком слабый. Используйте минимум 6 символов';
        } else if (err.message.includes('email')) {
          errorMessage = 'Некорректный email адрес';
        } else if (err.message.includes('invalid')) {
          errorMessage = 'Неверные данные для регистрации';
        } else {
          errorMessage = err.message || 'Ошибка при регистрации. Попробуйте позже.';
        }
      }
      
      setError(errorMessage);
      toast.error('Ошибка регистрации', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Регистрация</CardTitle>
              <CardDescription className="text-center">
                Создайте аккаунт для оптовых покупок
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email" className="mb-2 block">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="example@mail.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* ФИО */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="mb-2 block">ФИО *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="Иванов Иван Иванович"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Телефон */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="mb-2 block">Телефон *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Адрес доставки */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="mb-2 block">Адрес доставки *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Город, улица, дом, квартира"
                        value={formData.address}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="space-y-2">
                    <Label htmlFor="telegram" className="mb-2 block">Telegram</Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="telegram"
                        name="telegram"
                        type="text"
                        placeholder="@username"
                        value={formData.telegram}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp</Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="whatsapp"
                        name="whatsapp"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Пароль */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="mb-2 block">Пароль *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Минимум 6 символов"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Подтверждение пароля */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="mb-2 block">Подтвердите пароль *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Повторите пароль"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                {/* Чекбокс принятия пользовательского соглашения */}
                <div className="flex items-start space-x-3 pt-2 pb-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="terms"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      Я принимаю{' '}
                      <Link
                        to="/terms"
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        пользовательское соглашение
                      </Link>
                      {' '}и даю согласие на обработку персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» *
                    </Label>
                  </div>
                </div>
                {!acceptedTerms && (
                  <p className="text-xs text-destructive -mt-2 mb-2">
                    Для регистрации необходимо принять пользовательское соглашение
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-gray-600">Уже есть аккаунт? </span>
                  <Link to="/auth/login" className="text-primary hover:underline">
                    Войти
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;



