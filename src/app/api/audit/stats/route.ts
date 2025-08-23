import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { auditLogger, AuditEventType, RiskLevel } from '@/lib/audit-logger';
import { auditHooks } from '@/middleware/audit';

// GET /api/audit/stats - Get audit statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      await auditHooks.logUnauthorizedAccess(
        request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        '/api/audit/stats'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin privileges
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      await auditHooks.logUnauthorizedAccess(
        request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        '/api/audit/stats'
      );
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as 'day' | 'week' | 'month') || 'day';
    
    // Validate timeframe
    if (!['day', 'week', 'month'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be day, week, or month' },
        { status: 400 }
      );
    }
    
    // Get audit statistics
    const stats = await auditLogger.getAuditStats(timeframe);
    
    // Get additional insights
    const insights = await getAuditInsights(timeframe);
    
    // Log the stats query
    await auditLogger.log({
      eventType: AuditEventType.SYSTEM_ERROR, // You might want to create AUDIT_STATS_QUERY event type
      userId: session.user.id,
      userEmail: session.user.email,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      action: `Queried audit statistics for ${timeframe}`,
      details: {
        timeframe,
        statsRequested: true,
        type: 'audit_stats_query'
      },
      riskLevel: RiskLevel.LOW,
      success: true
    });
    
    return NextResponse.json({
      stats,
      insights,
      timeframe
    });
    
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    
    // Log the error
    try {
      const session = await getServerSession(authOptions);
      await auditLogger.log({
        eventType: AuditEventType.SYSTEM_ERROR,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        action: 'Failed to get audit statistics',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'audit_stats_error'
        },
        riskLevel: RiskLevel.HIGH,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (logError) {
      console.error('Failed to log audit stats error:', logError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get additional audit insights
async function getAuditInsights(timeframe: 'day' | 'week' | 'month') {
  try {
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    // Get logs for analysis
    const logs = await auditLogger.queryLogs({
      startDate,
      endDate: now,
      limit: 10000 // Large limit for analysis
    });
    
    // Calculate insights
    const insights = {
      topUsers: getTopUsers(logs),
      topEventTypes: getTopEventTypes(logs),
      riskTrends: getRiskTrends(logs),
      failureRate: getFailureRate(logs),
      peakHours: getPeakHours(logs),
      securityAlerts: getSecurityAlerts(logs)
    };
    
    return insights;
  } catch (error) {
    console.error('Error calculating audit insights:', error);
    return {
      topUsers: [],
      topEventTypes: [],
      riskTrends: {},
      failureRate: 0,
      peakHours: [],
      securityAlerts: []
    };
  }
}

// Helper functions for insights
function getTopUsers(logs: any[]) {
  const userCounts = logs.reduce((acc, log) => {
    if (log.userEmail) {
      acc[log.userEmail] = (acc[log.userEmail] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }));
}

function getTopEventTypes(logs: any[]) {
  const eventCounts = logs.reduce((acc, log) => {
    acc[log.eventType] = (acc[log.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([eventType, count]) => ({ eventType, count }));
}

function getRiskTrends(logs: any[]) {
  const riskCounts = logs.reduce((acc, log) => {
    acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return riskCounts;
}

function getFailureRate(logs: any[]) {
  if (logs.length === 0) return 0;
  const failedLogs = logs.filter(log => !log.success);
  return (failedLogs.length / logs.length) * 100;
}

function getPeakHours(logs: any[]) {
  const hourCounts = logs.reduce((acc, log) => {
    const hour = new Date(log.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  return Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));
}

function getSecurityAlerts(logs: any[]) {
  const securityEvents = [
    AuditEventType.UNAUTHORIZED_ACCESS,
    AuditEventType.SUSPICIOUS_ACTIVITY,
    AuditEventType.DATA_BREACH_ATTEMPT,
    AuditEventType.LOGIN_FAILED
  ];
  
  return logs
    .filter(log => securityEvents.includes(log.eventType) || log.riskLevel === RiskLevel.CRITICAL)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map(log => ({
      id: log.id,
      eventType: log.eventType,
      action: log.action,
      riskLevel: log.riskLevel,
      timestamp: log.timestamp,
      userEmail: log.userEmail,
      ipAddress: log.ipAddress
    }));
}