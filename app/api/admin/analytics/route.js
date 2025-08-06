// app/api/admin/analytics/route.js
// Admin analytics API - Business intelligence for company sale
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

// Define admin user IDs (update these with your actual admin Clerk IDs)
const ADMIN_USER_IDS = [
  process.env.ADMIN_CLERK_ID_1,
  process.env.ADMIN_CLERK_ID_2,
  // Add your admin Clerk user IDs here
].filter(Boolean);

export async function GET(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check admin access (you can also check by email)
    const isAdmin = ADMIN_USER_IDS.includes(user.id) || 
                   user.emailAddresses?.[0]?.emailAddress?.includes('@bizzybotai.com');
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    console.log('📊 Fetching admin analytics for:', user.emailAddresses?.[0]?.emailAddress);
    
    // Get time period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const dateRange = getDateRange(period);
    
    // 🏢 Get business metrics
    const businessMetrics = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN c.created_at >= $1 THEN c.id END) as new_customers,
        COUNT(DISTINCT CASE WHEN e.ai_responses_sent > 0 THEN c.id END) as active_customers,
        SUM(CASE 
          WHEN c.plan = 'starter' THEN 97
          WHEN c.plan = 'professional' THEN 197
          WHEN c.plan = 'enterprise' THEN 497
          ELSE 0 
        END) as monthly_recurring_revenue
      FROM customers c
      LEFT JOIN customer_analytics_summary e ON e.customer_id = c.id 
        AND e.month = DATE_TRUNC('month', CURRENT_DATE)
      WHERE c.created_at <= $2
    `, [dateRange.start, dateRange.end]);
    
    // 📈 Get growth metrics
    const growthMetrics = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_customers,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_customers
      FROM customers
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `, [dateRange.start, dateRange.end]);
    
    // 🤖 Get AI usage statistics
    const aiUsageStats = await query(`
      SELECT 
        COUNT(*) as total_ai_interactions,
        COUNT(DISTINCT customer_id) as customers_using_ai,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        AVG(confidence_score) as avg_confidence,
        COUNT(DISTINCT channel) as channels_used
      FROM ai_analytics_events
      WHERE created_at >= $1 AND created_at <= $2
    `, [dateRange.start, dateRange.end]);
    
    // 🎯 Get behavior adoption rates (real usage data)
    const behaviorAdoption = await query(`
      SELECT 
        event_type,
        COUNT(DISTINCT customer_id) as customers_using,
        COUNT(*) as total_occurrences,
        AVG(confidence_score) as avg_confidence
      FROM ai_analytics_events
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY event_type
      ORDER BY customers_using DESC
    `, [dateRange.start, dateRange.end]);
    
    // 💰 Revenue analysis
    const revenueAnalysis = await query(`
      SELECT 
        c.plan,
        COUNT(*) as customer_count,
        COUNT(*) * CASE 
          WHEN c.plan = 'starter' THEN 97
          WHEN c.plan = 'professional' THEN 197
          WHEN c.plan = 'enterprise' THEN 497
          ELSE 0 
        END as total_revenue
      FROM customers c
      WHERE c.created_at <= $2
      GROUP BY c.plan
    `, [dateRange.end]);
    
    // 🔥 Hot lead performance
    const hotLeadPerformance = await query(`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as hot_leads_detected,
        AVG(confidence_score) as avg_score,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM ai_analytics_events
      WHERE event_type = 'hot_lead_detected'
        AND created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week DESC
      LIMIT 8
    `, [dateRange.start, dateRange.end]);
    
    // 📊 Customer retention and engagement
    const retentionMetrics = await query(`
      SELECT 
        DATE_TRUNC('month', c.created_at) as cohort_month,
        COUNT(DISTINCT c.id) as cohort_size,
        COUNT(DISTINCT CASE 
          WHEN e.ai_responses_sent > 0 THEN c.id 
        END) as active_in_period,
        ROUND(
          100.0 * COUNT(DISTINCT CASE WHEN e.ai_responses_sent > 0 THEN c.id END) / 
          NULLIF(COUNT(DISTINCT c.id), 0), 
          2
        ) as retention_rate
      FROM customers c
      LEFT JOIN customer_analytics_summary e ON e.customer_id = c.id
        AND e.month = DATE_TRUNC('month', CURRENT_DATE)
      WHERE c.created_at >= $1 AND c.created_at <= $2
      GROUP BY DATE_TRUNC('month', c.created_at)
      ORDER BY cohort_month DESC
    `, [dateRange.start, dateRange.end]);
    
    // 🏆 Top performing customers
    const topCustomers = await query(`
      SELECT 
        c.business_name,
        c.plan,
        e.ai_responses_sent,
        e.hot_leads_detected_count,
        e.phone_requests_count,
        e.business_value_generated
      FROM customers c
      JOIN customer_analytics_summary e ON e.customer_id = c.id
      WHERE e.month = DATE_TRUNC('month', CURRENT_DATE)
        AND e.ai_responses_sent > 0
      ORDER BY e.ai_responses_sent DESC
      LIMIT 10
    `);
    
    // Calculate key business metrics
    const totalCustomers = parseInt(businessMetrics.rows[0]?.total_customers || 0);
    const activeCustomers = parseInt(businessMetrics.rows[0]?.active_customers || 0);
    const mrr = parseFloat(businessMetrics.rows[0]?.monthly_recurring_revenue || 0);
    const totalAIInteractions = parseInt(aiUsageStats.rows[0]?.total_ai_interactions || 0);
    
    // Calculate adoption rates
    const adoptionRates = {};
    behaviorAdoption.rows.forEach(behavior => {
      const rate = (parseInt(behavior.customers_using) / totalCustomers * 100).toFixed(1);
      adoptionRates[behavior.event_type] = {
        percentage: parseFloat(rate),
        customerCount: parseInt(behavior.customers_using),
        totalOccurrences: parseInt(behavior.total_occurrences)
      };
    });
    
    // Format response for investor presentation
    const analytics = {
      executive_summary: {
        totalCustomers: totalCustomers,
        activeCustomers: activeCustomers,
        monthlyRecurringRevenue: mrr,
        averageRevenuePerUser: totalCustomers > 0 ? (mrr / totalCustomers).toFixed(2) : 0,
        totalAIInteractions: totalAIInteractions,
        aiInteractionsPerCustomer: activeCustomers > 0 ? 
          Math.round(totalAIInteractions / activeCustomers) : 0,
        customerRetentionRate: calculateRetentionRate(retentionMetrics.rows),
        growthRate: calculateGrowthRate(growthMetrics.rows)
      },
      
      behavior_intelligence: {
        phoneRequestAdoption: {
          percentage: adoptionRates.phone_requested?.percentage || 0,
          customersUsing: adoptionRates.phone_requested?.customerCount || 0,
          totalRequests: adoptionRates.phone_requested?.totalOccurrences || 0,
          insight: `${adoptionRates.phone_requested?.percentage || 0}% of customers' AIs actively request phone numbers`
        },
        schedulingAdoption: {
          percentage: adoptionRates.appointment_offered?.percentage || 0,
          customersUsing: adoptionRates.appointment_offered?.customerCount || 0,
          totalOffers: adoptionRates.appointment_offered?.totalOccurrences || 0,
          insight: `${adoptionRates.appointment_offered?.percentage || 0}% of customers' AIs offer appointment scheduling`
        },
        hotLeadDetection: {
          percentage: adoptionRates.hot_lead_detected?.percentage || 0,
          customersUsing: adoptionRates.hot_lead_detected?.customerCount || 0,
          totalDetected: adoptionRates.hot_lead_detected?.totalOccurrences || 0,
          weeklyTrend: hotLeadPerformance.rows.map(week => ({
            week: week.week,
            count: parseInt(week.hot_leads_detected),
            avgScore: parseFloat(week.avg_score).toFixed(2)
          }))
        }
      },
      
      revenue_metrics: {
        monthlyRecurringRevenue: mrr,
        revenueByPlan: revenueAnalysis.rows.map(plan => ({
          plan: plan.plan || 'free',
          customers: parseInt(plan.customer_count),
          revenue: parseFloat(plan.total_revenue)
        })),
        projectedAnnualRevenue: mrr * 12,
        averageContractValue: totalCustomers > 0 ? (mrr / totalCustomers).toFixed(2) : 0,
        lifetimeValue: totalCustomers > 0 ? ((mrr / totalCustomers) * 24).toFixed(2) : 0 // Assuming 24-month average lifetime
      },
      
      growth_metrics: {
        monthlyGrowth: growthMetrics.rows.map(month => ({
          month: month.month,
          newCustomers: parseInt(month.new_customers),
          totalCustomers: parseInt(month.cumulative_customers)
        })),
        currentMonthNewCustomers: parseInt(businessMetrics.rows[0]?.new_customers || 0),
        growthRate: calculateGrowthRate(growthMetrics.rows),
        projectedCustomersIn12Months: projectGrowth(totalCustomers, growthMetrics.rows)
      },
      
      engagement_metrics: {
        dailyActiveRate: aiUsageStats.rows[0]?.days_active ? 
          ((parseInt(aiUsageStats.rows[0].days_active) / 30) * 100).toFixed(1) : 0,
        averageConfidenceScore: parseFloat(aiUsageStats.rows[0]?.avg_confidence || 0).toFixed(2),
        channelsInUse: parseInt(aiUsageStats.rows[0]?.channels_used || 0),
        topPerformingCustomers: topCustomers.rows.map(customer => ({
          businessName: customer.business_name,
          plan: customer.plan,
          aiResponses: parseInt(customer.ai_responses_sent || 0),
          hotLeads: parseInt(customer.hot_leads_detected_count || 0),
          phoneRequests: parseInt(customer.phone_requests_count || 0),
          valueGenerated: parseFloat(customer.business_value_generated || 0)
        }))
      },
      
      retention_cohorts: retentionMetrics.rows.map(cohort => ({
        cohort: cohort.cohort_month,
        size: parseInt(cohort.cohort_size),
        activeCustomers: parseInt(cohort.active_in_period),
        retentionRate: parseFloat(cohort.retention_rate)
      })),
      
      investment_highlights: generateInvestmentHighlights(
        totalCustomers,
        mrr,
        totalAIInteractions,
        adoptionRates,
        growthMetrics.rows
      )
    };
    
    return NextResponse.json({
      success: true,
      period: period,
      dateRange: dateRange,
      analytics: analytics
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch admin analytics',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Calculate retention rate from cohort data
 */
function calculateRetentionRate(cohorts) {
  if (cohorts.length === 0) return 0;
  
  const totalRetention = cohorts.reduce((sum, cohort) => 
    sum + parseFloat(cohort.retention_rate || 0), 0
  );
  
  return (totalRetention / cohorts.length).toFixed(1);
}

/**
 * Calculate growth rate
 */
function calculateGrowthRate(growthData) {
  if (growthData.length < 2) return 0;
  
  const currentMonth = parseInt(growthData[0]?.new_customers || 0);
  const previousMonth = parseInt(growthData[1]?.new_customers || 0);
  
  if (previousMonth === 0) return 100;
  
  const growthRate = ((currentMonth - previousMonth) / previousMonth * 100).toFixed(1);
  return parseFloat(growthRate);
}

/**
 * Project future growth
 */
function projectGrowth(currentCustomers, growthData) {
  const avgMonthlyGrowth = growthData.slice(0, 3).reduce((sum, month) => 
    sum + parseInt(month.new_customers || 0), 0
  ) / Math.min(3, growthData.length);
  
  return Math.round(currentCustomers + (avgMonthlyGrowth * 12));
}

/**
 * Generate investment highlights
 */
function generateInvestmentHighlights(customers, mrr, interactions, adoption, growth) {
  const highlights = [];
  
  // Revenue highlights
  if (mrr > 100000) {
    highlights.push({
      type: 'revenue',
      title: 'Strong Revenue Growth',
      value: `$${mrr.toLocaleString()} MRR`,
      detail: 'Approaching seven-figure annual run rate'
    });
  } else if (mrr > 50000) {
    highlights.push({
      type: 'revenue',
      title: 'Solid Revenue Foundation',
      value: `$${mrr.toLocaleString()} MRR`,
      detail: `$${(mrr * 12).toLocaleString()} annual run rate`
    });
  }
  
  // Usage highlights
  if (interactions > 1000000) {
    highlights.push({
      type: 'usage',
      title: 'Massive Platform Usage',
      value: `${(interactions / 1000000).toFixed(1)}M AI interactions`,
      detail: 'High customer engagement and platform stickiness'
    });
  } else if (interactions > 100000) {
    highlights.push({
      type: 'usage',
      title: 'Strong Platform Adoption',
      value: `${(interactions / 1000).toFixed(0)}K AI interactions`,
      detail: 'Active daily usage across customer base'
    });
  }
  
  // Adoption highlights
  if (adoption.phone_requested?.percentage > 70) {
    highlights.push({
      type: 'behavior',
      title: 'Lead Capture Excellence',
      value: `${adoption.phone_requested.percentage}% phone capture rate`,
      detail: 'Majority of customers actively capturing phone leads'
    });
  }
  
  // Growth highlights
  const recentGrowth = calculateGrowthRate(growth);
  if (recentGrowth > 20) {
    highlights.push({
      type: 'growth',
      title: 'Rapid Growth Trajectory',
      value: `${recentGrowth}% monthly growth`,
      detail: 'Exponential customer acquisition momentum'
    });
  }
  
  // Customer value
  if (customers > 0) {
    const arpu = mrr / customers;
    if (arpu > 150) {
      highlights.push({
        type: 'unit_economics',
        title: 'Premium ARPU',
        value: `$${arpu.toFixed(0)} per customer`,
        detail: 'High-value customer base with strong unit economics'
      });
    }
  }
  
  // Market opportunity
  highlights.push({
    type: 'market',
    title: 'Massive TAM',
    value: '30M+ small businesses',
    detail: 'AI automation for the $5T small business market'
  });
  
  return highlights;
}

/**
 * Get date range based on period
 */
function getDateRange(period) {
  const end = new Date();
  let start = new Date();
  
  switch(period) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'all':
      start = new Date('2024-01-01');
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
