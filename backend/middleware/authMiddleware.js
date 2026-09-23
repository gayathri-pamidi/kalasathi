import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * Protects endpoints requiring a valid JWT token
 */
export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from 'Bearer <token>'
      token = req.headers.authorization.split(' ')[1];

      const secret = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';
      
      // Verify token
      const decoded = jwt.verify(token, secret);

      // Attach user payload to request
      req.user = decoded;
      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};
