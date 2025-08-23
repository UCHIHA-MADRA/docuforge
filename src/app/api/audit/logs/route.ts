import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { auditLogger, AuditEventType, RiskLevel } from '@/lib/audit-logger';
import { auditHooks } from '@/middleware/audit';

// GET /api/audit/logs - Query audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      await auditHooks.logUnauthorizedAccess(
        request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        '/api/audit/logs'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin privileges (you may need to adjust this based on your user model)
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      await auditHooks.logUnauthorizedAccess(
        request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        '/api/audit/logs'
      );
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      userId: searchParams.get('userId') || undefined,
      eventType: searchParams.get('eventType') as AuditEventType || undefined,
      riskLevel: searchParams.get('riskLevel') as RiskLevel || undefined,
      resourceId: searchParams.get('resourceId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };
    
    // Validate limit and offset
    if (filters.limit > 1000) filters.limit = 1000;
    if (filters.limit < 1) filters.limit = 50;
    if (filters.offset < 0) filters.offset = 0;
    
    // Query audit logs
    const logs = await auditLogger.queryLogs(filters);
    
    // Log the audit query itself
    await auditLogger.log({
      eventType: AuditEventType.SYSTEM_ERROR, // You might want to create AUDIT_QUERY event type
      userId: session.user.id,
      userEmail: session.user.email,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      action: 'Queried audit logs',
      details: {
        filters,
        resultCount: logs.length,
        type: 'audit_query'
      },
      riskLevel: RiskLevel.LOW,
      success: true
    });
    
    return NextResponse.json({
      logs,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: logs.length === filters.limit
      }
    });
    
  } catch (error) {
    console.error('Error querying audit logs:', error);
    
    // Log the error
    try {
      const session = await getServerSession(authOptions);
      await auditLogger.log({
        eventType: AuditEventType.SYSTEM_ERROR,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        action: 'Failed to query audit logs',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'audit_query_error'
        },
        riskLevel: RiskLevel.HIGH,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (logError) {
      console.error('Failed to log audit query error:', logError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/audit/logs - Create audit log entry (for testing or manual logging)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    const {
      eventType,
      action,
      details = {},
      riskLevel = RiskLevel.LOW,
      resourceId,
      resourceType
    } = body;
    
    // Validate required fields
    if (!eventType || !action) {
      return NextResponse.json(
        { error: 'eventType and action are required' },
        { status: 400 }
      );
    }
    
    // Create audit log entry
    await auditLogger.log({
      eventType,
      userId: session.user.id,
      userEmail: session.user.email,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      resourceId,
      resourceType,
      action,
      details: {
        ...details,
        manualEntry: true,
        createdBy: session.user.email
      },
      riskLevel,
      success: true
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}