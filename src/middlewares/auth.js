export const HOME_BY_ROLE = {
  driver: '/zones',
  agent: '/agent/verify',
  admin: '/admin'
};

// Deja disponible el usuario en todas las vistas Pug como `currentUser`
export function exposeUser(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  next();
}

// requireRole()               -> cualquier usuario con sesión
// requireRole('admin')        -> solo administradores
// requireRole('driver','admin')-> varios roles
export function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session?.user;
    const isApi = req.originalUrl.startsWith('/api');

    if (!user) {
      return isApi
        ? res.status(401).json({ error: 'Your session has expired. Please log in again.' })
        : res.redirect('/login?expired=1');
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return isApi
        ? res.status(403).json({ error: 'Unauthorized access.' })
        : res.status(403).render('errors/error', {
            title: 'Access denied',
            code: 403,
            message: 'You do not have permission to access this page.'
          });
    }
    next();
  };
}
