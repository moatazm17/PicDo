const express = require('express');
const Job = require('../models/Job');

const router = express.Router();

// GET /history - Get user's job history
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const cursor = req.query.cursor;
    const type = req.query.type; // Optional filter: event, expense, contact, address

    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'userId query parameter or x-user-id header is required'
      });
    }

    // Build query
    const query = {
      userId,
      status: 'ready' // Only show completed jobs
    };

    if (type && ['event', 'expense', 'contact', 'address'].includes(type)) {
      query.type = type;
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Fetch jobs in reverse chronological order
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Fetch one extra to determine if there's a next page
      .select('jobId type summary fields thumb action isFavorite createdAt updatedAt')
      .lean();

    // Determine if there's a next page
    const hasNextPage = jobs.length > limit;
    const items = hasNextPage ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasNextPage ? items[items.length - 1].createdAt.toISOString() : null;

    // Format response
    const formattedItems = items.map(job => ({
      jobId: job.jobId,
      type: job.type,
      summary: job.summary,
      fields: job.fields,
      thumb: job.thumb,
      action: job.action,
      isFavorite: job.isFavorite || false,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));

    res.json({
      items: formattedItems,
      nextCursor
    });

  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to fetch history'
    });
  }
});

// GET /history/stats - Get user's usage stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'userId query parameter or x-user-id header is required'
      });
    }

    // Get current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [monthlyCount, totalCount, typeBreakdown] = await Promise.all([
      // Monthly count
      Job.countDocuments({
        userId,
        status: 'ready',
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }),
      
      // Total count
      Job.countDocuments({
        userId,
        status: 'ready'
      }),
      
      // Type breakdown
      Job.aggregate([
        { $match: { userId, status: 'ready' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const breakdown = {
      event: 0,
      expense: 0,
      contact: 0,
      address: 0
    };

    typeBreakdown.forEach(item => {
      if (item._id && breakdown.hasOwnProperty(item._id)) {
        breakdown[item._id] = item.count;
      }
    });

    res.json({
      monthlyCount,
      totalCount,
      monthlyLimit: parseInt(process.env.MONTHLY_LIMIT) || 50,
      breakdown,
      monthStart,
      monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to fetch stats'
    });
  }
});

module.exports = router;
