'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  TrendingUp, Activity, Target, DollarSign, Clock, Users,
  BarChart3, Zap, Phone, Calendar, MessageSquare, Award,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download,
  ChevronRight, AlertCircle, CheckCircle, Info
} from 'lucide-react';

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [customer, setCustomer] = useState(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/customer/analytics?period=${period}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
        setCustomer(data.customer);
      } else {
        // Set empty analytics if no data
        setAnalytics(getEmptyAnalytics());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message);
      setAnalytics(getEmptyAnalytics());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchAnalytics();
    }
  }, [isLoaded, user, period]);

  // Get empty analytics structure
  const getEmptyAnalytics = () => ({
    overview: {
      effectiveness_score: 0,
      total_interactions_month: 0,
      interactions_today: 0,
      hot_leads_today: 0,
      hot_leads_month: 0,
      phone_requests_today: 0,
      phone_requests_month: 0,
      appointments_month: 0
    },
    channels: [],
    insights: [],
    topBehaviors: [],
    businessValue: { total: 0, breakdown: {} },
    dailyTrend: []
  });

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  // Get color for effectiveness score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get icon for insight type
  const getInsightIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white">Please sign in to view analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Analytics</h1>
            <p className="text-gray-300">Track your AI&apos;s behavior and business impact</p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {['today', 'week', 'month', 'year', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg capitalize transition-all ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analytics...</p>
            </div>
          </div>
        </div>
      ) : analytics ? (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Effectiveness Score Hero */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl border border-white/20 p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-300 mb-4">AI Effectiveness Score</h3>
                <div className={`text-6xl font-bold ${getScoreColor(analytics.overview?.effectiveness_score || 0)}`}>
                  {analytics.overview?.effectiveness_score || 0}
                </div>
                <div className="text-gray-400 mt-2">out of 100</div>
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-white">
                    {formatNumber(analytics.overview?.total_interactions_month || 0)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Total Interactions</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-green-400">
                    {formatNumber(analytics.overview?.hot_leads_month || 0)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Hot Leads</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-400">
                    {formatNumber(analytics.overview?.phone_requests_month || 0)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Phone Requests</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-400">
                    {formatNumber(analytics.overview?.appointments_month || 0)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Appointments</div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Value & Top Behaviors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Value Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  Estimated Business Value
                </h3>
              </div>
              <div className="text-4xl font-bold text-green-400 mb-4">
                ${formatNumber(analytics.businessValue?.total || 0)}
              </div>
              {analytics.businessValue?.breakdown && Object.keys(analytics.businessValue.breakdown).length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {Object.entries(analytics.businessValue.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white">${formatNumber(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Behaviors Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Target className="w-6 h-6 text-purple-400" />
                  Top AI Behaviors
                </h3>
              </div>
              {analytics.topBehaviors && analytics.topBehaviors.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topBehaviors.slice(0, 5).map((behavior, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">
                        {behavior.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{behavior.occurrences}</span>
                        <span className="text-gray-500 text-sm">({behavior.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No behavior data available yet</p>
              )}
            </div>
          </div>

          {/* Channel Performance */}
          {analytics.channels && analytics.channels.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Channel Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analytics.channels.map((channel, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-4">
                    <div className="text-lg font-medium text-white capitalize mb-2">
                      {channel.name}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Interactions</span>
                        <span className="text-white">{channel.interactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hot Leads</span>
                        <span className="text-green-400">{channel.hot_leads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Conversion</span>
                        <span className="text-purple-400">{channel.conversion_rate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {analytics.insights && analytics.insights.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-yellow-400" />
                AI-Generated Insights
              </h3>
              <div className="space-y-3">
                {analytics.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    {getInsightIcon(insight.type)}
                    <p className="text-gray-300 flex-1">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Trend Chart (Simplified) */}
          {analytics.dailyTrend && analytics.dailyTrend.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                Activity Trend
              </h3>
              <div className="space-y-2">
                {analytics.dailyTrend.slice(0, 7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-white">{day.total_events} events</span>
                      {day.hot_leads > 0 && (
                        <span className="text-green-400">{day.hot_leads} hot leads</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Data Message */}
          {(!analytics.overview || analytics.overview.total_interactions_month === 0) && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-12">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Analytics Data Yet</h3>
                <p className="text-gray-400 mb-6">
                  Analytics will appear here once your AI starts interacting with customers.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => window.location.href = '/email'}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                  >
                    Configure Email AI
                  </button>
                  <button
                    onClick={() => window.location.href = '/ai-config'}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
                    AI Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
