import { supabase } from '@/lib/supabase';
import { PaymentGateway } from '@/types/delivery';

// Преобразование из Supabase формата
function transformFromSupabase(data: any): PaymentGateway {
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type,
    isActive: data.is_active ?? true,
    isEnabled: data.is_enabled ?? true,
    apiKey: data.api_key,
    secretKey: data.secret_key,
    shopId: data.shop_id,
    terminalKey: data.terminal_key,
    apiUrl: data.api_url,
    webhookUrl: data.webhook_url,
    returnUrl: data.return_url,
    failUrl: data.fail_url,
    minAmount: data.min_amount,
    maxAmount: data.max_amount,
    commissionPercent: data.commission_percent,
    commissionFixed: data.commission_fixed,
    currencies: data.currencies || ['RUB'],
    displayName: data.display_name,
    description: data.description,
    iconUrl: data.icon_url,
    logoUrl: data.logo_url,
    settings: data.settings || {},
    testMode: data.test_mode ?? false,
    testApiKey: data.test_api_key,
    testSecretKey: data.test_secret_key,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат
function transformToSupabase(data: Partial<PaymentGateway>): any {
  const result: any = {};
  if ('name' in data) result.name = data.name;
  if ('code' in data) result.code = data.code;
  if ('type' in data) result.type = data.type;
  if ('isActive' in data) result.is_active = data.isActive;
  if ('isEnabled' in data) result.is_enabled = data.isEnabled;
  if ('apiKey' in data) result.api_key = data.apiKey;
  if ('secretKey' in data) result.secret_key = data.secretKey;
  if ('shopId' in data) result.shop_id = data.shopId;
  if ('terminalKey' in data) result.terminal_key = data.terminalKey;
  if ('apiUrl' in data) result.api_url = data.apiUrl;
  if ('webhookUrl' in data) result.webhook_url = data.webhookUrl;
  if ('returnUrl' in data) result.return_url = data.returnUrl;
  if ('failUrl' in data) result.fail_url = data.failUrl;
  if ('minAmount' in data) result.min_amount = data.minAmount;
  if ('maxAmount' in data) result.max_amount = data.maxAmount;
  if ('commissionPercent' in data) result.commission_percent = data.commissionPercent;
  if ('commissionFixed' in data) result.commission_fixed = data.commissionFixed;
  if ('currencies' in data) result.currencies = data.currencies || ['RUB'];
  if ('displayName' in data) result.display_name = data.displayName;
  if ('description' in data) result.description = data.description;
  if ('iconUrl' in data) result.icon_url = data.iconUrl;
  if ('logoUrl' in data) result.logo_url = data.logoUrl;
  if ('settings' in data) result.settings = data.settings || {};
  if ('testMode' in data) result.test_mode = data.testMode;
  if ('testApiKey' in data) result.test_api_key = data.testApiKey;
  if ('testSecretKey' in data) result.test_secret_key = data.testSecretKey;
  return result;
}

export const paymentGatewaysService = {
  /**
   * Получить все активные платежные системы
   */
  async getActive(): Promise<PaymentGateway[]> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true)
      .eq('is_enabled', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения платежных систем:', error);
      throw new Error(`Ошибка получения платежных систем: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Получить все платежные системы (для админки)
   */
  async getAll(): Promise<PaymentGateway[]> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения платежных систем:', error);
      throw new Error(`Ошибка получения платежных систем: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Получить платежную систему по ID
   */
  async getById(id: number): Promise<PaymentGateway | null> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Ошибка получения платежной системы:', error);
      throw new Error(`Ошибка получения платежной системы: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  /**
   * Получить платежную систему по коду
   */
  async getByCode(code: string): Promise<PaymentGateway | null> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Ошибка получения платежной системы:', error);
      throw new Error(`Ошибка получения платежной системы: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  /**
   * Создать или обновить платежную систему
   */
  async upsert(gateway: Partial<PaymentGateway> & { code: string }): Promise<PaymentGateway> {
    const supabaseData = transformToSupabase(gateway);

    const { data, error } = await supabase
      .from('payment_gateways')
      .upsert(supabaseData, {
        onConflict: 'code',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения платежной системы:', error);
      throw new Error(`Ошибка сохранения платежной системы: ${error.message}`);
    }

    return transformFromSupabase(data);
  },

  /**
   * Удалить платежную систему
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('payment_gateways')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления платежной системы:', error);
      throw new Error(`Ошибка удаления платежной системы: ${error.message}`);
    }
  },
};




