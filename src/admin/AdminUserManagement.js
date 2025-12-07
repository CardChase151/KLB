import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './admin.css';

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      navigate('/home', { replace: true });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      navigate('/home', { replace: true });
      return;
    }

    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users');

      if (error) {
        console.error('Error loading users:', error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const toggleAdminRole = async (userId, currentRole) => {
    setUpdating(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) {
        console.error('Error updating role:', error);
        alert('Failed to update user role');
      } else {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        ));
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    }
    setUpdating(null);
  };

  const goBack = () => {
    navigate('/admin');
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      overflow: 'hidden',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div className="desktop-header-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
        position: 'relative',
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#ffffff',
            flexShrink: 0,
            fontSize: '1.2rem'
          }}
        >
          ←
        </button>
        <h1 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          marginRight: '40px'
        }}>User Management</h1>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '40px',
          right: '40px',
          height: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderRadius: '1px'
        }} />
      </div>

      {/* Search Bar */}
      <div style={{ padding: '16px 20px 8px' }}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* User Count */}
      <div style={{
        padding: '8px 20px 16px',
        color: '#888',
        fontSize: '14px'
      }}>
        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
      </div>

      {/* Scrollable User List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '100px'
      }}>
        <div style={{ padding: '0 20px' }}>
          {filteredUsers.map(user => (
            <div
              key={user.id}
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid #2a2a2a'
              }}
            >
              {/* User Info */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  {user.first_name} {user.last_name}
                </div>
                <div style={{
                  color: '#888',
                  fontSize: '14px'
                }}>
                  {user.email}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {/* Admin Toggle Button */}
                <button
                  onClick={() => toggleAdminRole(user.id, user.role)}
                  disabled={updating === user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: user.role === 'admin' ? '#2d3a2d' : '#2a2a2a',
                    border: user.role === 'admin' ? '1px solid #4CAF50' : '1px solid #333',
                    borderRadius: '8px',
                    cursor: updating === user.id ? 'wait' : 'pointer',
                    opacity: updating === user.id ? 0.6 : 1
                  }}
                >
                  <span style={{
                    color: user.role === 'admin' ? '#4CAF50' : '#888',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    Admin
                  </span>
                  {/* Toggle Switch */}
                  <div style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: user.role === 'admin' ? '#4CAF50' : '#444',
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      position: 'absolute',
                      top: '2px',
                      left: user.role === 'admin' ? '18px' : '2px',
                      transition: 'left 0.2s ease'
                    }} />
                  </div>
                </button>

                {/* 10 Days Button */}
                <button
                  onClick={() => navigate(`/admin/users/${user.id}/10day`)}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  10 Days
                </button>

                {/* Level Up Button */}
                <button
                  onClick={() => navigate(`/admin/users/${user.id}/levelup`)}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Level Up
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#666',
              padding: '40px 20px'
            }}>
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUserManagement;
