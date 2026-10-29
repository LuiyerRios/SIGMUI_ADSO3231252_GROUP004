document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('description');
  const charCounter = document.getElementById('charCounter');

  if (textarea && charCounter) {
    textarea.addEventListener('input', (e) => {
      const length = e.target.value.length;
      charCounter.textContent = `${length} / 300 characters`;
      
      if (length >= 300) {
        charCounter.classList.add('text-red-400');
      } else {
        charCounter.classList.remove('text-red-400');
      }
    });
  }
});