import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Произошла ошибка
              </CardTitle>
              <CardDescription>
                В админ-панели произошла непредвиденная ошибка
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold text-sm mb-2">Ошибка:</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {this.state.error.message || 'Неизвестная ошибка'}
                  </p>
                </div>
              )}

              {this.state.errorInfo && process.env.NODE_ENV === 'development' && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold text-sm mb-2">Детали (только для разработки):</p>
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  Попробовать снова
                </Button>
                <Button onClick={this.handleReload}>
                  Перезагрузить страницу
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Возможные причины:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Таблица settings не создана в Supabase</li>
                  <li>Проблемы с правами доступа (RLS)</li>
                  <li>Ошибка в коде компонента</li>
                  <li>Проблемы с подключением к Supabase</li>
                </ul>
                <p className="mt-4">
                  Откройте консоль браузера (F12) для получения более подробной информации об ошибке.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}




