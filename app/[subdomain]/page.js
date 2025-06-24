'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomerSitePage() {
  const params = useParams();
  const subdomain = params.subdomain;
  
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchSiteData();
  }, [subdomain]);

  const fetchSiteData = async () => {
    try {
      const response = await fetch(`/api/sites/${subdomain}`);
      const data = await response.json();
      
      if (response.ok) {
        setSiteData(data);
        // Initialize chat with welcome message
        setMessages([{
          from: 'bot',
          text: `Hi! I'm ${data.contact.ownerName}'s AI assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load site');
    }
