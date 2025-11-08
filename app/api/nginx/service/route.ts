import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!['start', 'stop', 'restart', 'reload', 'test'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    let command: string
    let result: { stdout: string; stderr: string }

    switch (action) {
      case 'start':
        command = 'sudo systemctl start nginx'
        break
      case 'stop':
        command = 'sudo systemctl stop nginx'
        break
      case 'restart':
        command = 'sudo systemctl restart nginx'
        break
      case 'reload':
        command = 'sudo nginx -s reload'
        break
      case 'test':
        command = 'sudo nginx -t'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    try {
      result = await execAsync(command)
      
      // For test command, nginx outputs to stderr even when successful
      if (action === 'test' && result.stderr.includes('syntax is ok') && result.stderr.includes('test is successful')) {
        return NextResponse.json({
          success: true,
          action,
          message: 'Nginx configuration test successful',
          output: result.stderr
        })
      }

      return NextResponse.json({
        success: true,
        action,
        message: `Nginx ${action} completed successfully`,
        output: result.stdout || result.stderr
      })
    } catch (error: any) {
      // For test command, check if it's just a config error (not a system error)
      if (action === 'test' && error.stderr) {
        return NextResponse.json({
          success: false,
          action,
          error: 'Nginx configuration test failed',
          details: error.stderr
        })
      }

      return NextResponse.json(
        { 
          error: `Failed to ${action} nginx`,
          details: error.message || error.stderr || error.stdout
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Nginx service control error:', error)
    return NextResponse.json(
      { error: 'Failed to control nginx service', details: error.message },
      { status: 500 }
    )
  }
}

// Get nginx service status
export async function GET() {
  try {
    const statusCmd = await execAsync('sudo systemctl is-active nginx').catch(() => ({ stdout: 'inactive', stderr: '' }))
    const isActive = statusCmd.stdout.trim() === 'active'

    // Get nginx version
    const versionCmd = await execAsync('nginx -v 2>&1').catch(() => ({ stdout: '', stderr: '' }))
    const version = versionCmd.stderr || versionCmd.stdout || 'unknown'

    // Get nginx uptime if running
    let uptime = null
    if (isActive) {
      try {
        const uptimeCmd = await execAsync('sudo systemctl show nginx --property=ActiveEnterTimestamp')
        const timestamp = uptimeCmd.stdout.replace('ActiveEnterTimestamp=', '').trim()
        if (timestamp && timestamp !== '') {
          const startTime = new Date(timestamp)
          const now = new Date()
          const diff = now.getTime() - startTime.getTime()
          
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          
          uptime = `${days}d ${hours}h ${minutes}m`
        }
      } catch (error) {
        console.error('Error getting uptime:', error)
      }
    }

    // Test nginx configuration
    let configTest = { valid: false, message: 'Not tested' }
    try {
      const testCmd = await execAsync('sudo nginx -t 2>&1')
      configTest = {
        valid: testCmd.stderr.includes('syntax is ok') && testCmd.stderr.includes('test is successful'),
        message: testCmd.stderr || testCmd.stdout
      }
    } catch (error: any) {
      configTest = {
        valid: false,
        message: error.stderr || error.message
      }
    }

    return NextResponse.json({
      isActive,
      version: version.replace('nginx version: ', '').replace('nginx/', '').trim(),
      uptime,
      configTest
    })

  } catch (error: any) {
    console.error('Error getting nginx status:', error)
    return NextResponse.json(
      { error: 'Failed to get nginx status', details: error.message },
      { status: 500 }
    )
  }
}