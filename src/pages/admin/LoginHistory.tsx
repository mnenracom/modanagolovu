import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { adminAPI } from '@/lib/api';

interface LoginHistoryEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  ip: string;
  userAgent: string;
  loginAt: string;
  status: 'success' | 'failed';
}

const LoginHistory = () => {
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // TODO: Заменить на реальный API запрос
      // const response = await adminAPI.getLoginHistory();
      // setHistory(response.data);

      // Временные моковые данные
      const mockHistory: LoginHistoryEntry[] = [
        {
          id: '1',
          userId: '1',
          userEmail: 'admin@example.com',
          userName: 'Администратор',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          loginAt: '2024-03-20 10:30:00',
          status: 'success',
        },
        {
          id: '2',
          userId: '2',
          userEmail: 'manager@example.com',
          userName: 'Менеджер',
          ip: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          loginAt: '2024-03-20 09:15:00',
          status: 'success',
        },
        {
          id: '3',
          userId: '3',
          userEmail: 'user@example.com',
          userName: 'Пользователь',
          ip: '192.168.1.3',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
          loginAt: '2024-03-19 15:45:00',
          status: 'failed',
        },
      ];
      setHistory(mockHistory);
    } catch (error) {
      console.error('Ошибка загрузки истории входов:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default">Успешно</Badge>
    ) : (
      <Badge variant="destructive">Неудачно</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">История входов</h1>
        <p className="text-gray-600 mt-2">Логи всех попыток входа в систему</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Журнал входов</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IP адрес</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      История входов пуста
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.loginAt}</TableCell>
                      <TableCell className="font-medium">{entry.userName}</TableCell>
                      <TableCell>{entry.userEmail}</TableCell>
                      <TableCell>{entry.ip}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.userAgent}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginHistory;










