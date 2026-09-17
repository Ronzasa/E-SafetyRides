const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

async function apiGet(path, { auth = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: auth ? authHeaders() : {},
  });
  return parseResponse(res);
}

async function apiPost(path, body, { auth = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? authHeaders() : {}) },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

async function apiUpload(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse(res);
}

export { apiGet, apiPost, apiUpload };