'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Phone, Calendar, DollarSign, Users, MessageSquare, 
  Mail, Clock, Activity, Target, Award, AlertCircle, CheckCircle,
  BarChart3, PieChart, Zap, Flame, PhoneCall, Star, RefreshCw
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/analytics');
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
        setError(null);
      } else {
        setError(data.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to connect to analytics service');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  // Format numbers with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get effectiveness label
  const getEffectivenessLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Needs Improvement';
    return 'Getting Started';
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="animate-spin h-8 w-8" />
          Loading Analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Analytics Unavailable</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { overview, channels, behaviors, conversions, activity, recent_events, insights, businessValue } = analytics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Analytics Center</h1>
          <p className="text-gray-300">Real-time insights across all channels</p>
        </div>
        <button 
          onClick={refreshAnalytics}
          disabled={refreshing}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
        >
          <Activity className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* AI Effectiveness Score Card */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-purple-500/30 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(overview?.effectiveness_score || 0)}`}>
                    {overview?.effectiveness_score || 0}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">AI Score</div>
                </div>
              </div>
              <Zap className="absolute -top-2 -right-2 h-8 w-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {getEffectivenessLabel(overview?.effectiveness_score || 0)} Performance
              </h2>
              <p className="text-gray-300">
                Your AI processed {formatNumber(overview?.total_interactions_month)} interactions this month
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{formatNumber(overview?.hot_leads_month)}</div>
              <div className="text-sm text-gray-400">Hot Leads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{formatNumber(overview?.appointments_month)}</div>
              <div className="text-sm text-gray-400">Appointments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {['overview', 'channels', 'behaviors', 'insights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === tab
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              icon={MessageSquare}
              title="Interactions Today"
              value={formatNumber(overview?.interactions_today)}
              color="blue"
            />
            <MetricCard
              icon={Flame}
              title="Hot Leads Today"
              value={formatNumber(overview?.hot_leads_today)}
              color="green"
            />
            <MetricCard
              icon={PhoneCall}
              title="Phone Requests"
              value={formatNumber(overview?.phone_requests_today)}
              color="purple"
            />
            <MetricCard
              icon={DollarSign}
              title="Business Value"
              value={`$${formatNumber(businessValue?.total || 0)}`}
              color="orange"
            />
          </div>

          {/* Behavior Summary */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">AI Behavior Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {behaviors && Object.entries(behaviors).slice(0, 5).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{value}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels?.map((channel, index) => (
            <ChannelCard key={index} channel={channel} />
          ))}
        </div>
      )}

      {activeTab === 'behaviors' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">AI Behavior Distribution</h3>
          <div className="space-y-4">
            {behaviors && Object.entries(behaviors).map(([key, value]) => (
              <BehaviorBar key={key} label={key} value={value} total={overview?.total_interactions_month || 1} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights?.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
          
          {(!insights || insights.length === 0) && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
              <p className="text-gray-300">No insights available yet. Keep using the AI to generate insights!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon: Icon, title, value, color }) {
  const colorClasses = {
    blue: 'from-blue-600/20 to-blue-800/20 border-blue-500/30 text-blue-400',
    green: 'from-green-600/20 to-green-800/20 border-green-500/30 text-green-400',
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30 text-purple-400',
    orange: 'from-orange-600/20 to-orange-800/20 border-orange-500/30 text-orange-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-lg rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`h-8 w-8 ${colorClasses[color].split(' ')[3]}`} />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

// Channel Card Component
function ChannelCard({ channel }) {
  const getChannelIcon = (name) => {
    switch(name?.toLowerCase()) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'chat': return MessageSquare;
      case 'phone': return Phone;
      default: return Activity;
    }
  };

  const Icon = getChannelIcon(channel.name);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white capitalize">{channel.name || 'Unknown'}</h3>
        <Icon className="h-6 w-6 text-purple-400" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Interactions</span>
          <span className="text-white font-bold">{channel.interactions || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Phone Requests</span>
          <span className="text-green-400 font-bold">{channel.phone_requests || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Hot Leads</span>
          <span className="text-orange-400 font-bold">{channel.hot_leads || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Appointments</span>
          <span className="text-blue-400 font-bold">{channel.appointments || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Behavior Bar Component
function BehaviorBar({ label, value, total }) {
  const percentage = Math.round((value / total) * 100) || 0;
  const formattedLabel = label.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');

  return (
    <div className="flex items-center gap-4">
      <div className="w-48 text-gray-300 capitalize text-sm">
        {formattedLabel}
      </div>
      <div className="flex-1 bg-gray-700 rounded-full h-8 relative overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
          style={{ width: `${percentage}%` }}
        >
          {percentage > 10 && (
            <span className="text-xs text-white font-bold">
              {value} ({percentage}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({ insight }) {
  const getIcon = () => {
    switch(insight.type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      default: return Activity;
    }
  };

  const Icon = getIcon();
  const colorClass = insight.type === 'success' ? 'text-green-400' : 'text-blue-400';
  const bgClass = insight.type === 'success' 
    ? 'bg-green-500/10 border-green-500/30' 
    : 'bg-blue-500/10 border-blue-500/30';

  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-lg ${bgClass}`}>
      <div className="flex items-start gap-4">
        <Icon className={`h-6 w-6 ${colorClass} mt-1`} />
        <p className="text-white text-lg">{insight.message}</p>
      </div>
    </div>
  );
}
