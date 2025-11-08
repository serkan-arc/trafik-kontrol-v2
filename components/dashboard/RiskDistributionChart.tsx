'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

interface RiskDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function RiskDistributionChart() {
  const [data, setData] = useState<RiskDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    try {
      const res = await fetch('/api/traffic/analytics/risk-distribution?days=7');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching risk distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportChart = (format: 'png' | 'csv') => {
    if (format === 'csv') {
      const csvContent = [
        ['Date', 'Critical', 'High', 'Medium', 'Low'],
        ...data.map(d => [d.date, d.critical, d.high, d.medium, d.low])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risk-distribution-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Risk Distribution (Last 7 Days)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportChart('csv')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Export CSV
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EA580C" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#EA580C" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#CA8A04" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#CA8A04" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="critical" 
            stackId="1"
            stroke="#DC2626" 
            fill="url(#colorCritical)"
            name="Critical (80-100)"
          />
          <Area 
            type="monotone" 
            dataKey="high" 
            stackId="1"
            stroke="#EA580C" 
            fill="url(#colorHigh)"
            name="High (50-79)"
          />
          <Area 
            type="monotone" 
            dataKey="medium" 
            stackId="1"
            stroke="#CA8A04" 
            fill="url(#colorMedium)"
            name="Medium (30-49)"
          />
          <Area 
            type="monotone" 
            dataKey="low" 
            stackId="1"
            stroke="#16A34A" 
            fill="url(#colorLow)"
            name="Low (0-29)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
