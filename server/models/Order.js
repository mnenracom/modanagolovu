const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  color: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    trim: true,
  },
  variationId: {
    type: String,
  },
  productSnapshot: {
    // Сохраняем снимок товара на момент заказа
    name: String,
    image: String,
    sku: String,
  },
}, { _id: true });

const orderHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'],
  },
  comment: {
    type: String,
    trim: true,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changedByName: {
    type: String,
  },
  previousStatus: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: true, timestamps: false });

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      telegram: {
        type: String,
        trim: true,
      },
      whatsapp: {
        type: String,
        trim: true,
      },
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'invoice', 'cash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    shippingMethod: {
      type: String,
      enum: ['pickup', 'delivery', 'courier'],
      required: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    history: [orderHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Генерация номера заказа
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.orderNumber = `ORD-${year}${month}${day}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Автоматическое добавление записи в историю при изменении статуса
orderSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    const previousStatus = this.get('previousStatus') || this.status;
    this.history.push({
      status: this.status,
      previousStatus: previousStatus,
      changedBy: this.changedBy || this.userId,
      timestamp: new Date(),
    });
  }
  next();
});

// Индексы
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);









