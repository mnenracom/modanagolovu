import { supabase } from '@/lib/supabase';
import { PriceRule, PriceRuleFormData } from '@/types/priceRule';

// Преобразование из Supabase формата (snake_case) в camelCase
function transformPriceRuleFromSupabase(data: any): PriceRule {
  return {
    id: data.id,
    sku: data.sku,
    barcode: data.barcode,
    marketplaceType: data.marketplace_type,
    accountName: data.account_name,
    minPrice: parseFloat(data.min_price || 0),
    maxPrice: parseFloat(data.max_price || 0),
    costPrice: parseFloat(data.cost_price || 0),
    targetMarginPercent: parseFloat(data.target_margin_percent || 20),
    currentPrice: data.current_price ? parseFloat(data.current_price) : undefined,
    competitorMinPrice: data.competitor_min_price ? parseFloat(data.competitor_min_price) : undefined,
    competitorAvgPrice: data.competitor_avg_price ? parseFloat(data.competitor_avg_price) : undefined,
    competitorMaxPrice: data.competitor_max_price ? parseFloat(data.competitor_max_price) : undefined,
    marginStatus: data.margin_status || 'ok',
    calculatedMargin: data.calculated_margin ? parseFloat(data.calculated_margin) : undefined,
    calculatedProfit: data.calculated_profit ? parseFloat(data.calculated_profit) : undefined,
    recommendedPrice: data.recommended_price ? parseFloat(data.recommended_price) : undefined,
    priceChangeNeeded: data.price_change_needed || false,
    productName: data.product_name,
    category: data.category,
    notes: data.notes,
    marketplaceProductId: data.marketplace_product_id,
    lastCheckedAt: data.last_checked_at,
    lastUpdatedAt: data.last_updated_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат (snake_case)
function transformPriceRuleToSupabase(data: Partial<PriceRuleFormData>): any {
  const result: any = {};
  
  if (data.sku !== undefined) result.sku = data.sku;
  if (data.barcode !== undefined) result.barcode = data.barcode;
  if (data.marketplaceType !== undefined) result.marketplace_type = data.marketplaceType;
  if (data.accountName !== undefined) result.account_name = data.accountName;
  if (data.minPrice !== undefined) result.min_price = data.minPrice;
  if (data.maxPrice !== undefined) result.max_price = data.maxPrice;
  if (data.costPrice !== undefined) result.cost_price = data.costPrice;
  if (data.targetMarginPercent !== undefined) result.target_margin_percent = data.targetMarginPercent;
  if (data.productName !== undefined) result.product_name = data.productName;
  if (data.category !== undefined) result.category = data.category;
  if (data.notes !== undefined) result.notes = data.notes;
  
  return result;
}

export const priceRulesService = {
  // Получить все ценовые правила
  async getAll(params?: {
    marketplaceType?: 'wildberries' | 'ozon';
    accountName?: string;
    marginStatus?: string;
    priceChangeNeeded?: boolean;
  }): Promise<PriceRule[]> {
    let query = supabase
      .from('price_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.marketplaceType) {
      query = query.eq('marketplace_type', params.marketplaceType);
    }
    if (params?.accountName) {
      query = query.eq('account_name', params.accountName);
    }
    if (params?.marginStatus) {
      query = query.eq('margin_status', params.marginStatus);
    }
    if (params?.priceChangeNeeded !== undefined) {
      query = query.eq('price_change_needed', params.priceChangeNeeded);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения ценовых правил:', error);
      throw new Error(`Ошибка получения ценовых правил: ${error.message}`);
    }

    return (data || []).map(transformPriceRuleFromSupabase);
  },

  // Получить ценовое правило по ID
  async getById(id: number): Promise<PriceRule | null> {
    const { data, error } = await supabase
      .from('price_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Не найдено
      }
      console.error('Ошибка получения ценового правила:', error);
      throw new Error(`Ошибка получения ценового правила: ${error.message}`);
    }

    return data ? transformPriceRuleFromSupabase(data) : null;
  },

  // Получить ценовое правило по SKU и маркетплейсу
  async getBySku(sku: string, marketplaceType: 'wildberries' | 'ozon', accountName: string): Promise<PriceRule | null> {
    const { data, error } = await supabase
      .from('price_rules')
      .select('*')
      .eq('sku', sku)
      .eq('marketplace_type', marketplaceType)
      .eq('account_name', accountName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Не найдено
      }
      console.error('Ошибка получения ценового правила:', error);
      throw new Error(`Ошибка получения ценового правила: ${error.message}`);
    }

    return data ? transformPriceRuleFromSupabase(data) : null;
  },

  // Создать ценовое правило
  async create(priceRuleData: PriceRuleFormData): Promise<PriceRule> {
    const supabaseData = transformPriceRuleToSupabase(priceRuleData);

    const { data, error } = await supabase
      .from('price_rules')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания ценового правила:', error);
      throw new Error(`Ошибка создания ценового правила: ${error.message}`);
    }

    return transformPriceRuleFromSupabase(data);
  },

  // Обновить ценовое правило
  async update(id: number, priceRuleData: Partial<PriceRuleFormData>): Promise<PriceRule> {
    const supabaseData = transformPriceRuleToSupabase(priceRuleData);

    const { data, error } = await supabase
      .from('price_rules')
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления ценового правила:', error);
      throw new Error(`Ошибка обновления ценового правила: ${error.message}`);
    }

    return transformPriceRuleFromSupabase(data);
  },

  // Обновить статус маржинальности и рекомендации
  async updateMarginStatus(
    id: number,
    status: {
      marginStatus?: string;
      calculatedMargin?: number;
      calculatedProfit?: number;
      recommendedPrice?: number;
      priceChangeNeeded?: boolean;
      currentPrice?: number;
      competitorMinPrice?: number;
      competitorAvgPrice?: number;
      competitorMaxPrice?: number;
      lastCheckedAt?: string;
    }
  ): Promise<PriceRule> {
    const updateData: any = {};
    
    if (status.marginStatus !== undefined) updateData.margin_status = status.marginStatus;
    if (status.calculatedMargin !== undefined) updateData.calculated_margin = status.calculatedMargin;
    if (status.calculatedProfit !== undefined) updateData.calculated_profit = status.calculatedProfit;
    if (status.recommendedPrice !== undefined) updateData.recommended_price = status.recommendedPrice;
    if (status.priceChangeNeeded !== undefined) updateData.price_change_needed = status.priceChangeNeeded;
    if (status.currentPrice !== undefined) updateData.current_price = status.currentPrice;
    if (status.competitorMinPrice !== undefined) updateData.competitor_min_price = status.competitorMinPrice;
    if (status.competitorAvgPrice !== undefined) updateData.competitor_avg_price = status.competitorAvgPrice;
    if (status.competitorMaxPrice !== undefined) updateData.competitor_max_price = status.competitorMaxPrice;
    if (status.lastCheckedAt !== undefined) updateData.last_checked_at = status.lastCheckedAt;

    const { data, error } = await supabase
      .from('price_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления статуса маржинальности:', error);
      throw new Error(`Ошибка обновления статуса маржинальности: ${error.message}`);
    }

    return transformPriceRuleFromSupabase(data);
  },

  // Удалить ценовое правило
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('price_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления ценового правила:', error);
      throw new Error(`Ошибка удаления ценового правила: ${error.message}`);
    }
  },

  // Массовое создание/обновление ценовых правил
  async bulkUpsert(priceRules: PriceRuleFormData[]): Promise<PriceRule[]> {
    const supabaseData = priceRules.map(transformPriceRuleToSupabase);

    const { data, error } = await supabase
      .from('price_rules')
      .upsert(supabaseData, {
        onConflict: 'marketplace_type,account_name,sku',
      })
      .select();

    if (error) {
      console.error('Ошибка массового создания/обновления ценовых правил:', error);
      throw new Error(`Ошибка массового создания/обновления ценовых правил: ${error.message}`);
    }

    return (data || []).map(transformPriceRuleFromSupabase);
  },
};




