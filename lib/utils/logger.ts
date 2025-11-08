// Production-safe logger utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  timestamp: boolean;
}

class Logger {
  private config: LoggerConfig;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      isDevelopment: process.env.NODE_ENV !== 'production',
      timestamp: true,
      ...config,
    };
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
  
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.config.timestamp ? new Date().toISOString() : '';
    const prefix = timestamp ? `[${timestamp}]` : '';
    return `${prefix}[${level.toUpperCase()}] ${message}`;
  }
  
  debug(message: string, data?: any): void {
    if (this.config.isDevelopment && this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data || '');
    }
  }
  
  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), data || '');
    }
  }
  
  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '');
    }
  }
  
  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '');
      
      // Production'da hataları bir monitoring servise gönder
      if (!this.config.isDevelopment && error) {
        this.sendToMonitoring(message, error);
      }
    }
  }
  
  private sendToMonitoring(message: string, error: any): void {
    // TODO: Sentry, LogRocket veya benzeri bir servise gönder
    // Şimdilik sadece structure'ı oluşturuyoruz
    const errorData = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
    
    // API call to monitoring service would go here
  }
}

// Singleton instance
const logger = new Logger();

export default logger;