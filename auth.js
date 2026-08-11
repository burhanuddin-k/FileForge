const registerTab = document.getElementById('registerTab');
const loginTab = document.getElementById('loginTab');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authMessage = document.getElementById('authMessage');

function showMessage(message, type = 'error') {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = '';
  authMessage.className = 'auth-message';
}

function setMode(mode) {
  const register = mode === 'register';
  registerTab.classList.toggle('active', register);
  loginTab.classList.toggle('active', !register);
  registerForm.classList.toggle('hidden', !register);
  loginForm.classList.toggle('hidden', register);
  authTitle.textContent = register ? 'Create your account' : 'Welcome back';
  authSubtitle.textContent = register ? 'Register to use FileForge tools.' : 'Login to continue to FileForge.';
  clearMessage();
}

registerTab.addEventListener('click', () => setMode('register'));
loginTab.addEventListener('click', () => setMode('login'));

document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? 'Show' : 'Hide';
  });
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearMessage();
  const submit = registerForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Creating account...';

  try {
    const form = new FormData(registerForm);
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name').trim(),
        email: form.get('email').trim(),
        password: form.get('password')
      })
    });
    window.location.href = '/app';
  } catch (error) {
    showMessage(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Create account';
  }
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearMessage();
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Signing in...';

  try {
    const form = new FormData(loginForm);
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email').trim(),
        password: form.get('password')
      })
    });
    window.location.href = '/app';
  } catch (error) {
    showMessage(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Login';
  }
});

(async () => {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) window.location.href = '/app';
  } catch (_) {}
})();
