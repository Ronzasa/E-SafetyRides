import { useEffect, useMemo, useState } from 'react';
import { AdminAppShell, AppIcon, PageIntro, StatusPill } from '../components/SafetyAppShell';
import { api } from '../lib/api';

function formatDate(value) {
  if (!value) return '—';
  const seconds = value.seconds ?? value._seconds;
  const date = value.toDate ? value.toDate() : seconds ? new Date(seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}

function roleTone(role) {
  return role === 'admin' ? 'amber' : 'blue';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/users')
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(query));
  }, [search, users]);

  const communityCount = users.filter((user) => user.role !== 'admin').length;
  const adminCount = users.length - communityCount;

  return (
    <AdminAppShell>
      <div className="app-content admin-content">
        <PageIntro
          eyebrow="Community access"
          title="Users"
          description="Review the registered community and the accounts with administrator access."
          action={(
            <span className="admin-header-stat">
              <AppIcon name="users" size={16} /> {users.length} registered
            </span>
          )}
        />

        {error && <div className="auth-error">{error}</div>}
        {loading && <p className="workflow-loading">Loading users...</p>}

        {!loading && (
          <>
            <section className="admin-user-summary" aria-label="User account summary">
              <article>
                <span>All accounts</span>
                <strong>{users.length}</strong>
                <small>Registered on E-SafetyRides</small>
              </article>
              <article>
                <span>Passenger accounts</span>
                <strong>{communityCount}</strong>
                <small>Community safety participants</small>
              </article>
              <article>
                <span>Administrators</span>
                <strong>{adminCount}</strong>
                <small>Accounts with moderation access</small>
              </article>
            </section>

            <section className="app-card admin-users-card">
              <div className="admin-users-card-header">
                <div>
                  <span className="section-kicker">Account directory</span>
                  <h2>Registered users</h2>
                  <p>Search by a member’s name or email address.</p>
                </div>
                <label className="admin-search-control">
                  <AppIcon name="search" size={16} />
                  <span className="sr-only">Search users</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users..."
                  />
                </label>
              </div>

              <div className="admin-users-table-wrap">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="admin-users-empty">
                          {search ? 'No users match your search.' : 'No users have registered yet.'}
                        </td>
                      </tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.uid}>
                        <td data-label="Member">
                          <div className="admin-user-identity">
                            <span className={`admin-user-avatar ${roleTone(user.role)}`}>{initials(user.name)}</span>
                            <span>
                              <strong>{user.name || 'Unnamed user'}</strong>
                              <small>{user.email || 'No email available'}</small>
                            </span>
                          </div>
                        </td>
                        <td data-label="Role"><StatusPill tone={roleTone(user.role)}>{user.role || 'passenger'}</StatusPill></td>
                        <td data-label="Joined" className="admin-user-date">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminAppShell>
  );
}
