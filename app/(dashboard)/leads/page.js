'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronLeft,
  Flame,
  Thermometer,
  Snowflake,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  DollarSign
} from 'lucide-react';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');  // Changed default to 'recent'
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(10); // Show 10 leads per page
  
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

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchTerm, temperatureFilter, sortBy]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/leads');
      
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        
        // Calculate stats with proper value handling
        const leadStats = {
          total: data.leads?.length || 0,
          hot: data.leads?.filter(l => l.temperature === 'hot').length || 0,
          warm: data.leads?.filter(l => l.temperature === 'warm').length || 0,
          cold: data.leads?.filter(l => l.temperature === 'cold').length || 0,
          totalValue: data.leads?.reduce((sum, lead) => {
            // Parse the value properly - handle various formats
            const value = parseFloat(lead.potential_value) || 0;
            return sum + value;
          }, 0) || 0,
          avgScore: data.leads?.length > 0 
            ? Math.round(data.leads.reduce((sum, l) => sum + (l.score || 0), 0) / data.leads.length)
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

  const deleteLead = async (leadId) => {
    try {
      setDeletingLeadId(leadId);
      
      const response = await fetch(`/api/customer/leads/${leadId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove the lead from the list
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
        setDeleteConfirmId(null);
        
        // Show success message (you could use a toast here)
        console.log('Lead deleted successfully');
      } else {
        console.error('Failed to delete lead');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setDeletingLeadId(null);
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

  // Pagination logic
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
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
    ].join('\n');

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

  // Format currency properly
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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
            <button 
              onClick={fetchLeads}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Hot Leads</p>
                <p className="text-2xl font-bold text-red-400">{stats.hot}</p>
              </div>
              <Flame className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Warm Leads</p>
                <p className="text-2xl font-bold text-orange-400">{stats.warm}</p>
              </div>
              <Thermometer className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cold Leads</p>
                <p className="text-2xl font-bold text-blue-400">{stats.cold}</p>
              </div>
              <Snowflake className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Score</p>
                <p className="text-2xl font-bold text-green-400">{stats.avgScore}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-xl font-bold text-purple-400 truncate">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 text-white placeholder:text-gray-400 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Temperature Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setTemperatureFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  temperatureFilter === 'all' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTemperatureFilter('hot')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  temperatureFilter === 'hot' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Flame className="w-4 h-4" />
                Hot
              </button>
              <button
                onClick={() => setTemperatureFilter('warm')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  temperatureFilter === 'warm' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Thermometer className="w-4 h-4" />
                Warm
              </button>
              <button
                onClick={() => setTemperatureFilter('cold')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  temperatureFilter === 'cold' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Snowflake className="w-4 h-4" />
                Cold
              </button>
            </div>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:border-purple-500 [&>option]:bg-gray-800 [&>option]:text-white"
              style={{ colorScheme: 'dark' }}
            >
              <option value="recent" className="bg-gray-800 text-white">Sort by Recent</option>
              <option value="score" className="bg-gray-800 text-white">Sort by Score</option>
              <option value="value" className="bg-gray-800 text-white">Sort by Value</option>
            </select>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl overflow-hidden">
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
                {currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-400">
                      {searchTerm || temperatureFilter !== 'all' 
                        ? 'No leads found matching your filters'
                        : 'No leads yet. They will appear here as your AI interacts with customers.'}
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
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
                        <span className="px-2 py-1 bg-white/10 text-gray-300 border border-white/20 rounded text-sm">
                          {lead.primary_channel}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-green-400 font-medium">{formatCurrency(lead.potential_value)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/leads/${lead.id}`)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm flex items-center gap-1"
                          >
                            View
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          
                          {deleteConfirmId === lead.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteLead(lead.id)}
                                disabled={deletingLeadId === lead.id}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs disabled:opacity-50"
                              >
                                {deletingLeadId === lead.id ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(lead.id)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredLeads.length > leadsPerPage && (
            <div className="px-6 py-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {indexOfFirstLead + 1} to {Math.min(indexOfLastLead, filteredLeads.length)} of {filteredLeads.length} leads
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = index + 1;
                      } else if (currentPage <= 3) {
                        pageNum = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + index;
                      } else {
                        pageNum = currentPage - 2 + index;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2 text-gray-500">...</span>
                        <button
                          onClick={() => goToPage(totalPages)}
                          className="px-3 py-1 bg-white/10 text-gray-300 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
