import { useUser } from '@clerk/nextjs';
import { PLAN_LIMITS } from '../lib/stripe';

export function useSubscription() {
  const { user, isLoaded } = useUser();

  const subscriptionData = {
    plan: user?.publicMetadata?.subscriptionPlan || null,
    status: user?.publicMetadata?.subscriptionStatus || null,
    customerId: user?.publicMetadata?.stripeCustomerId || null,
    subscriptionId: user?.publicMetadata?.stripeSubscriptionId || null,
    planStartDate: user?.publicMetadata?.planStartDate || null,
    canceledAt: user?.publicMetadata?.canceledAt || null,
    lastPaymentFailed: user?.publicMetadata?.lastPaymentFailed || null,
  };

  // Check if user has an active subscription
  const isSubscribed = subscriptionData.status === 'active';

  // Check if user has access to specific features
  const hasFeature = (feature) => {
    if (!isSubscribed || !subscriptionData.plan) return false;
    
    const planLimits = PLAN_LIMITS[subscriptionData.plan];
    return planLimits?.features?.includes(feature) || false;
  };

  // Check if user can access a specific plan level
  const hasAccessTo = (requiredPlan) => {
    if (!isSubscribed || !subscriptionData.plan) return false;
    
    const planHierarchy = ['starter', 'professional', 'enterprise'];
    const userPlanIndex = planHierarchy.indexOf(subscriptionData.plan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    
    return userPlanIndex >= requiredPlanIndex;
  };

  // Get usage limits for current plan
  const getLimits = () => {
    if (!subscriptionData.plan) return null;
    return PLAN_LIMITS[subscriptionData.plan];
  };

  // Check if user is on trial (assuming 14 days)
  const isOnTrial = () => {
    if (!subscriptionData.planStartDate) return false;
    
    const startDate = new Date(subscriptionData.planStartDate);
    const now = new Date();
    const daysSinceStart = (now - startDate) / (1000 * 60 * 60 * 24);
    
    return daysSinceStart <= 14 && subscriptionData.status === 'active';
  };

  // Get trial days remaining
  const getTrialDaysRemaining = () => {
    if (!isOnTrial()) return 0;
    
    const startDate = new Date(subscriptionData.planStartDate);
    const now = new Date();
    const daysSinceStart = (now - startDate) / (1000 * 60 * 60 * 24);
    
    return Math.max(0, Math.ceil(14 - daysSinceStart));
  };

  // Get plan display info
  const getPlanInfo = () => {
    const planInfo = {
      starter: {
        name: 'Starter',
        color: 'blue',
        description: 'Perfect for small businesses'
      },
      professional: {
        name: 'Professional',
        color: 'purple',
        description: 'Best for growing companies'
      },
      enterprise: {
        name: 'Enterprise', 
        color: 'amber',
        description: 'Built for enterprise scale'
      }
    };

    return subscriptionData.plan ? planInfo[subscriptionData.plan] : null;
  };

  // Check if subscription has issues
  const hasSubscriptionIssue = () => {
    return ['past_due', 'unpaid', 'canceled'].includes(subscriptionData.status);
  };

  // Get subscription issue message
  const getSubscriptionIssueMessage = () => {
    switch (subscriptionData.status) {
      case 'past_due':
        return 'Your payment is past due. Please update your payment method.';
      case 'unpaid':
        return 'Your subscription is unpaid. Please update your payment method.';
      case 'canceled':
        return 'Your subscription has been canceled.';
      default:
        return null;
    }
  };

  return {
    // Basic subscription info
    isLoaded,
    isSubscribed,
    subscription: subscriptionData,
    
    // Plan information
    plan: subscriptionData.plan,
    planInfo: getPlanInfo(),
    
    // Feature access
    hasFeature,
    hasAccessTo,
    
    // Limits and usage
    limits: getLimits(),
    
    // Trial information
    isOnTrial: isOnTrial(),
    trialDaysRemaining: getTrialDaysRemaining(),
    
    // Issues and warnings
    hasIssue: hasSubscriptionIssue(),
    issueMessage: getSubscriptionIssueMessage(),
    
    // Status helpers
    isActive: subscriptionData.status === 'active',
    isPastDue: subscriptionData.status === 'past_due',
    isCanceled: subscriptionData.status === 'canceled',
  };
}
