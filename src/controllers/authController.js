import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar si el correo existe
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.render('HU-001', { error: 'Invalid credentials or user does not exist.' });
    }

    // 2. Verificar si la cuenta está bloqueada por 15 minutos
    if (user.lockout_until && user.lockout_until > new Date()) {
      const minutesLeft = Math.ceil((user.lockout_until - new Date()) / 60000);
      return res.render('HU-001', { 
        error: `Account is locked for security reasons. Try again in ${minutesLeft} minute(s).` 
      });
    }

    // 3. Validar contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Incrementar intentos fallidos
      user.failed_attempts += 1;

      // Si llega a 5 intentos, bloquear por 15 minutos
      if (user.failed_attempts >= 5) {
        user.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min en ms
        user.failed_attempts = 0; // Reiniciar contador tras aplicar el bloqueo
      }

      await user.save();

      return res.render('HU-001', { error: 'Invalid credentials.' });
    }

    // 4. Si la contraseña es correcta: Reiniciar intentos y quitar bloqueo
    user.failed_attempts = 0;
    user.lockout_until = null;
    await user.save();

    // Guardar usuario en sesión
    req.session.user = { id: user.id, email: user.email };

    // Redirigir al dashboard / celdas de parqueo
    return res.redirect('/parking-spots');

  } catch (error) {
    console.error('Login error:', error);
    return res.render('HU-001', { 
      error: 'Error connecting to the security server. Please try again later.' 
    });
  }
};