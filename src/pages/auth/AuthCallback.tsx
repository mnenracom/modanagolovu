import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase автоматически обрабатывает сессию из URL благодаря detectSessionInUrl: true
        // Сначала проверяем hash параметры (PKCE flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const type = hashParams.get('type') || queryParams.get('type');
        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const error = hashParams.get('error') || queryParams.get('error');
        const error_description = hashParams.get('error_description') || queryParams.get('error_description');

        // Проверяем наличие ошибки в URL
        if (error || error_description) {
          setStatus('error');
          setMessage(error_description || error || 'Произошла ошибка при подтверждении email');
          toast.error('Ошибка подтверждения', {
            description: error_description || error,
          });
          return;
        }

        // Проверяем текущую сессию (Supabase автоматически обработал callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        // Если есть токены в URL, устанавливаем сессию явно
        if (access_token && refresh_token) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (setSessionError) {
            throw setSessionError;
          }
          
          if (sessionData.session) {
            setStatus('success');
            
            if (type === 'signup') {
              setMessage('Ваш email успешно подтверждён! Вы автоматически вошли в систему.');
              toast.success('Email подтверждён!', {
                description: 'Регистрация завершена. Добро пожаловать!',
              });
              
              setTimeout(() => {
                navigate('/');
              }, 2000);
              return;
            } else if (type === 'recovery') {
              setMessage('Ваш email подтверждён! Теперь вы можете сбросить пароль.');
              toast.success('Email подтверждён!', {
                description: 'Теперь вы можете сбросить пароль.',
              });
              
              setTimeout(() => {
                navigate('/auth/reset-password');
              }, 2000);
              return;
            }
          }
        }
        
        // Проверяем сессию после обработки callback
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        
        if (finalSession) {
          setStatus('success');
          setMessage('Ваш email успешно подтверждён! Вы автоматически вошли в систему.');
          toast.success('Email подтверждён!', {
            description: 'Регистрация завершена. Добро пожаловать!',
          });
          
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          // Если сессии нет, проверяем query параметры для токена
          const token = searchParams.get('token');
          const token_hash = searchParams.get('token_hash');

          if (token || token_hash) {
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token_hash || token || '',
              type: 'email',
            });

            if (verifyError) {
              throw verifyError;
            }

            if (verifyData.user) {
              setStatus('success');
              setMessage('Ваш email успешно подтверждён! Вы автоматически вошли в систему.');
              toast.success('Email подтверждён!', {
                description: 'Регистрация завершена. Добро пожаловать!',
              });
              
              setTimeout(() => {
                navigate('/');
              }, 2000);
            } else {
              throw new Error('Не удалось подтвердить email');
            }
          } else {
            setStatus('error');
            setMessage('Не найдены параметры подтверждения. Попробуйте перейти по ссылке из письма ещё раз.');
          }
        }
      } catch (err: any) {
        console.error('Ошибка обработки callback:', err);
        setStatus('error');
        setMessage(err.message || 'Произошла ошибка при подтверждении email. Попробуйте ещё раз.');
        toast.error('Ошибка подтверждения', {
          description: err.message || 'Попробуйте перейти по ссылке из письма ещё раз.',
        });
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === 'loading' && (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <CardTitle>
              {status === 'loading' && 'Подтверждение email...'}
              {status === 'success' && 'Email подтверждён!'}
              {status === 'error' && 'Ошибка подтверждения'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Пожалуйста, подождите...'}
              {status === 'success' && 'Вы будете перенаправлены...'}
              {status === 'error' && 'Что-то пошло не так'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert variant={status === 'error' ? 'destructive' : 'default'} className="mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/auth/login')} 
                  className="w-full"
                >
                  Перейти к входу
                </Button>
                <Button 
                  onClick={() => navigate('/auth/register')} 
                  variant="outline"
                  className="w-full"
                >
                  Зарегистрироваться
                </Button>
              </div>
            )}
            
            {status === 'success' && (
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Перейти на главную
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AuthCallback;

