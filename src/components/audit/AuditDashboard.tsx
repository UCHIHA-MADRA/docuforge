'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuditEventType, RiskLevel } from '@/lib/audit-logger';

// Types for audit log entries
interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  details: Record<string, string | number | boolean | null>;
  riskLevel: RiskLevel;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface AuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByRisk: Record<string, number>;
  failedEvents: number;
  uniqueUsers: number;
}

interface FilterOptions {
  userId?: string;
  eventType?: AuditEventType;
  riskLevel?: RiskLevel;
  startDate?: Date;
  endDate?: Date;
  resourceId?: string;
  limit: number;
  offset: number;
}

// Risk level color mapping
const riskColors = {
  [RiskLevel.LOW]: 'text-green-600 bg-green-50',
  [RiskLevel.MEDIUM]: 'text-yellow-600 bg-yellow-50',
  [RiskLevel.HIGH]: 'text-orange-600 bg-orange-50',
  [RiskLevel.CRITICAL]: 'text-red-600 bg-red-50'
};

// Event type icons
const eventIcons = {
  [AuditEventType.USER_LOGIN]: '🔐',
  [AuditEventType.USER_LOGOUT]: '🚪',
  [AuditEventType.DOCUMENT_UPLOADED]: '📤',
  [AuditEventType.DOCUMENT_DOWNLOADED]: '📥',
  [AuditEventType.PDF_MERGED]: '🔗',
  [AuditEventType.PDF_SPLIT]: '✂️',
  [AuditEventType.OCR_PERFORMED]: '👁️',
  [AuditEventType.SPREADSHEET_CREATED]: '📊',
  [AuditEventType.UNAUTHORIZED_ACCESS]: '⚠️',
  [AuditEventType.SUSPICIOUS_ACTIVITY]: '🚨'
};

export default function AuditDashboard() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    limit: 50,
    offset: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Load audit logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());
      
      const response = await fetch(`/api/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load audit statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/audit/stats?timeframe=${selectedTimeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit statistics');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error loading audit stats:', err);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: string | AuditEventType | RiskLevel | Date | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  // Handle pagination
  const handlePagination = (direction: 'next' | 'prev') => {
    setFilters(prev => ({
      ...prev,
      offset: direction === 'next' ? prev.offset + prev.limit : Math.max(0, prev.offset - prev.limit)
    }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format details for display
  const formatDetails = (details: Record<string, string | number | boolean | null>) => {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading audit logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Audit Dashboard</h1>
        
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
              <div className="text-sm text-blue-600">Total Events</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.uniqueUsers}</div>
              <div className="text-sm text-green-600">Unique Users</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failedEvents}</div>
              <div className="text-sm text-red-600">Failed Events</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.eventsByRisk[RiskLevel.HIGH] || 0}
              </div>
              <div className="text-sm text-yellow-600">High Risk</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.eventsByRisk[RiskLevel.CRITICAL] || 0}
              </div>
              <div className="text-sm text-purple-600">Critical Risk</div>
            </div>
          </div>
        )}

        {/* Timeframe Selector */}
        <div className="flex space-x-2 mb-4">
          {(['day', 'week', 'month'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={filters.eventType || ''}
              onChange={(e) => handleFilterChange('eventType', e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Events</option>
              {Object.values(AuditEventType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Level
            </label>
            <select
              value={filters.riskLevel || ''}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              {Object.values(RiskLevel).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
              placeholder="Enter user ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource ID
            </label>
            <input
              type="text"
              value={filters.resourceId || ''}
              onChange={(e) => handleFilterChange('resourceId', e.target.value || undefined)}
              placeholder="Enter resource ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setFilters({ limit: 50, offset: 0 })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Clear Filters
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handlePagination('prev')}
              disabled={filters.offset === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePagination('next')}
              disabled={logs.length < filters.limit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">
                        {eventIcons[log.eventType as keyof typeof eventIcons] || '📋'}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.eventType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {log.action}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.userEmail || log.userId || 'System'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.ipAddress}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      riskColors[log.riskLevel]
                    }`}>
                      {log.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.success
                        ? 'text-green-800 bg-green-100'
                        : 'text-red-800 bg-red-100'
                    }`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No audit logs found matching the current filters.
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Audit Log Details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <div className="text-sm text-gray-900">{selectedLog.eventType}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <div className="text-sm text-gray-900">{selectedLog.action}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <div className="text-sm text-gray-900">
                    {selectedLog.userEmail || selectedLog.userId || 'System'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <div className="text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    riskColors[selectedLog.riskLevel]
                  }`}>
                    {selectedLog.riskLevel}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <div className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
                
                {selectedLog.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <div className="text-sm text-red-600">{selectedLog.errorMessage}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}