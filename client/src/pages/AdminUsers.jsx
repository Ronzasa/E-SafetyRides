import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function formatDate(d) {
    if (!d) return '—';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{users.length} registered user{users.length === 1 ? '' : 's'}</p>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}
      {loading && <p>Loading users...</p>}

      {!loading && (
        <>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1.5px solid var(--color-border)',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              background: 'var(--color-surface)',
            }}
          />

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-primary-tint)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      {search ? 'No users match your search.' : 'No users yet.'}
                    </td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--color-primary-dark)',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.9rem',
};
