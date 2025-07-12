// lib/instagram-config.js
// Separate Instagram configuration logic from API routes

// In-memory storage for Instagram configurations (replace with database in production)
const instagramConfigs = new Map();

export function setInstagramConfig(userId, config) {
  instagramConfigs.set(userId, config);
}

export function getInstagramConfig(userId) {
  return instagramConfigs.get(userId);
}

export function getInstagramConfigByPageId(pageId) {
  for (const config of instagramConfigs.values()) {
    if (config.pageId === pageId) {
      return config;
    }
  }
  return null;
}

export function getAllInstagramConfigs() {
  return Array.from(instagramConfigs.entries());
}

export function deleteInstagramConfig(userId) {
  return instagramConfigs.delete(userId);
}

// Mock function to get today's conversations count
export function getConversationsToday(userId) {
  // In production, this would query your database for Instagram conversations from today
  return 0;
}

// Mock function to calculate response rate
export function calculateResponseRate(userId) {
  // In production, this would calculate the actual AI response rate
  return 0;
}
