'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  Building,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    totalValue: 0,
    avgScore: 0
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, searchTerm, temperatureFilter, sortBy]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/leads');
      
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        
        // Calculate stats
        const leadStats = {
          total: data.leads?.length || 0,
          hot: data.leads?.filter(l => l.temperature === 'hot').length || 0,
          warm: data.leads?.filter(l => l.temperature === 'warm').length || 0,
          cold: data.leads?.filter(l => l.temperature === 'cold').length || 0,
          totalValue: data.leads?.reduce((sum, l) => sum + (l.potential_value || 0), 0) || 0,
          avgScore: data.leads?.length > 0 
            ? Math.round(data.leads.reduce((sum, l) => sum + l.score, 0) / data.leads.length)
            : 0
        };
        setStats(leadStats);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortLeads = () => {
    let filtered = [...leads];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply temperature filter
    if (temperatureFilter !== 'all') {
      filtered = filtered.filter(lead => lead.temperature === temperatureFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'score':
        filtered.sort((a, b) => b.score - a.score);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.last_interaction) - new Date(a.last_interaction));
        break;
      case 'value':
        filtered.sort((a, b) => b.potential_value - a.potential_value);
        break;
      default:
        break;
    }

    setFilteredLeads(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Score', 'Temperature', 'Last Contact', 'Channel', 'Value'];
    const csvData = filteredLeads.map(lead => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.company || '',
      lead.score,
      lead.temperature,
      new Date(lead.last_interaction).toLocaleDateString(),
      lead.primary_channel,
      lead.potential_value
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTemperatureIcon = (temperature) => {
    switch (temperature) {
      case 'hot':
        return <Flame className="w-4 h-4" />;
      case 'warm':
        return <Thermometer className="w-4 h-4" />;
      case 'cold':
        return <Snowflake className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTemperatureColor = (temperature) => {
    switch (temperature) {
      case 'hot':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warm':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading leads data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Lead Management</h1>
                <p className="text-gray-400 text-sm">Track and manage all your potential customers</p>
              </div>
            </div>
            <Button 
              onClick={fetchLeads}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Leads</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Hot Leads</p>
                  <p className="text-2xl font-bold text-red-400">{stats.hot}</p>
                </div>
                <Flame className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Warm Leads</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.warm}</p>
                </div>
                <Thermometer className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cold Leads</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.cold}</p>
                </div>
                <Snowflake className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Score</p>
                  <p className="text-2xl font-bold text-green-400">{stats.avgScore}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Value</p>
                  <p className="text-2xl font-bold text-purple-400">${stats.totalValue}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, phone, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Temperature Filter */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setTemperatureFilter('all')}
                  variant={temperatureFilter === 'all' ? 'default' : 'outline'}
                  className={temperatureFilter === 'all' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
                >
                  All
                </Button>
                <Button
                  onClick={() => setTemperatureFilter('hot')}
                  variant={temperatureFilter === 'hot' ? 'default' : 'outline'}
                  className={temperatureFilter === 'hot' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
                >
                  <Flame className="w-4 h-4 mr-1" />
                  Hot
                </Button>
                <Button
                  onClick={() => setTemperatureFilter('warm')}
                  variant={temperatureFilter === 'warm' ? 'default' : 'outline'}
                  className={temperatureFilter === 'warm' 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
                >
                  <Thermometer className="w-4 h-4 mr-1" />
                  Warm
                </Button>
                <Button
                  onClick={() => setTemperatureFilter('cold')}
                  variant={temperatureFilter === 'cold' ? 'default' : 'outline'}
                  className={temperatureFilter === 'cold' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}
                >
                  <Snowflake className="w-4 h-4 mr-1" />
                  Cold
                </Button>
              </div>

              {/* Sort Options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
              >
                <option value="score">Sort by Score</option>
                <option value="recent">Sort by Recent</option>
                <option value="value">Sort by Value</option>
              </select>

              {/* Export Button */}
              <Button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="p-4 text-gray-400 font-medium">Lead</th>
                    <th className="p-4 text-gray-400 font-medium">Contact</th>
                    <th className="p-4 text-gray-400 font-medium">Score</th>
                    <th className="p-4 text-gray-400 font-medium">Temperature</th>
                    <th className="p-4 text-gray-400 font-medium">Last Activity</th>
                    <th className="p-4 text-gray-400 font-medium">Channel</th>
                    <th className="p-4 text-gray-400 font-medium">Value</th>
                    <th className="p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-400">
                        {searchTerm || temperatureFilter !== 'all' 
                          ? 'No leads found matching your filters'
                          : 'No leads yet. They will appear here as your AI interacts with customers.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{lead.name || 'Unknown'}</p>
                            {lead.company && (
                              <p className="text-gray-400 text-sm flex items-center mt-1">
                                <Building className="w-3 h-3 mr-1" />
                                {lead.company}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {lead.email && (
                              <p className="text-gray-300 text-sm flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {lead.email}
                              </p>
                            )}
                            {lead.phone && (
                              <p className="text-gray-300 text-sm flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {lead.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(lead.score)}`}>
                            {lead.score}/100
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getTemperatureColor(lead.temperature)}`}>
                            {getTemperatureIcon(lead.temperature)}
                            <span className="capitalize">{lead.temperature}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-gray-300 text-sm">{formatTimeAgo(lead.last_interaction)}</p>
                            {lead.last_message && (
                              <p className="text-gray-500 text-xs mt-1 truncate max-w-xs">
                                "{lead.last_message}"
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-white/10 text-gray-300 border-white/20">
                            {lead.primary_channel}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-green-400 font-medium">${lead.potential_value}</p>
                        </td>
                        <td className="p-4">
                          <Button
                            onClick={() => router.push(`/leads/${lead.id}`)}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            View
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
