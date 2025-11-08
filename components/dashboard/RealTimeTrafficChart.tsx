'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

interface TrafficDataPoint {
  time: string;
  totalVisits: number;
  uniqueIPs: number;
  spamAttempts: number;
}

export default function RealTimeTrafficChart() {
  const [data, setData] = useState<TrafficDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrafficData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTrafficData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrafficData = async () => {
    try {
      const res = await fetch('/api/traffic/analytics/real-time?hours=24');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching real-time traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Real-Time Traffic (Last 24 Hours)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="totalVisits" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Total Visits"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="uniqueIPs" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Unique IPs"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="spamAttempts" 
            stroke="#EF4444" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Spam Attempts"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
