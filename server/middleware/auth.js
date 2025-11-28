const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware для проверки JWT токена
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Получение пользователя из базы
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Пользователь не найден или неактивен' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Токен истек' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Неверный токен' });
    }
    return res.status(500).json({ message: 'Ошибка аутентификации' });
  }
};

// Middleware для проверки ролей
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется аутентификация' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Недостаточно прав для доступа к этому ресурсу' 
      });
    }

    next();
  };
};

// Middleware для логирования входа
const logLogin = async (req, res, next) => {
  try {
    if (req.user) {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          loginHistory: {
            ip,
            userAgent,
            loginAt: new Date(),
          },
        },
      });
    }
    next();
  } catch (error) {
    // Не прерываем запрос при ошибке логирования
    console.error('Ошибка логирования входа:', error);
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  logLogin,
};










