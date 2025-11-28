-- Добавить поле content_api_key в таблицу marketplace_settings
-- Это поле для токена Content API WildBerries (для получения отзывов)

-- Проверяем, существует ли колонка
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_settings' 
        AND column_name = 'content_api_key'
    ) THEN
        -- Добавляем колонку
        ALTER TABLE marketplace_settings 
        ADD COLUMN content_api_key TEXT;
        
        RAISE NOTICE 'Колонка content_api_key добавлена в таблицу marketplace_settings';
    ELSE
        RAISE NOTICE 'Колонка content_api_key уже существует';
    END IF;
END $$;

-- Комментарий к колонке
COMMENT ON COLUMN marketplace_settings.content_api_key IS 'Токен Content API WildBerries для получения отзывов (если отличается от основного API ключа)';



