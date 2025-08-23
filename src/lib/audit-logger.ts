import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Audit event types
export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Document operations
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_VIEWED = 'DOCUMENT_VIEWED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  DOCUMENT_CONVERTED = 'DOCUMENT_CONVERTED',
  
  // PDF operations
  PDF_MERGED = 'PDF_MERGED',
  PDF_SPLIT = 'PDF_SPLIT',
  PDF_COMPRESSED = 'PDF_COMPRESSED',
  PDF_ANNOTATED = 'PDF_ANNOTATED',
  PDF_PAGES_REORDERED = 'PDF_PAGES_REORDERED',
  PDF_TEXT_EDITED = 'PDF_TEXT_EDITED',
  
  // OCR operations
  OCR_PERFORMED = 'OCR_PERFORMED',
  TEXT_EXTRACTED = 'TEXT_EXTRACTED',
  
  // Spreadsheet operations
  SPREADSHEET_CREATED = 'SPREADSHEET_CREATED',
  SPREADSHEET_EDITED = 'SPREADSHEET_EDITED',
  FORMULA_CALCULATED = 'FORMULA_CALCULATED',
  
  // Security events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  
  // System events
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  BACKUP_CREATED = 'BACKUP_CREATED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  
  // Theme and settings
  THEME_CHANGED = 'THEME_CHANGED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED'
}

// Risk levels for audit events
// RiskLevel as string literals for SQLite compatibility
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  details: Record<string, string | number | boolean | null | undefined>;
  riskLevel: RiskLevel;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

// Audit logger class
export class AuditLogger {
  private static instance: AuditLogger;
  private batchSize = 100;
  private batchTimeout = 5000; // 5 seconds
  private logQueue: AuditLogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;

  private constructor() {
    this.startBatchProcessor();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Main logging method
  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Add to queue for batch processing
    this.logQueue.push(logEntry);

    // Process immediately for critical events
    if (entry.riskLevel === 'CRITICAL') {
      await this.processBatch();
    }

    // Process batch if queue is full
    if (this.logQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  // Convenience methods for common events
  public async logUserLogin(userId: string, userEmail: string, ipAddress: string, userAgent: string, success: boolean): Promise<void> {
    await this.log({
      eventType: success ? AuditEventType.USER_LOGIN : AuditEventType.LOGIN_FAILED,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      action: success ? 'User logged in successfully' : 'User login failed',
      details: { loginAttempt: true },
      riskLevel: success ? 'LOW' : 'MEDIUM',
      success
    });
  }

  public async logDocumentOperation(
    eventType: AuditEventType,
    userId: string,
    documentId: string,
    action: string,
    details: Record<string, string | number | boolean | null | undefined> = {},
    success: boolean = true
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      resourceId: documentId,
      resourceType: 'document',
      action,
      details,
      riskLevel: 'LOW',
      success
    });
  }

