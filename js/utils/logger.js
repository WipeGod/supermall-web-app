/**
 * Logger Service for SuperMall Web Application
 * Provides comprehensive logging functionality with different log levels
 */
class Logger {
    static logLevels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    static currentLevel = Logger.logLevels.INFO;
    static maxLogs = 100;

    /**
     * Main logging method
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
     * @param {string} message - Log message
     * @param {Object} data - Additional data to log
     */
    static log(level, message, data = {}) {
        const levelValue = Logger.logLevels[level] || Logger.logLevels.INFO;
        
        if (levelValue < Logger.currentLevel) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: Logger.getCurrentUserId()
        };
        
        // Console logging with appropriate method
        const consoleMethod = Logger.getConsoleMethod(level);
        consoleMethod(`[${level}] ${message}`, data);
        
        // Store in localStorage for persistence
        Logger.storeLog(logEntry);
        
        // Send to server in production (placeholder)
        if (Logger.shouldSendToServer(level)) {
            Logger.sendToServer(logEntry);
        }
    }

    /**
     * Get appropriate console method for log level
     */
    static getConsoleMethod(level) {
        switch (level) {
            case 'ERROR':
                return console.error;
            case 'WARN':
                return console.warn;
            case 'DEBUG':
                return console.debug;
            default:
                return console.log;
        }
    }

    /**
     * Store log entry in localStorage
     */
    static storeLog(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('supermall_logs') || '[]');
            logs.push(logEntry);
            
            // Keep only the most recent logs
            if (logs.length > Logger.maxLogs) {
                logs.splice(0, logs.length - Logger.maxLogs);
            }
            
            localStorage.setItem('supermall_logs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to store log:', error);
        }
    }

    /**
     * Get current user ID for logging context
     */
    static getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('supermall_current_user') || '{}');
            return user.uid || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }

    /**
     * Determine if log should be sent to server
     */
    static shouldSendToServer(level) {
        return level === 'ERROR' || level === 'WARN';
    }

    /**
     * Send log to server (placeholder implementation)
     */
    static sendToServer(logEntry) {
        // In a real implementation, this would send logs to a logging service
        // For demo purposes, we'll just store it locally
        try {
            const serverLogs = JSON.parse(localStorage.getItem('supermall_server_logs') || '[]');
            serverLogs.push(logEntry);
            localStorage.setItem('supermall_server_logs', JSON.stringify(serverLogs));
        } catch (error) {
            console.error('Failed to send log to server:', error);
        }
    }

    /**
     * Convenience methods for different log levels
     */
    static debug(message, data = {}) {
        Logger.log('DEBUG', message, data);
    }

    static info(message, data = {}) {
        Logger.log('INFO', message, data);
    }

    static warn(message, data = {}) {
        Logger.log('WARN', message, data);
    }

    static error(message, data = {}) {
        Logger.log('ERROR', message, data);
    }

    /**
     * Get all stored logs
     */
    static getLogs() {
        try {
            return JSON.parse(localStorage.getItem('supermall_logs') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Clear all stored logs
     */
    static clearLogs() {
        try {
            localStorage.removeItem('supermall_logs');
            localStorage.removeItem('supermall_server_logs');
            Logger.info('Logs cleared successfully');
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    /**
     * Performance logging
     */
    static performance(operation, startTime, data = {}) {
        const duration = performance.now() - startTime;
        Logger.info(`Performance: ${operation}`, {
            ...data,
            duration: `${duration.toFixed(2)}ms`
        });
    }

    /**
     * User action logging
     */
    static userAction(action, data = {}) {
        Logger.info(`User Action: ${action}`, {
            ...data,
            timestamp: new Date().toISOString(),
            userId: Logger.getCurrentUserId()
        });
    }
}

// Make Logger globally available
window.Logger = Logger;
