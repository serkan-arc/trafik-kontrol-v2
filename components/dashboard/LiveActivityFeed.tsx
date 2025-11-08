'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Activity {
  id: string;
  timestamp: string;
  ip: string;
  action: string;
  details: string;
  reason?: string;
  type: 'blacklist' | 'whitelist' | 'graylist' | 'form' | 'bot' | 'spam';
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchActivities();
    
    // Auto-refresh every 5 seconds unless paused
    const interval = setInterval(() => {
      if (!isPaused) {
        fetchActivities();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/traffic/analytics/live-feed?limit=20');
      const result = await res.json();
      
      if (result.success) {
        setActivities(result.data);
      }
    } catch (error) {
      console.error('Error fetching live activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      blacklist: 'border-red-500 bg-red-50',
      whitelist: 'border-green-500 bg-green-50',
      graylist: 'border-yellow-500 bg-yellow-50',
      form: 'border-blue-500 bg-blue-50',
      bot: 'border-purple-500 bg-purple-50',
      spam: 'border-red-500 bg-red-50',
    };
    return colors[type] || 'border-gray-500 bg-gray-50';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live Activity Feed</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time traffic events and automated actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Auto-refresh: {isPaused ? 'Paused' : '5s'}
          </span>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded text-sm ${
              isPaused 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={fetchActivities}
            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No recent activities
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 border-l-4 ${getActivityColor(activity.type)} hover:bg-opacity-75 transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        [{formatTime(activity.timestamp)}]
                      </span>
                      <span className="font-mono font-semibold">
                        {activity.ip}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {activity.action}
                    </div>
                    <div className="text-sm text-gray-600">
                      {activity.details}
                    </div>
                    {activity.reason && (
                      <div className="text-xs text-gray-500 mt-1">
                        Reason: {activity.reason}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/traffic/ips/${activity.ip}`}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
