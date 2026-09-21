import sequelize from './src/config/database.js';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    // Sincroniza el modelo con MySQL y crea la tabla 'Users' si no existe
    await sequelize.sync({ force: true });
    
    // Encriptamos la contraseña "123456" con bcrypt
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Creamos el usuario de prueba
    await User.create({
      email: 'conductor@ejemplo.com',
      password: hashedPassword
    });

    console.log('----------------------------------------------------');
    console.log('✅ Base de datos sincronizada y usuario creado exitosamente:');
    console.log('   Email: conductor@ejemplo.com');
    console.log('   Password: 123456');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error);
    process.exit(1);
  }
};

seedDatabase();