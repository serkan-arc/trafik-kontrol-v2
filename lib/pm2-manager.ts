// Station 2: PM2 Process Manager
// Handles PM2 process lifecycle for deployed sites

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PM2ProcessConfig {
  name: string;
  script: string;
  cwd: string;
  port: number;
  env?: Record<string, string>;
  instances?: number;
  autorestart?: boolean;
  maxMemoryRestart?: string;
}

export interface PM2Process {
  name: string;
  pm_id: number;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

export class PM2Manager {
  /**
   * Start a new PM2 process
   */
  static async start(config: PM2ProcessConfig): Promise<{ success: boolean; message: string; pm2Id?: number }> {
    try {
      const { name, script, cwd, port, env = {}, instances = 1, autorestart = true, maxMemoryRestart = '500M' } = config;

      // Build environment variables string
      const envVars = {
        PORT: port.toString(),
        NODE_ENV: 'production',
        ...env
      };

      const envString = Object.entries(envVars)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

      // Build PM2 start command
      const command = `cd "${cwd}" && pm2 start "${script}" --name "${name}" --instances ${instances} ${
        autorestart ? '--autorestart' : '--no-autorestart'
      } --max-memory-restart ${maxMemoryRestart} --env ${envString} --output /var/log/pm2/${name}-out.log --error /var/log/pm2/${name}-error.log --time`;

      const { stdout, stderr } = await execAsync(command);
      
      // Parse PM2 ID from output
      const pm2IdMatch = stdout.match(/pm2 \[(\d+)\]/);
      const pm2Id = pm2IdMatch ? parseInt(pm2IdMatch[1]) : undefined;

      // Save PM2 configuration
      await execAsync('pm2 save');

      return {
        success: true,
        message: `Process ${name} started successfully`,
        pm2Id
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start process: ${error.message}`
      };
    }
  }

  /**
   * Stop a PM2 process
   */
  static async stop(nameOrId: string | number): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`pm2 stop ${nameOrId}`);
      await execAsync('pm2 save');
      
      return {
        success: true,
        message: `Process ${nameOrId} stopped successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop process: ${error.message}`
      };
    }
  }

  /**
   * Restart a PM2 process
   */
  static async restart(nameOrId: string | number): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`pm2 restart ${nameOrId}`);
      
      return {
        success: true,
        message: `Process ${nameOrId} restarted successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to restart process: ${error.message}`
      };
    }
  }

  /**
   * Delete a PM2 process
   */
  static async delete(nameOrId: string | number): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`pm2 delete ${nameOrId}`);
      await execAsync('pm2 save');
      
      return {
        success: true,
        message: `Process ${nameOrId} deleted successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete process: ${error.message}`
      };
    }
  }

  /**
   * Get status of a specific process
   */
  static async getProcess(nameOrId: string | number): Promise<PM2Process | null> {
    try {
      const { stdout } = await execAsync(`pm2 jlist`);
      const processes = JSON.parse(stdout);
      
      const process = processes.find((p: any) => 
        p.name === nameOrId || p.pm_id === nameOrId
      );

      if (!process) {
        return null;
      }

      return {
        name: process.name,
        pm_id: process.pm_id,
        status: process.pm2_env.status,
        cpu: process.monit.cpu,
        memory: process.monit.memory,
        uptime: Date.now() - process.pm2_env.pm_uptime,
        restarts: process.pm2_env.restart_time
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all PM2 processes
   */
  static async listProcesses(): Promise<PM2Process[]> {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      
      return processes.map((p: any) => ({
        name: p.name,
        pm_id: p.pm_id,
        status: p.pm2_env.status,
        cpu: p.monit.cpu,
        memory: p.monit.memory,
        uptime: Date.now() - p.pm2_env.pm_uptime,
        restarts: p.pm2_env.restart_time
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get logs for a process
   */
  static async getLogs(nameOrId: string | number, lines: number = 100): Promise<{ success: boolean; logs?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`pm2 logs ${nameOrId} --lines ${lines} --nostream`);
      
      return {
        success: true,
        logs: stdout
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Flush logs for a process
   */
  static async flushLogs(nameOrId: string | number): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`pm2 flush ${nameOrId}`);
      
      return {
        success: true,
        message: `Logs flushed for ${nameOrId}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to flush logs: ${error.message}`
      };
    }
  }

  /**
   * Start multiple processes for different site versions
   */
  static async startSiteVersions(
    siteName: string,
    basePath: string,
    versions: {
      clean?: { port: number; script: string };
      gray?: { port: number; script: string };
      aggressive?: { port: number; script: string };
      mobileClean?: { port: number; script: string };
      mobileGray?: { port: number; script: string };
      mobileAggressive?: { port: number; script: string };
    }
  ): Promise<{ success: boolean; message: string; processes: Record<string, number> }> {
    const processes: Record<string, number> = {};
    const errors: string[] = [];

    // Start each version that's provided
    for (const [versionKey, versionConfig] of Object.entries(versions)) {
      if (!versionConfig) continue;

      const processName = `${siteName}-${versionKey}`;
      const result = await this.start({
        name: processName,
        script: versionConfig.script,
        cwd: basePath,
        port: versionConfig.port,
        instances: 1,
        autorestart: true,
        maxMemoryRestart: '500M'
      });

      if (result.success && result.pm2Id) {
        processes[versionKey] = result.pm2Id;
      } else {
        errors.push(`${versionKey}: ${result.message}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Some processes failed to start: ${errors.join(', ')}`,
        processes
      };
    }

    return {
      success: true,
      message: `All versions started successfully for ${siteName}`,
      processes
    };
  }

  /**
   * Stop all processes for a site
   */
  static async stopSiteVersions(siteName: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find all processes that match the site name pattern
      const allProcesses = await this.listProcesses();
      const siteProcesses = allProcesses.filter(p => p.name.startsWith(`${siteName}-`));

      if (siteProcesses.length === 0) {
        return {
          success: true,
          message: `No processes found for site ${siteName}`
        };
      }

      // Stop each process
      for (const process of siteProcesses) {
        await this.stop(process.name);
      }

      return {
        success: true,
        message: `Stopped ${siteProcesses.length} processes for ${siteName}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop site processes: ${error.message}`
      };
    }
  }

  /**
   * Restart all processes for a site
   */
  static async restartSiteVersions(siteName: string): Promise<{ success: boolean; message: string }> {
    try {
      const allProcesses = await this.listProcesses();
      const siteProcesses = allProcesses.filter(p => p.name.startsWith(`${siteName}-`));

      if (siteProcesses.length === 0) {
        return {
          success: false,
          message: `No processes found for site ${siteName}`
        };
      }

      for (const process of siteProcesses) {
        await this.restart(process.name);
      }

      return {
        success: true,
        message: `Restarted ${siteProcesses.length} processes for ${siteName}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to restart site processes: ${error.message}`
      };
    }
  }

  /**
   * Delete all processes for a site
   */
  static async deleteSiteVersions(siteName: string): Promise<{ success: boolean; message: string }> {
    try {
      const allProcesses = await this.listProcesses();
      const siteProcesses = allProcesses.filter(p => p.name.startsWith(`${siteName}-`));

      if (siteProcesses.length === 0) {
        return {
          success: true,
          message: `No processes found for site ${siteName}`
        };
      }

      for (const process of siteProcesses) {
        await this.delete(process.name);
      }

      return {
        success: true,
        message: `Deleted ${siteProcesses.length} processes for ${siteName}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete site processes: ${error.message}`
      };
    }
  }

  /**
   * Check if PM2 is installed and running
   */
  static async checkPM2(): Promise<{ installed: boolean; running: boolean; version?: string }> {
    try {
      const { stdout } = await execAsync('pm2 --version');
      const version = stdout.trim();
      
      // Try to list processes to check if PM2 daemon is running
      try {
        await execAsync('pm2 list');
        return {
          installed: true,
          running: true,
          version
        };
      } catch {
        return {
          installed: true,
          running: false,
          version
        };
      }
    } catch {
      return {
        installed: false,
        running: false
      };
    }
  }
}
