document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // SIDEBAR
  // =========================================

  const sidebar = document.getElementById('adminSidebar');
  const toggleBtn = document.getElementById('toggleSidebar');
  const mobileToggleBtn = document.getElementById('mobileToggle');
  const overlay = document.getElementById('sidebarOverlay');

  try {
    const isCollapsed = localStorage.getItem('sigmui_sidebar_collapsed') === 'true';

    if (isCollapsed && sidebar && window.innerWidth > 768) {
      sidebar.classList.add('collapsed');
    }
  } catch (error) {
    console.warn('Could not restore sidebar state:', error);
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');

      try {
        localStorage.setItem(
          'sigmui_sidebar_collapsed',
          sidebar.classList.contains('collapsed')
        );
      } catch (error) {
        console.warn('Could not save sidebar state:', error);
      }
    });
  }

  if (mobileToggleBtn && sidebar && overlay) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('show');
    });

    overlay.addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    if (sidebar && overlay) {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    }
  }


  // =========================================
  // FORM REFERENCES
  // =========================================

  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');
  const preferencesForm = document.getElementById('preferencesForm');
  const notificationsForm = document.getElementById('notificationsForm');


  // =========================================
  // SHOW / HIDE PASSWORD
  // =========================================

  document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);

      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      button.innerHTML = isPassword
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';

      button.setAttribute(
        'aria-label',
        isPassword ? 'Hide password' : 'Show password'
      );
    });
  });


  // =========================================
  // ERROR HANDLING
  // =========================================

  function showError(input, errorElement, message) {
    if (input) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
    }

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearErrors(form) {
    if (!form) return;

    form.querySelectorAll('.field-error').forEach(element => {
      element.textContent = '';
    });

    form.querySelectorAll('.invalid').forEach(input => {
      input.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
    });
  }

  function getOrCreateError(input, id) {
    let errorElement = document.getElementById(id);

    if (!errorElement && input) {
      errorElement = document.createElement('small');
      errorElement.id = id;
      errorElement.className = 'field-error';
      input.closest('.form-group')?.appendChild(errorElement);
    }

    return errorElement;
  }


  // =========================================
  // FRONTEND VALIDATION
  // =========================================

  function validateProfile() {
    if (!profileForm) return false;

    clearErrors(profileForm);

    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');

    let valid = true;

    if (!fullName.value.trim()) {
      showError(
        fullName,
        document.getElementById('fullNameError'),
        'Full name is required.'
      );
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.value.trim())) {
      showError(
        email,
        document.getElementById('emailError'),
        'Enter a valid email address.'
      );
      valid = false;
    }

    if (
      phone.value.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(phone.value.trim())
    ) {
      showError(
        phone,
        document.getElementById('phoneError'),
        'Enter a valid phone number.'
      );
      valid = false;
    }

    return valid;
  }

  function validatePassword() {
    if (!passwordForm) return false;

    clearErrors(passwordForm);

    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');

    let valid = true;

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!currentPassword.value) {
      showError(
        currentPassword,
        getOrCreateError(currentPassword, 'currentPasswordError'),
        'Current password is required.'
      );
      valid = false;
    }

    if (!passwordPattern.test(newPassword.value)) {
      showError(
        newPassword,
        document.getElementById('newPasswordError'),
        'Use at least 8 characters, uppercase, lowercase and a number.'
      );
      valid = false;
    }

    if (newPassword.value !== confirmPassword.value) {
      showError(
        confirmPassword,
        document.getElementById('confirmPasswordError'),
        'Passwords do not match.'
      );
      valid = false;
    }

    return valid;
  }


  // =========================================
  // PROFILE EMAIL VALIDATION
  // =========================================

  const emailInput = document.getElementById('email');
  const profileSaveButton = profileForm?.querySelector('button[type="submit"]');

  function validateEmailLive() {
    if (!emailInput) return;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailPattern.test(emailInput.value.trim());

    if (profileSaveButton) {
      profileSaveButton.disabled = !valid;
    }

    if (valid) {
      emailInput.classList.remove('invalid');
      emailInput.removeAttribute('aria-invalid');

      const error = document.getElementById('emailError');
      if (error) error.textContent = '';
    }
  }

  emailInput?.addEventListener('input', validateEmailLive);
  validateEmailLive();


  // =========================================
  // API REQUEST HELPER
  // =========================================

  async function sendRequest(url, data) {
    let response;

    try {
      response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw new Error(
        'Network Error: Unable to save changes. Please check your connection and try again.'
      );
    }

    let result;

    try {
      result = await response.json();
    } catch (error) {
      throw new Error(
        'The server returned an unexpected response. Please try again.'
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to save changes. Please try again.'
      );
    }

    return result;
  }


  // =========================================
  // FORM SUBMISSION HELPER
  // =========================================

  async function handleSubmission(form, url, getData, onSuccess) {
    if (!form) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');

      if (submitButton) {
        submitButton.disabled = true;
      }

      try {
        const result = await sendRequest(url, getData());

        if (onSuccess) {
          onSuccess();
        }

        clearErrors(form);

        showToast(result.message || 'Changes saved successfully.');

      } catch (error) {
        showToast(error.message, true);

        // Show server validation errors next to their fields.
        if (form === profileForm) {
          const message = error.message;

          if (message.toLowerCase().includes('email')) {
            showError(
              document.getElementById('email'),
              document.getElementById('emailError'),
              message
            );
          } else if (message.toLowerCase().includes('phone')) {
            showError(
              document.getElementById('phone'),
              document.getElementById('phoneError'),
              message
            );
          } else if (message.toLowerCase().includes('name')) {
            showError(
              document.getElementById('fullName'),
              document.getElementById('fullNameError'),
              message
            );
          }
        }

        if (form === passwordForm) {
          const message = error.message;

          if (message.toLowerCase().includes('current password')) {
            const input = document.getElementById('currentPassword');

            showError(
              input,
              getOrCreateError(input, 'currentPasswordError'),
              message
            );
          } else if (message.toLowerCase().includes('match')) {
            showError(
              document.getElementById('confirmPassword'),
              document.getElementById('confirmPasswordError'),
              message
            );
          } else if (message.toLowerCase().includes('security')) {
            showError(
              document.getElementById('newPassword'),
              document.getElementById('newPasswordError'),
              message
            );
          }
        }

      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }

        validateEmailLive();
      }
    });
  }


  // =========================================
  // PROFILE FORM
  // =========================================

  handleSubmission(
    profileForm,
    '/admin/settings/profile',
    () => {
      if (!validateProfile()) {
        throw new Error('Please correct the profile information.');
      }

      return {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        primaryAddress: document.getElementById('primaryAddress').value.trim()
      };
    },
    () => {
      // Update reset values after successful save.
      profileForm.querySelectorAll('input').forEach(input => {
        input.defaultValue = input.value;
      });
    }
  );


  // =========================================
  // PASSWORD FORM
  // =========================================

  handleSubmission(
    passwordForm,
    '/admin/settings/password',
    () => {
      if (!validatePassword()) {
        throw new Error('Please correct the password information.');
      }

      return {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value
      };
    },
    () => {
      passwordForm.reset();
      resetPasswordVisibility(passwordForm);
    }
  );


  // =========================================
  // PREFERENCES FORM
  // =========================================

  handleSubmission(
    preferencesForm,
    '/admin/settings/preferences',
    () => ({
      preferredLanguage: document.getElementById('preferredLanguage').value,
      preferredTheme: document.getElementById('preferredTheme').value
    }),
    () => {
      preferencesForm.querySelectorAll('select').forEach(select => {
        Array.from(select.options).forEach(option => {
          option.defaultSelected = option.selected;
        });
      });
    }
  );


  // =========================================
  // NOTIFICATIONS FORM
  // =========================================

  handleSubmission(
    notificationsForm,
    '/admin/settings/notifications',
    () => ({
      notifyAccountActivity: document.getElementById('notifyAccountActivity').checked,
      notifySystemEvents: document.getElementById('notifySystemEvents').checked
    }),
    () => {
      notificationsForm.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.defaultChecked = input.checked;
      });
    }
  );


  // =========================================
  // CANCEL BUTTONS
  // =========================================

  document.getElementById('cancelProfile')?.addEventListener('click', () => {
    profileForm?.reset();
    clearErrors(profileForm);
    validateEmailLive();
  });

  document.getElementById('cancelPassword')?.addEventListener('click', () => {
    passwordForm?.reset();
    clearErrors(passwordForm);

    if (passwordForm) {
      resetPasswordVisibility(passwordForm);
    }
  });

  document.getElementById('cancelPreferences')?.addEventListener('click', () => {
    preferencesForm?.reset();
  });

  document.getElementById('cancelNotifications')?.addEventListener('click', () => {
    notificationsForm?.reset();
  });


  // =========================================
  // PASSWORD VISIBILITY RESET
  // =========================================

  function resetPasswordVisibility(form) {
    form.querySelectorAll('.password-toggle').forEach(button => {
      const input = document.getElementById(button.dataset.target);

      if (!input) return;

      input.type = 'password';
      button.innerHTML = '<i class="fas fa-eye"></i>';
      button.setAttribute('aria-label', 'Show password');
    });
  }


  // =========================================
  // TOAST NOTIFICATION
  // =========================================

  let toastTimeout;

  function showToast(message, isError = false) {
    const toast = document.getElementById('settingsToast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    const icon = toast.querySelector('i');

    toastMessage.textContent = message;

    toast.classList.toggle('toast-error', isError);

    if (icon) {
      icon.className = isError
        ? 'fas fa-exclamation-circle'
        : 'fas fa-check-circle';
    }

    toast.classList.add('show');

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

});