  public async logSecurityEvent(
    eventType: AuditEventType,
    userId: string | undefined,
    ipAddress: string,
    action: string,
    details: Record<string, string | number | boolean | null | undefined> = {},
    riskLevel: RiskLevel = 'HIGH'
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      ipAddress,
      action,
      details,
      riskLevel,
      success: false
    });
  }

  public async logSystemEvent(
    eventType: AuditEventType,
    action: string,
    details: Record<string, string | number | boolean | null | undefined> = {},
    success: boolean = true
  ): Promise<void> {
    await this.log({
      eventType,
      action,
      details,
      riskLevel: 'LOW',
      success
    });
  }

  // Process batch of log entries
  private async processBatch(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.batchSize);
    
    try {
      // Store in database
      await this.storeLogs(batch);
      
      // Send alerts for high-risk events
      await this.processAlerts(batch);
      
    } catch (error) {
      console.error('Failed to process audit log batch:', error);
      // Re-queue failed entries (with limit to prevent infinite loops)
      if (batch.length < 1000) {
        this.logQueue.unshift(...batch);
      }
    }
  }

  // Store logs in database
  private async storeLogs(logs: AuditLogEntry[]): Promise<void> {
    try {
      await prisma.auditLogs.createMany({
        data: logs.map(log => ({
          eventType: log.eventType,
          userId: log.userId,
          userEmail: log.userEmail,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId,
          resourceId: log.resourceId,
          resourceType: log.resourceType,
          action: log.action,
          details: JSON.stringify(log.details),
          riskLevel: log.riskLevel,
          timestamp: log.timestamp,
          success: log.success,
          errorMessage: log.errorMessage,
          metadata: log.metadata ? JSON.stringify(log.metadata) : null
        }))
      });
    } catch (error) {
      console.error('Failed to store audit logs:', error);
      throw error;
    }
  }

  // Process alerts for high-risk events
  private async processAlerts(logs: AuditLogEntry[]): Promise<void> {
    const highRiskLogs = logs.filter(log => 
      log.riskLevel === 'HIGH' || log.riskLevel === 'CRITICAL'
    );

    for (const log of highRiskLogs) {
      try {
        // Send email alert (implement based on your email service)
        await this.sendSecurityAlert(log);
        
        // Log to external security service (implement based on your setup)
        await this.logToSecurityService(log);
        
      } catch (error) {
        console.error('Failed to process security alert:', error);
      }
    }
  }

  // Send security alert (placeholder - implement based on your email service)
  private async sendSecurityAlert(log: AuditLogEntry): Promise<void> {
    // Implement email notification logic here
    console.warn('Security Alert:', {
      eventType: log.eventType,
      userId: log.userId,
      action: log.action,
      timestamp: log.timestamp,
      riskLevel: log.riskLevel
    });
  }

  // Log to external security service (placeholder)
  private async logToSecurityService(log: AuditLogEntry): Promise<void> {
    // Implement external logging service integration here
    console.log('External Security Log:', log);
  }

  // Start batch processor timer
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      if (this.logQueue.length > 0) {
        await this.processBatch();
      }
    }, this.batchTimeout);
  }

  // Query audit logs with filtering
  public async queryLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    riskLevel?: RiskLevel;
    startDate?: Date;
    endDate?: Date;
    resourceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      const where: Partial<{
        userId: string;
        eventType: AuditEventType;
        riskLevel: RiskLevel;
        resourceId: string;
        timestamp: {
          gte?: Date;
          lte?: Date;
        };
      }> = {};
      
      if (filters.userId) where.userId = filters.userId;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.riskLevel) where.riskLevel = filters.riskLevel;
      if (filters.resourceId) where.resourceId = filters.resourceId;
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0
      });

      return logs.map((log: { details: string; metadata: string | null }) => ({
        ...log,
        details: JSON.parse(log.details),
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      }));
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  // Get audit statistics
  public async getAuditStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByRisk: Record<string, number>;
    failedEvents: number;
    uniqueUsers: number;
  }> {
    try {
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

      const logs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate
          }
        }
      });

      const stats = {
        totalEvents: logs.length,
        eventsByType: {} as Record<string, number>,
        eventsByRisk: {} as Record<string, number>,
        failedEvents: logs.filter((log: { success: boolean }) => !log.success).length,
        uniqueUsers: new Set(logs.map((log: { userId: string | null }) => log.userId).filter(Boolean)).size
      };

      // Count events by type
      logs.forEach((log: { eventType: string; riskLevel: string }) => {
        stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
        stats.eventsByRisk[log.riskLevel] = (stats.eventsByRisk[log.riskLevel] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  // Cleanup old logs
  public async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          },
          riskLevel: {
            not: RiskLevel.CRITICAL // Keep critical logs longer
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Process remaining logs
    if (this.logQueue.length > 0) {
      await this.processBatch();
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Middleware for Express.js to automatically log requests
export const auditMiddleware = (
  req: { 
    user?: { id: string; email: string; };
    ip: string;
    method: string;
    path: string;
    get: (header: string) => string;
    query: Record<string, unknown>;
    body: Record<string, unknown>;
  }, 
  res: {
    statusCode: number;
    on: (event: string, callback: () => void) => void;
  },
  next: () => void
) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    // Log API requests
    await auditLogger.log({
      eventType: AuditEventType.SYSTEM_ERROR, // You might want to create API_REQUEST event type
      userId,
      userEmail,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      action: `${req.method} ${req.path}`,
      details: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        query: JSON.stringify(req.query),
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      },
      riskLevel: res.statusCode >= 400 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      success: res.statusCode < 400
    });
  });
  
  next();
};