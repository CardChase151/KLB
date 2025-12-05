import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './bottomnav.css';

function BottomNav({ activeTab, onTabChange, user }) {
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const currentUser = session.user;

      // Get user permissions
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('team_inspire_enabled, hidden_chats')
        .eq('id', currentUser.id)
        .single();

      if (userError) return;

      const userPermissions = userData || {};
      const hiddenChats = userPermissions.hidden_chats || [];

      // Get user's chats
      let chatsQuery = supabase
        .from('chats')
        .select(`
          id,
          type,
          chat_participants!inner(
            user_id,
            last_read_at
          )
        `)
        .eq('chat_participants.user_id', currentUser.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true);

      // Exclude KLB chat if user doesn't have access
      if (!userPermissions.team_inspire_enabled) {
        chatsQuery = chatsQuery.neq('type', 'mandatory');
      }

      // Exclude hidden chats
      if (hiddenChats.length > 0) {
        chatsQuery = chatsQuery.not('id', 'in', `(${hiddenChats.map(id => `"${id}"`).join(',')})`);
      }

      const { data: userChats, error: chatsError } = await chatsQuery;
      if (chatsError) return;

      // Calculate total unread count across all chats
      let totalUnread = 0;

      for (const chat of userChats || []) {
        const userParticipant = chat.chat_participants.find(p => p.user_id === currentUser.id);
        const lastReadAt = userParticipant?.last_read_at;

        if (lastReadAt) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_deleted', false)
            .neq('sender_id', currentUser.id)
            .gt('sent_at', lastReadAt);

          totalUnread += count || 0;
        } else {
          // If no last_read_at, count all messages from others
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_deleted', false)
            .neq('sender_id', currentUser.id);

          totalUnread += count || 0;
        }
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleNavClick = (tab) => {
    // Handle special navigation cases
    if (tab === 'admin') {
      navigate('/admin');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'training') {
      navigate('/training');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'schedule') {
      navigate('/schedule');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'licensing') {
      navigate('/licensing');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'chat') {
      navigate('/chat');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'profile') {
      navigate('/profile');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'calculator') {
      navigate('/calculator');
      setShowMoreNav(false);
      return;
    }

    if (tab === 'notifications') {
      navigate('/notifications');
      setShowMoreNav(false);
      return;
    }

    if (tab !== 'more') {
      setShowMoreNav(false);
      onTabChange(tab);
    }
  };

  const handleMoreClick = () => {
    setShowMoreNav(!showMoreNav);
    // Don't call onTabChange for 'more' - it should only expand/collapse
  };

  return (
    <div className={`bottom-nav ${showMoreNav ? 'expanded' : ''}`}>
      {/* Main Navigation Row */}
      <div className="nav-row main-row">
        <button 
          onClick={() => handleNavClick('home')}
          className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="nav-label">Home</span>
        </button>

        <button 
          onClick={() => handleNavClick('notifications')}
          className={`nav-button ${activeTab === 'notifications' ? 'active' : ''}`}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="nav-label">Notifications</span>
        </button>

        <button
          onClick={() => handleNavClick('schedule')}
          className={`nav-button ${activeTab === 'schedule' ? 'active' : ''}`}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="nav-label">Schedule</span>
        </button>

        <button
          onClick={() => handleNavClick('training')}
          className={`nav-button ${activeTab === 'training' ? 'active' : ''}`}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="nav-label">Training</span>
        </button>

        <button 
          onClick={handleMoreClick}
          className={`nav-button ${showMoreNav ? 'active' : ''}`}
        >
          <svg className={`nav-icon chevron ${showMoreNav ? 'rotated' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="nav-label">More</span>
        </button>
      </div>

      {/* Expanded Navigation Row */}
      {showMoreNav && (
        <div className="nav-row expanded-row">
          <button
            onClick={() => handleNavClick('licensing')}
            className={`nav-button ${activeTab === 'licensing' ? 'active' : ''}`}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="nav-label">Licensing</span>
          </button>

          <button 
            onClick={() => handleNavClick('calculator')}
            className={`nav-button ${activeTab === 'calculator' ? 'active' : ''}`}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth={1.5}></rect>
              <rect x="6" y="4" width="12" height="3" rx="1" strokeWidth={1}></rect>
              <rect x="6" y="9" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="10.75" y="9" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="15.5" y="9" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="6" y="13" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="10.75" y="13" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="15.5" y="13" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="6" y="17" width="2.5" height="2.5" rx="0.3" strokeWidth={1}></rect>
              <rect x="10.75" y="17" width="6.75" height="2.5" rx="0.3" strokeWidth={1}></rect>
            </svg>
            <span className="nav-label">Calculator</span>
          </button>

          <button 
            onClick={() => handleNavClick('profile')}
            className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="nav-label">Profile</span>
          </button>

          {/* Admin button - only visible to admins */}
          {isAdmin ? (
            <button 
              onClick={() => handleNavClick('admin')}
              className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`}
            >
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="nav-label">Admin</span>
            </button>
          ) : (
            /* Empty space to align with More button */
            <div className="nav-button-spacer"></div>
          )}
        </div>
      )}
    </div>
  );
}

export default BottomNav;