import { supabase } from '@/lib/supabase';

export interface ABTest {
  id?: number;
  test_name: string;
  product_id: number;
  control_threshold: number;
  variant_threshold: number;
  start_date?: string;
  end_date?: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  traffic_split?: number;
  conversion_rate_control?: number;
  conversion_rate_variant?: number;
  total_visitors_control?: number;
  total_visitors_variant?: number;
  total_conversions_control?: number;
  total_conversions_variant?: number;
  notes?: string | null;
}

export const abTestingService = {
  /**
   * Получить все A/B тесты
   */
  async getAll(): Promise<ABTest[]> {
    try {
      const { data, error } = await supabase
        .from('ab_testing_thresholds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Ошибка получения A/B тестов:', error);
      return [];
    }
  },

  /**
   * Получить A/B тест по ID
   */
  async getById(id: number): Promise<ABTest | null> {
    try {
      const { data, error } = await supabase
        .from('ab_testing_thresholds')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Ошибка получения A/B теста:', error);
      return null;
    }
  },

  /**
   * Создать новый A/B тест
   */
  async create(test: Omit<ABTest, 'id'>): Promise<ABTest> {
    try {
      const { data, error } = await supabase
        .from('ab_testing_thresholds')
        .insert({
          test_name: test.test_name,
          product_id: test.product_id,
          control_threshold: test.control_threshold,
          variant_threshold: test.variant_threshold,
          start_date: test.start_date || new Date().toISOString(),
          end_date: test.end_date || null,
          status: test.status || 'active',
          traffic_split: test.traffic_split || 50.0,
          notes: test.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Ошибка создания A/B теста:', error);
      throw new Error(error.message || 'Не удалось создать A/B тест');
    }
  },

  /**
   * Обновить A/B тест
   */
  async update(id: number, updates: Partial<ABTest>): Promise<ABTest> {
    try {
      const { data, error } = await supabase
        .from('ab_testing_thresholds')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Ошибка обновления A/B теста:', error);
      throw new Error(error.message || 'Не удалось обновить A/B тест');
    }
  },

  /**
   * Удалить A/B тест
   */
  async delete(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('ab_testing_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Ошибка удаления A/B теста:', error);
      throw new Error(error.message || 'Не удалось удалить A/B тест');
    }
  },

  /**
   * Обновить статистику A/B теста
   */
  async updateStats(
    id: number,
    stats: {
      total_visitors_control?: number;
      total_visitors_variant?: number;
      total_conversions_control?: number;
      total_conversions_variant?: number;
      conversion_rate_control?: number;
      conversion_rate_variant?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ab_testing_thresholds')
        .update({
          ...stats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Ошибка обновления статистики A/B теста:', error);
      throw new Error(error.message || 'Не удалось обновить статистику');
    }
  },
};


