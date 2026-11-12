// HU-015 (admin) · Contador de caracteres y vista previa de la respuesta tal como la verá el usuario en su inbox
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('response');
  const count = document.getElementById('responseCount');
  const preview = document.getElementById('responsePreview');
  if (!textarea) return;

  const update = () => {
    if (count) count.textContent = String(textarea.value.length);
    if (preview) preview.textContent = textarea.value.trim() || 'Your reply will appear here.';
  };
  textarea.addEventListener('input', update);
  update();
});
