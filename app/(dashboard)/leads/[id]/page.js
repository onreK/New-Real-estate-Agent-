'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Phone, 
  Mail, 
  MessageCircle,
  Calendar,
  Clock,
  Activity,
  User,
  Building,
  MapPin,
  Tag,
  FileText,
  Send,
  Plus,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Star,
  Zap,
  Trash2
} from 'lucide-react';

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLeadDetails();
  }, [params.id]);

  const loadLeadDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch lead details
      const response = await fetch(`/api/customer/leads/${params.id}`);
      if (!response.ok) throw new Error('Failed to load lead details');
      
      const data = await response.json();
      setLead(data.lead);
      setNotes(data.lead.notes || '');
      
    } catch (err) {
      console.error('Error loading lead:', err);
      setError('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/customer/leads/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) throw new Error('Failed to save notes');
      
      setIsEditingNotes(false);
      // Reload lead to get updated data
      await loadLeadDetails();
      
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/customer/leads/${params.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Redirect to leads page after successful deletion
        router.push('/leads');
      } else {
        throw new Error('Failed to delete lead');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError('Failed to delete lead');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const sendQuickMessage = async (type) => {
    // This would open a modal or redirect to send email/SMS
    if (type === 'email' && lead?.email) {
      window.location.href = `mailto:${lead.email}`;
    } else if (type === 'sms' && lead?.phone) {
      window.location.href = `sms:${lead.phone}`;
    }
  };

  // Temperature badge component
  const TemperatureBadge = ({ temperature, score }) => {
    const config = {
      HOT: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🔥' },
      WARM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '🌡️' },
      COLD: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '❄️' }
    };
    
    const style = config[temperature] || config.COLD;
    
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${style.bg}`}>
        <span className="text-lg">{style.icon}</span>
        <span className={`font-medium ${style.text}`}>{temperature}</span>
        <span className={`text-sm ${style.text}`}>({score}/100)</span>
      </div>
    );
  };

  // Event timeline item
  const TimelineEvent = ({ event }) => {
    const getEventIcon = (type) => {
      switch(type) {
        case 'message_received': return <MessageCircle className="w-4 h-4" />;
        case 'ai_response': return <Zap className="w-4 h-4" />;
        case 'hot_lead': return <Star className="w-4 h-4" />;
        case 'appointment_scheduled': return <Calendar className="w-4 h-4" />;
        case 'phone_request': return <Phone className="w-4 h-4" />;
        default: return <Activity className="w-4 h-4" />;
      }
    };

    const getEventColor = (type) => {
      switch(type) {
        case 'hot_lead': return 'bg-red-500';
        case 'appointment_scheduled': return 'bg-green-500';
        case 'phone_request': return 'bg-orange-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${getEventColor(event.event_type)} text-white`}>
          {getEventIcon(event.event_type)}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">
            {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
          <p className="text-gray-400 text-sm">{event.channel} • {new Date(event.created_at).toLocaleString()}</p>
          {(event.user_message || event.metadata?.message) && (
            <p className="text-gray-300 text-sm mt-1 bg-white/5 p-2 rounded">
              "{(event.user_message || event.metadata?.message).substring(0, 100)}..."
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">Error loading lead</p>
                <p className="text-gray-300 text-sm">{error || 'Lead not found'}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/leads')}
              className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Back to Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/20 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Lead?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{lead.name || 'this lead'}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteLead}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Lead'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/leads')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {lead.name || 'Unknown Lead'}
                </h1>
                <p className="text-sm text-gray-400">
                  Lead ID: {lead.id} • Last seen: {new Date(lead.last_interaction).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <TemperatureBadge temperature={lead.temperature} score={lead.score} />
              
              {/* Quick Actions */}
              {lead.email && (
                <button
                  onClick={() => sendQuickMessage('email')}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Send Email"
                >
                  <Mail className="w-5 h-5" />
                </button>
              )}
              {lead.phone && (
                <button
                  onClick={() => sendQuickMessage('sms')}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Send SMS"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              )}
              {lead.phone && (
                <button
                  onClick={() => window.location.href = `tel:${lead.phone}`}
                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  title="Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              )}
              
              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Delete Lead"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-6">
              {['overview', 'timeline', 'notes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-white">{lead.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  {lead.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-white">{lead.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-white">{lead.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.company && (
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Company</p>
                        <p className="text-white">{lead.company}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Location</p>
                        <p className="text-white">{lead.location}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs text-gray-400 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Lead Score Breakdown */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Lead Score Breakdown</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Engagement</span>
                      <span className="text-sm text-white">{lead.score_breakdown?.engagement || 0}/40</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${(lead.score_breakdown?.engagement || 0) * 2.5}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Recency</span>
                      <span className="text-sm text-white">{lead.score_breakdown?.recency || 0}/20</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${(lead.score_breakdown?.recency || 0) * 5}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Contact Info</span>
                      <span className="text-sm text-white">{lead.score_breakdown?.contact || 0}/20</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                        style={{ width: `${(lead.score_breakdown?.contact || 0) * 5}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Frequency</span>
                      <span className="text-sm text-white">{lead.score_breakdown?.frequency || 0}/20</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        style={{ width: `${(lead.score_breakdown?.frequency || 0) * 5}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Total Score</span>
                    <span className="text-xl font-bold text-white">{lead.score}/100</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Activity and Stats */}
            <div className="lg:col-span-2">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-gray-400">Messages</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{lead.total_interactions || 0}</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-gray-400">Avg Response</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{lead.avg_response_time || '< 1'}m</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-gray-400">Value</span>
                  </div>
                  <p className="text-2xl font-bold text-white">${lead.value || 0}</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-5 h-5 text-orange-400" />
                    <span className="text-xs text-gray-400">First Contact</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {new Date(lead.first_interaction_at || lead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Recent Activity */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                
                {lead.recent_events && lead.recent_events.length > 0 ? (
                  <div className="space-y-4">
                    {lead.recent_events.slice(0, 5).map((event, index) => (
                      <TimelineEvent key={index} event={event} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No recent activity tracked yet</p>
                )}
                
                {lead.recent_events && lead.recent_events.length > 5 && (
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    View all activity →
                  </button>
                )}
              </div>
              
              {/* Last Message */}
              {lead.last_message && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Last Message</h3>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-300">{lead.last_message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      via {lead.primary_channel} • {new Date(lead.last_interaction).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Complete Interaction Timeline</h3>
            
            {lead.all_events && lead.all_events.length > 0 ? (
              <div className="space-y-4">
                {lead.all_events.map((event, index) => (
                  <TimelineEvent key={index} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No interaction history tracked yet. Events will appear here as your AI interacts with this lead.</p>
            )}
          </div>
        )}
        
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Lead Notes</h3>
              {!isEditingNotes ? (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Notes</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotes(lead.notes || '');
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
            
            {isEditingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-64 bg-white/5 border border-white/20 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="Add notes about this lead..."
              />
            ) : (
              <div className="bg-white/5 rounded-lg p-4 min-h-[16rem]">
                {notes ? (
                  <p className="text-gray-300 whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-gray-500 italic">No notes added yet. Click Edit Notes to add information about this lead.</p>
                )}
              </div>
            )}
            
            {/* Note History */}
            {lead.note_history && lead.note_history.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Note History</h4>
                <div className="space-y-2">
                  {lead.note_history.map((entry, index) => (
                    <div key={index} className="text-xs text-gray-500">
                      <span>{new Date(entry.updated_at).toLocaleString()}</span>
                      <span className="ml-2">by {entry.updated_by}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
