import client from './client';

/**
 * Auth API
 */

export function register({ name, email, password, password_confirmation }) {
  return client.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation,
  });
}

export function login({ email, password }) {
  return client.post('/auth/login', { email, password });
}

export function me() {
  return client.get('/auth/me');
}

export function refreshToken({ refresh_token }) {
  return client.post('/auth/refresh', { refresh_token });
}

export function logout() {
  return client.post('/auth/logout');
}

export function forgotPassword({ email }) {
  return client.post('/auth/forgot-password', { email });
}

export function resetPassword({ token, email, password, password_confirmation }) {
  return client.post('/auth/reset-password', {
    token,
    email,
    password,
    password_confirmation,
  });
}

export function updateProfile(data) {
  return client.put('/auth/profile', data);
}

export function changePassword({ current_password, password, password_confirmation }) {
  return client.put('/auth/password', {
    current_password,
    password,
    password_confirmation,
  });
}
