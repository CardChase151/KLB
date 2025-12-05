import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './chatdash.css';

function ChatDash() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allChats, setAllChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [userMetadataCache, setUserMetadataCache] = useState({});
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('Users');
  const [showSearch, setShowSearch] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const navigate = useNavigate();

  const filterOptions = ['All', 'Individual', 'Groups'];

  useEffect(() => {
    window.scrollTo(0, 0);
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  useEffect(() => {
    if (user && userPermissions && Object.keys(userPermissions).length > 0) {
      loadUserChats();
    }
  }, [user, userPermissions]);

  useEffect(() => {
    applyFilters();
  }, [allChats, activeFilter, searchQuery, searchMode]);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      navigate('/', { replace: true });
      return;
    }

    setUser(session.user);
    setLoading(false);
  };

  const loadUserPermissions = async () => {
    if (!user?.id) {
      console.log('No user ID available for permissions');
      return;
    }
    
    try {
      console.log('Loading permissions for user:', user.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('team_inspire_enabled, can_create_chats, can_send_messages, hidden_chats, archived_chats')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      console.log('Loaded user permissions:', userData);
      setUserPermissions(userData || {});
    } catch (error) {
      console.error('Error loading user permissions:', error);
      // Default permissions if error
      setUserPermissions({
        team_inspire_enabled: true,
        can_create_chats: true,
        can_send_messages: true,
        hidden_chats: [],
        archived_chats: []
      });
    }
  };

  const loadUserMetadata = async (userIds) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (error) throw error;

      const usersMap = {};
      users.forEach(user => {
        usersMap[user.id] = {
          user_id: user.id,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          full_name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`.trim()
            : user.first_name || user.last_name || 'Team Member',
          email: user.email || ''
        };
      });

      return usersMap;
    } catch (error) {
      console.error('Error loading user metadata:', error);
      return {};
    }
  };

  const loadUserChats = async () => {
    setIsLoadingChats(true);
    try {
      // Get user's chats, excluding hidden ones
      const hiddenChats = userPermissions.hidden_chats || [];
      
      let chatsQuery = supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner(
            user_id,
            joined_at,
            last_read_at
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true);

      // Exclude KLB chat if user doesn't have access
      console.log('User permissions:', userPermissions);
      console.log('KLB enabled:', userPermissions.team_inspire_enabled);
      if (!userPermissions.team_inspire_enabled) {
        console.log('Filtering out KLB chat');
        chatsQuery = chatsQuery.neq('type', 'mandatory');
      } else {
        console.log('Keeping KLB chat');
      }

      // Only filter hidden chats if there are any
      if (hiddenChats.length > 0) {
        chatsQuery = chatsQuery.not('id', 'in', `(${hiddenChats.map(id => `"${id}"`).join(',')})`);
      }

      const { data: userChats, error } = await chatsQuery;

      if (error) throw error;

      // Get all unique user IDs from all chats
      const allUserIds = new Set();
      for (const chat of userChats) {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chat.id)
          .eq('is_active', true);
        
        participants?.forEach(p => allUserIds.add(p.user_id));
      }

      // Load metadata for all users at once
      const metadata = await loadUserMetadata([...allUserIds]);
      setUserMetadataCache(metadata);

      // Process each chat with participant and message data
      const chatsWithData = await Promise.all(
        userChats.map(async (chat) => {
          // Get current user's last_read_at for this chat
          const userParticipant = chat.chat_participants.find(p => p.user_id === user.id);
          const lastReadAt = userParticipant?.last_read_at;

          // Get participant count and user IDs
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
            .eq('is_active', true);
          
          const participantCount = participants ? participants.length : 0;
          
          // Get other participant for individual chats
          let otherParticipantName = '';
          let otherParticipantId = null;
          if (chat.type === 'individual' && participants) {
            otherParticipantId = participants.find(p => p.user_id !== user.id)?.user_id;
            console.log('Individual chat debug:', {
              chatId: chat.id,
              chatName: chat.name,
              participants: participants.map(p => p.user_id),
              currentUserId: user.id,
              otherParticipantId,
              metadata: metadata[otherParticipantId]
            });
            
            if (otherParticipantId && metadata[otherParticipantId]) {
              otherParticipantName = metadata[otherParticipantId].full_name;
              console.log('Found other participant name:', otherParticipantName);
            } else {
              console.log('Could not find other participant name');
            }
          }
          
          // Get last message with sender info
          const { data: lastMessageData } = await supabase
            .from('chat_messages')
            .select('message, sent_at, sender_id')
            .eq('chat_id', chat.id)
            .eq('is_deleted', false)
            .order('sent_at', { ascending: false })
            .limit(1);

          let lastMessageSenderName = 'Team Member';
          if (lastMessageData && lastMessageData.length > 0) {
            const lastMessage = lastMessageData[0];
            if (lastMessage.sender_id === user?.id) {
              lastMessageSenderName = 'You';
            } else if (metadata[lastMessage.sender_id]) {
              lastMessageSenderName = metadata[lastMessage.sender_id].full_name;
            }
          }

          // Calculate unread count
          let unreadCount = 0;
          if (lastReadAt) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('is_deleted', false)
              .neq('sender_id', user.id) // Don't count own messages
              .gt('sent_at', lastReadAt);
            
            unreadCount = count || 0;
          } else {
            // If no last_read_at, count all messages from others
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('is_deleted', false)
              .neq('sender_id', user.id);
            
            unreadCount = count || 0;
          }
          
          return {
            ...chat,
            participantCount,
            otherParticipantName,
            otherParticipantId,
            lastMessage: lastMessageData?.[0]?.message || null,
            lastMessageTime: lastMessageData?.[0]?.sent_at || null,
            lastMessageSender: lastMessageData?.[0]?.sender_id || null,
            lastMessageSenderName,
            unreadCount,
            // Enhanced search content including participant names
            searchableContent: getSearchableContent(chat, otherParticipantName, lastMessageData?.[0]?.message)
          };
        })
      );
      
      // Sort chats: KLB first, then unread chats, then by last message time
      const sortedChats = chatsWithData.sort((a, b) => {
        // KLB always first
        if (a.type === 'mandatory') return -1;
        if (b.type === 'mandatory') return 1;
        
        // Then unread chats come next
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        
        // Then by last message time (most recent first)
        const timeA = new Date(a.lastMessageTime || a.created_at);
        const timeB = new Date(b.lastMessageTime || b.created_at);
        return timeB - timeA;
      });
      
      setAllChats(sortedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      alert('Error loading chats: ' + error.message);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const getSearchableContent = (chat, otherParticipantName, lastMessage) => {
    const content = [];
    
    // Add chat name
    content.push(chat.name);
    
    // Add other participant name for individual chats
    if (chat.type === 'individual' && otherParticipantName) {
      content.push(otherParticipantName);
    }
    
    // Add last message
    if (lastMessage) {
      content.push(lastMessage);
    }
    
    return content.join(' ').toLowerCase();
  };

  const applyFilters = () => {
    let filtered = [...allChats];
    
    // Apply type filter
    if (activeFilter === 'Individual') {
      filtered = filtered.filter(chat => chat.type === 'individual');
    } else if (activeFilter === 'Groups') {
      filtered = filtered.filter(chat => chat.type === 'group');
    }
    // 'All' shows everything including mandatory
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      if (searchMode === 'Users') {
        // Search by participant names and chat names
        filtered = filtered.filter(chat => 
          chat.searchableContent.includes(query)
        );
      } else if (searchMode === 'Messages') {
        // Search by message content only
        filtered = filtered.filter(chat => 
          chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)
        );
      }
    }
    
    setFilteredChats(filtered);
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleChatClick = async (chat) => {
    // Mark chat as read when opening
    try {
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chat.id)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
    
    navigate(`/chat/${chat.id}`);
  };

  const handleNewChat = () => {
    if (!userPermissions.can_create_chats) {
      alert('You do not have permission to create chats.');
      return;
    }
    navigate('/chat/create');
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const toggleSearchMode = () => {
    setSearchMode(searchMode === 'Users' ? 'Messages' : 'Users');
    setSearchQuery('');
  };

  const getChatDisplayName = (chat) => {
    if (chat.type === 'mandatory') {
      return chat.name; // "KLB"
    }
    
    if (chat.type === 'individual') {
      // Show only the other person's name
      return chat.otherParticipantName || 'Team Member';
    }
    
    // Group chats use their custom name
    return chat.name;
  };

  const getChatIcon = (chat) => {
    if (chat.type === 'mandatory') {
      return (
        <img 
          src="/assets/logo.jpg" 
          alt="KLB"
          className="chat-icon-image"
        />
      );
    }
    
    if (chat.type === 'individual') {
      return (
        <svg className="chat-icon-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      );
    }
    
    // Group chat icon
    return (
      <svg className="chat-icon-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.002 3.002 0 0 0 17.5 7c-.8 0-1.54.37-2.01.95L14 10.5l-1.49-2.55A3.002 3.002 0 0 0 10 7c-.8 0-1.54.37-2.01.95L5.5 12H8v10H4v-2H2v4h20v-4h-2v2h-4zm-8-10c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM2 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2z"/>
      </svg>
    );
  };

  const getChatSubtitle = (chat) => {
    if (chat.type === 'mandatory') return `${chat.participantCount} members • Required`;
    if (chat.type === 'group') return `${chat.participantCount} members`;
    return 'Direct message';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Same day - show time
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) {
      // Within a week - show day of week
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="spinner"></div>
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
      overflow: 'hidden'
    }}>
      {/* Dynamic Bar Background - Black */}
      <div style={{
        backgroundColor: '#000000',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        height: '60px',
        zIndex: '999'
      }}></div>

      {/* Back Button - Fixed Position */}
      <button
        onClick={handleBackToHome}
        style={{
          position: 'fixed',
          top: '70px',
          left: '20px',
          zIndex: '1000',
          width: '36px',
          height: '36px',
          fontSize: '1.5rem',
          boxShadow: '0 2px 8px rgba(255, 0, 0, 0.2)',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        ←
      </button>

      {/* Title - Fixed Position */}
      <div style={{
        position: 'fixed',
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '1000'
      }}>
        <h1 className="app-title" style={{margin: '0', fontSize: '2rem', whiteSpace: 'nowrap'}}>Chats</h1>
      </div>

      {/* Header Actions - Fixed Position */}
      <div style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: '1000',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button onClick={toggleSearch} style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>

        {userPermissions.can_create_chats && (
          <button onClick={handleNewChat} style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable Content Container */}
      <div style={{
        position: 'fixed',
        top: '120px',
        left: '0',
        right: '0',
        bottom: '100px',
        overflowY: 'auto',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="app-container" style={{
          marginTop: '0',
          minHeight: '100%',
          paddingBottom: '20px',
          paddingLeft: '20px',
          paddingRight: '25px',
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>


      {/* Search Section */}
      {showSearch && (
        <div className="search-section">
          <div className="search-mode-toggle">
            <button 
              className={`search-mode-btn ${searchMode === 'Users' ? 'active' : ''}`}
              onClick={toggleSearchMode}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Users
            </button>
            <button 
              className={`search-mode-btn ${searchMode === 'Messages' ? 'active' : ''}`}
              onClick={toggleSearchMode}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              Messages
            </button>
          </div>
          
          <div className="search-input-container">
            <svg className="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder={searchMode === 'Users' ? 'Search by names...' : 'Search messages...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterChange(filter)}
            className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div className="chat-list-container">
        {isLoadingChats ? (
          <div className="loading-container">
            <div className="loader"></div>
            <p className="loading-text">Loading chats...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" fill="none" stroke="#666" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3>No chats found</h3>
            <p>
              {searchQuery ? 
                `No chats match "${searchQuery}"` : 
                activeFilter === 'All' ? 
                  'Start a conversation to get connected' :
                  `No ${activeFilter.toLowerCase()} chats yet`
              }
            </p>
          </div>
        ) : (
          <div className="chat-list">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-card ${chat.type === 'mandatory' ? 'mandatory' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => handleChatClick(chat)}
              >
                <div className={`chat-avatar ${chat.type === 'mandatory' ? 'mandatory' : ''}`}>
                  {getChatIcon(chat)}
                  {chat.unreadCount > 0 && (
                    <div className="unread-badge">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </div>
                  )}
                </div>

                <div className="chat-content">
                  <div className="chat-header-row">
                    <h3 className={`chat-title ${chat.type === 'mandatory' ? 'mandatory' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}>
                      {getChatDisplayName(chat)}
                    </h3>
                    <span className="chat-timestamp">
                      {formatTimestamp(chat.lastMessageTime) || 
                       formatTimestamp(chat.created_at)}
                    </span>
                  </div>

                  <p className="chat-subtitle">
                    {getChatSubtitle(chat)}
                  </p>

                  <div className="chat-last-message">
                    <p className={`last-message-text ${chat.unreadCount > 0 ? 'unread' : ''}`}>
                      {chat.lastMessage ? (
                        <>
                          <span className="message-sender-name">
                            {chat.lastMessageSenderName}:
                          </span>{' '}
                          {chat.lastMessage}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                  </div>
                </div>

                {chat.unreadCount > 0 && (
                  <div className="unread-indicator">
                    <div className="unread-dot"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

export default ChatDash;