const Job = require('../models/Job');

class RateLimiter {
  static async checkMonthlyLimit(userId, limit = 50) {
    try {
      // Get current month start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Count successful jobs for this user in current month
      const jobCount = await Job.countDocuments({
        userId,
        status: 'ready',
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd
        }
      });
      
      return {
        isLimitReached: jobCount >= limit,
        currentCount: jobCount,
        limit,
        resetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request if we can't check (fail open)
      return {
        isLimitReached: false,
        currentCount: 0,
        limit,
        resetsAt: new Date()
      };
    }
  }

  static getLimitMessage(language = 'en') {
    if (language === 'ar') {
      return 'لقد وصلت إلى الحد الشهري (50). سيتم إعادة تعيينه الشهر القادم.';
    }
    return 'You reached this month\'s limit (50). It resets next month.';
  }
}

module.exports = RateLimiter;
