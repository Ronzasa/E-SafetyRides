const API_BASE = 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (auth) {
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const message = data.error || 'Something went wrong';
        throw new Error(message);
    }

    return data;
}

export const api = {
    get: (path, opts) => request(path, {...opts, method: 'GET' }),
    post: (path, body, opts) => request(path, {...opts, method: 'POST', body }),
    patch: (path, body, opts) => request(path, {...opts, method: 'PATCH', body }),
};