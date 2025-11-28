-- SQL скрипт для добавления отсутствующих колонок в таблицу orders
-- Выполните в Supabase SQL Editor (Dashboard → SQL Editor), чтобы добавить все необходимые колонки

-- Проверяем и добавляем все необходимые колонки, если их нет
DO $$ 
BEGIN
    -- order_number (если отсутствует)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN order_number VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Колонка order_number добавлена';
    END IF;

    -- user_id (если отсутствует)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN user_id BIGINT;
        RAISE NOTICE 'Колонка user_id добавлена';
    END IF;

    -- customer_name (если отсутствует)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) NOT NULL DEFAULT '';
        RAISE NOTICE 'Колонка customer_name добавлена';
    END IF;

    -- customer_email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
        RAISE NOTICE 'Колонка customer_email добавлена';
    END IF;

    -- customer_phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50);
        RAISE NOTICE 'Колонка customer_phone добавлена';
    END IF;

    -- customer_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_address'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_address TEXT;
        RAISE NOTICE 'Колонка customer_address добавлена';
    END IF;

    -- customer_telegram
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_telegram'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_telegram VARCHAR(100);
        RAISE NOTICE 'Колонка customer_telegram добавлена';
    END IF;

    -- customer_whatsapp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_whatsapp'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_whatsapp VARCHAR(50);
        RAISE NOTICE 'Колонка customer_whatsapp добавлена';
    END IF;

    -- items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'items'
    ) THEN
        ALTER TABLE orders ADD COLUMN items JSONB NOT NULL DEFAULT '[]';
        RAISE NOTICE 'Колонка items добавлена';
    END IF;

    -- subtotal
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Колонка subtotal добавлена';
    END IF;

    -- shipping_cost
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_cost'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Колонка shipping_cost добавлена';
    END IF;

    -- discount (ВАЖНО! - эта колонка отсутствует)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'discount'
    ) THEN
        ALTER TABLE orders ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Колонка discount добавлена';
    END IF;

    -- total_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Колонка total_amount добавлена';
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status'
    ) THEN
        ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Колонка status добавлена';
    END IF;

    -- payment_method
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);
        RAISE NOTICE 'Колонка payment_method добавлена';
    END IF;

    -- payment_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Колонка payment_status добавлена';
    END IF;

    -- shipping_method
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_method VARCHAR(50);
        RAISE NOTICE 'Колонка shipping_method добавлена';
    END IF;

    -- tracking_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'tracking_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
        RAISE NOTICE 'Колонка tracking_number добавлена';
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'notes'
    ) THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
        RAISE NOTICE 'Колонка notes добавлена';
    END IF;

    -- history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'history'
    ) THEN
        ALTER TABLE orders ADD COLUMN history JSONB DEFAULT '[]';
        RAISE NOTICE 'Колонка history добавлена';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Колонка created_at добавлена';
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Колонка updated_at добавлена';
    END IF;

    RAISE NOTICE 'Проверка всех колонок завершена';
END $$;

