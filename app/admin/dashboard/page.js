'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, Zap, TrendingUp, Mail, Bot,
  CheckCircle, Clock, AlertCircle, ExternalLink
} from 'lucide-react';

const PLAN_COLORS = {
  starter: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  professional: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  enterprise: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const PLAN_PRICE = { starter: 49, professional: 149, enterprise: 499 };

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push('/sign-in'); return; }
    loadData();
  }, [isLoaded, user]);

  async function loadData() {
    setLoading(true);
    try {
      const [customersRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/customers'),
        fetch('/api/admin/analytics')
      ]);

      if (customersRes.status === 403 || analyticsRes.status === 403) {
        setAccessDenied(true);
        return;
      }

      const customersData = await customersRes.json();
      const analyticsData = await analyticsRes.json();

      if (customersData.success) setCustomers(customersData.customers);
      if (analyticsData.success) setAnalytics(analyticsData.analytics);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm">Your account is not authorized to view this page.</p>
          <p className="text-gray-500 text-xs mt-2">Set ADMIN_CLERK_ID_1 in Railway to your Clerk user ID.</p>
        </div>
      </div>
    );
  }

  const mrr = customers.reduce((sum, c) => sum + (PLAN_PRICE[c.plan] || 0), 0);
  const planCounts = customers.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">BizzyBot Admin</h1>
          <p className="text-gray-500 text-xs mt-0.5">Founder dashboard — visible only to you</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/migrate" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            DB Tools <ExternalLink className="w-3 h-3" />
          </a>
          <a href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            Customer View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total Customers"
            value={customers.length}
            sub={`${planCounts.starter || 0} Starter · ${planCounts.professional || 0} Pro · ${planCounts.enterprise || 0} Enterprise`}
          />
          <StatCard
            icon={DollarSign}
            label="MRR"
            value={`$${mrr.toLocaleString()}`}
            sub={`$${(mrr * 12).toLocaleString()} projected ARR`}
          />
          <StatCard
            icon={Zap}
            label="AI Interactions"
            value={analytics?.executive_summary?.totalAIInteractions?.toLocaleString() ?? '—'}
            sub="All time across all channels"
          />
          <StatCard
            icon={TrendingUp}
            label="Active Customers"
            value={analytics?.executive_summary?.activeCustomers ?? '—'}
            sub="Used AI this month"
          />
        </div>

        {/* Plan Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['starter', 'professional', 'enterprise'].map(plan => (
            <div key={plan} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded border capitalize ${PLAN_COLORS[plan]}`}>
                  {plan}
                </span>
                <span className="text-gray-500 text-xs">${PLAN_PRICE[plan]}/mo</span>
              </div>
              <div className="text-3xl font-bold text-white">{planCounts[plan] || 0}</div>
              <div className="text-xs text-gray-500 mt-1">
                ${((planCounts[plan] || 0) * PLAN_PRICE[plan]).toLocaleString()} MRR
              </div>
            </div>
          ))}
        </div>

        {/* Customer Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">All Customers</h2>
            <span className="text-xs text-gray-500">{customers.length} total</span>
          </div>

          {customers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">No customers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-6 py-3 font-medium">Business</th>
                    <th className="text-left px-6 py-3 font-medium">Email</th>
                    <th className="text-left px-6 py-3 font-medium">Plan</th>
                    <th className="text-left px-6 py-3 font-medium">AI Interactions</th>
                    <th className="text-left px-6 py-3 font-medium">Setup</th>
                    <th className="text-left px-6 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {customers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {customer.business_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{customer.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded border capitalize ${PLAN_COLORS[customer.plan] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                          {customer.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {parseInt(customer.ai_interactions || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span title="AI configured">
                            {customer.has_ai_config
                              ? <Bot className="w-4 h-4 text-blue-400" />
                              : <Bot className="w-4 h-4 text-gray-600" />}
                          </span>
                          <span title="Gmail connected">
                            {customer.has_gmail
                              ? <Mail className="w-4 h-4 text-green-400" />
                              : <Mail className="w-4 h-4 text-gray-600" />}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
