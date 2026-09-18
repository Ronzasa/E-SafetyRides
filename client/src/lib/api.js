const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, formData, auth = true } = {}) {
    const headers = formData ? {} : { 'Content-Type': 'application/json' };

    if (auth) {
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: formData || (body ? JSON.stringify(body) : undefined),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const message = data.error || data.message || `Request failed (${res.status})`;
        const error = new Error(message);
        error.status = res.status;
        throw error;
    }

    return data;
}

export const api = {
    get: (path, opts) => request(path, { ...opts, method: 'GET' }),
    post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
    patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
    upload: (path, formData, opts) => request(path, { ...opts, method: 'POST', formData }),
};
