const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// TEMPORARY — the backend is running on tempAuth (see server/middleware/tempAuth.js),
// which fakes req.user from a ?testUser= query param. Swap this out once Member 4's
// real auth module lands and we're attaching a real JWT instead.
const DEV_USER_ID = 'dev-user-1';

function withTempAuth(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}testUser=${DEV_USER_ID}`;
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
  const url = auth ? withTempAuth(`${BASE_URL}${path}`) : `${BASE_URL}${path}`;
  const res = await fetch(url);
  return parseResponse(res);
}

async function apiPost(path, body, { auth = false } = {}) {
  const url = auth ? withTempAuth(`${BASE_URL}${path}`) : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

async function apiUpload(path, formData) {
  const url = withTempAuth(`${BASE_URL}${path}`);
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return parseResponse(res);
}

export { apiGet, apiPost, apiUpload };