'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useRouter } from 'next/navigation';

interface ListsDistributionProps {
  lists: {
    whitelist: number;
    graylist: number;
    blacklist: number;
    unknown?: number;
  };
  totalIPs: number;
}

const COLORS = {
  whitelist: '#16A34A',
  graylist: '#CA8A04',
  blacklist: '#DC2626',
  unknown: '#6B7280'
};

export default function ListsDistributionChart({ lists, totalIPs }: ListsDistributionProps) {
  const router = useRouter();

  const data = [
    { name: 'Whitelist', value: lists.whitelist, color: COLORS.whitelist },
    { name: 'Graylist', value: lists.graylist, color: COLORS.graylist },
    { name: 'Blacklist', value: lists.blacklist, color: COLORS.blacklist },
  ];

  if (lists.unknown && lists.unknown > 0) {
    data.push({ name: 'Unknown', value: lists.unknown, color: COLORS.unknown });
  }

  const handleClick = (entry: any) => {
    const status = entry.name.toLowerCase();
    router.push(`/dashboard/traffic/ips?status=${status}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">IP Lists Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-4">
        <div className="text-3xl font-bold">{totalIPs}</div>
        <div className="text-sm text-gray-600">Total IPs</div>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{item.value.toLocaleString()}</span>
              <span className="text-gray-500 w-12 text-right">
                {((item.value / totalIPs) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
