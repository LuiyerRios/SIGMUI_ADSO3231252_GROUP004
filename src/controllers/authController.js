import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n========= 🔍 DIAGNÓSTICO DE LOGIN =========');
    console.log('1. Datos recibidos del formulario (req.body):', req.body);

    if (!email || !password) {
      console.log('❌ ERROR: El formulario no envió email o password.');
      return res.render('HU-001', { title: 'Login | SIGMUI', error: 'Invalid credentials or user does not exist.' });
    }

    // 1. Buscar usuario en MySQL
    const user = await User.findOne({ where: { email: email.trim() } });
    
    if (!user) {
      console.log(`❌ ERROR: El correo "${email}" NO existe en la base de datos.`);
      return res.render('HU-001', { title: 'Login | SIGMUI', error: 'Invalid credentials or user does not exist.' });
    }

    console.log('2. Usuario encontrado en MySQL:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHash: user.password
    });

    // 2. Comparar contraseña (Soporta Hash Bcrypt O Texto Plano por emergencia)
    let isPasswordValid = await bcrypt.compare(password, user.password);

    // Si no coincide con bcrypt, verificar si se guardó como texto plano en MySQL
    if (!isPasswordValid && password === user.password) {
      console.log('⚠️ ADVERTENCIA: La contraseña coincide en texto plano (sin encriptar).');
      isPasswordValid = true;
    }

    console.log('3. Resultado de validación de contraseña:', isPasswordValid ? '✅ CORRECTA' : '❌ INCORRECTA');

    if (!isPasswordValid) {
      return res.render('HU-001', { title: 'Login | SIGMUI', error: 'Invalid credentials or user does not exist.' });
    }

    // 3. Determinar el rol
    const userRole = user.role || (email.includes('admin') ? 'admin' : 'user');

    if (req.session) {
      req.session.user = { id: user.id, email: user.email, role: userRole };
    }

    console.log(`🚀 ÉXITO: Redirigiendo a ${userRole === 'admin' ? '/admin' : '/available-areas'}\n`);

    if (userRole === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect('/available-areas');

  } catch (error) {
    console.error('💥 EXCEPCIÓN / ERROR GRAVE:', error.message);
    return res.render('HU-001', { title: 'Login | SIGMUI', error: 'Error interno en el servidor.' });
  }
};