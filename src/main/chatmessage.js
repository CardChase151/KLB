import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './chatmessage.css';

// CHAT_ENABLED: Set to true when chats/chat_participants/chat_messages tables exist in Supabase
const CHAT_ENABLED = false;

function ChatMessage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null);
  const [participantUsers, setParticipantUsers] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userPermissions, setUserPermissions] = useState({});
  const { chatId } = useParams();
  const navigate = useNavigate();

  // App.js handles auth - this component only renders when authenticated
  useEffect(() => {
    if (CHAT_ENABLED) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (CHAT_ENABLED && user && chatId) {
      loadUserPermissions();
      loadChatData();
      loadMessages();
    }
  }, [user, chatId]);

  const loadInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('can_send_messages')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserPermissions(userData);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setUserPermissions({
        can_send_messages: true
      });
    }
  };

  const loadChatData = async () => {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      setChat(chatData);

      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('user_id, joined_at')
        .eq('chat_id', chatId)
        .eq('is_active', true);

      if (participantError) throw participantError;

      await loadParticipantMetadata(participantData.map(p => p.user_id));
    } catch (error) {
      console.error('Error loading chat data:', error);
      alert('Error loading chat: ' + error.message);
      navigate('/chat');
    }
  };

  const loadParticipantMetadata = async (userIds) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (error) throw error;

      const usersMap = {};
      users.forEach(userRecord => {
        usersMap[userRecord.id] = {
          user_id: userRecord.id,
          first_name: userRecord.first_name || '',
          last_name: userRecord.last_name || '',
          full_name: userRecord.first_name && userRecord.last_name 
            ? `${userRecord.first_name} ${userRecord.last_name}`.trim()
            : userRecord.first_name || userRecord.last_name || 'Team Member',
          email: userRecord.email || ''
        };
      });

      setParticipantUsers(usersMap);
    } catch (error) {
      console.error('Error loading participant metadata:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const getChatTitle = () => {
    if (!chat) return 'Chat';
    
    if (chat.type === 'individual') {
      const otherUserId = Object.keys(participantUsers).find(userId => userId !== user?.id);
      const otherParticipant = otherUserId ? participantUsers[otherUserId] : null;
      if (otherParticipant) {
        return otherParticipant.full_name || 'Team Member';
      }
      return 'Direct Message';
    }
    
    return chat.name;
  };

  const getChatSubtitle = () => {
    const participantCount = Object.keys(participantUsers).length;
    
    if (chat?.type === 'mandatory') {
      return `${participantCount} members • Required`;
    }
    if (chat?.type === 'group') {
      return `${participantCount} members`;
    }
    if (chat?.type === 'individual') {
      return 'Direct message';
    }
    return `${participantCount} members`;
  };

  const getUserDisplayName = (userId) => {
    if (userId === user?.id) return 'You';
    
    const participant = participantUsers[userId];
    if (participant && participant.full_name && participant.full_name !== 'Team Member') {
      return participant.full_name;
    }
    
    return 'Team Member';
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const isCurrentUser = (senderId) => senderId === user?.id;

  const canSendMessages = () => {
    return userPermissions.can_send_messages !== false;
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    if (!canSendMessages()) {
      alert('You do not have permission to send messages.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            chat_id: chatId,
            sender_id: user.id,
            message: newMessage.trim()
          }
        ]);

      if (error) throw error;

      setNewMessage('');
      
      // Reset textarea height after sending
      setTimeout(() => {
        const textarea = document.querySelector('.message-input');
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = '40px';
        }
      }, 10);

      // Reload messages to show the new message
      await loadMessages();
      
      // Scroll to bottom after sending
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  if (loading) {
    return (
      <div className="chat-message-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: '#888' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="chat-message-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <h3 style={{ color: '#fff' }}>Chat not found</h3>
          <button onClick={handleBackToChat} style={{ background: '#ffffff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', marginTop: '16px' }}>
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-message-container">
      {/* Header */}
      <div className="chat-header">
        <button className="back-button-chat" onClick={handleBackToChat}>
          ←
        </button>
        <div className="chat-info">
          <h1 className="chat-title">{getChatTitle()}</h1>
          <p className="chat-subtitle">{getChatSubtitle()}</p>
        </div>
      </div>

      {/* Messages container - middle area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <h3>No messages yet</h3>
            <p>Be the first to welcome everyone to the team!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${isCurrentUser(msg.sender_id) ? 'current-user' : 'other-user'}`}>
                {!isCurrentUser(msg.sender_id) && (
                  <div className="message-sender">
                    <span className="sender-name">
                      {getUserDisplayName(msg.sender_id)}
                    </span>
                    <span className="message-time">{formatMessageTime(msg.sent_at)}</span>
                  </div>
                )}

                <div className={`message-content ${isCurrentUser(msg.sender_id) ? 'current-user' : 'other-user'}`}>
                  {msg.message}
                </div>

                {isCurrentUser(msg.sender_id) && (
                  <div className="message-time-current">
                    {formatMessageTime(msg.sent_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input - Static at bottom */}
      <div className="message-input-container">
        {canSendMessages() ? (
          <div className="message-input-wrapper">
            <textarea
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${getChatTitle()}...`}
              className="message-input"
              rows="1"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`send-button ${newMessage.trim() ? 'active' : ''}`}
            >
              →
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
            You do not have permission to send messages in this chat.
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;