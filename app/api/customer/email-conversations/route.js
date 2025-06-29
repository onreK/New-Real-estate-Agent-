'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function EmailDashboard() {
  const { user } = useUser();
  const [emailConversations, setEmailConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total_email_conversations: 0,
    total_email_messages: 0
  });

  useEffect(() => {
    if (user) {
      loadEmailConversations();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadEmailConversations = async () => {
    try {
      const response = await fetch('/api/customer/email-conversations');
      const data = await response.json();
      
      if (data.success) {
        setEmailConversations(data.conversations);
      } else {
        console.error('Failed to load email conversations:', data.error);
      }
    } catch (error) {
      console.error('Error loading email conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/customer/email-messages?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        console.error('Failed to load messages:', data.error);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/customer/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const sendManualEmail = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/customer/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: newMessage,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedConversation.id); // Reload messages
        console.log('✅ Email sent successfully');
      } else {
        console.error('Failed to send email:', data.error);
        alert('Failed to send email: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMessagePreview = (content) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📧 Email Management</h1>
              <p className="text-sm text-gray-600">Manage AI-powered email conversations</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Email Conversations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_email_conversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Email Messages</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_email_messages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Conversations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Email Conversations</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {emailConversations.length} total conversations
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {emailConversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">No email conversations yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Email conversations will appear here when customers email your business
                    </p>
                  </div>
                ) : (
                  emailConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900 truncate">
                          {conversation.customer_email}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          conversation.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        Subject: {conversation.subject}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(conversation.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Email Messages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedConversation.customer_email}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Subject: {selectedConversation.subject}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="h-96 overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            message.sender === 'customer'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className={`text-xs mt-2 ${
                            message.sender === 'customer' ? 'text-gray-500' : 'text-blue-100'
                          }`}>
                            {formatDate(message.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Send Manual Email */}
                  <div className="p-6 border-t border-gray-100">
                    <div className="flex space-x-4">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your email response..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <button
                        onClick={sendManualEmail}
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        {sending ? 'Sending...' : 'Send Email'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This will send a manual email response from your business email
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xl text-gray-500 mb-2">Select an Email Conversation</p>
                  <p className="text-gray-400">
                    Choose a conversation from the left to view email messages and send responses
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
