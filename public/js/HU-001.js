// Mostrar u ocultar la contraseña con el botón del ojo
const toggle = document.getElementById('togglePassword');
const password = document.getElementById('password');

toggle.addEventListener('click', () => {
  const isHidden = password.type === 'password';
  password.type = isHidden ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(isHidden));
  toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});
