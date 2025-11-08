/**
 * Modern Stat Card Component
 * Based on TRAFFIC_CONTROL_UI_DESIGN_PLAN.md specifications
 */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange' | 'indigo';
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  subtitle,
  color,
  icon,
  trend,
  onClick
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-300',
      text: 'text-blue-900',
      icon: 'text-blue-600'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-300',
      text: 'text-green-900',
      icon: 'text-green-600'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-300',
      text: 'text-purple-900',
      icon: 'text-purple-600'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: 'text-red-600'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: 'text-yellow-600'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      border: 'border-orange-300',
      text: 'text-orange-900',
      icon: 'text-orange-600'
    },
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      border: 'border-indigo-300',
      text: 'text-indigo-900',
      icon: 'text-indigo-600'
    }
  }[color];

  return (
    <div
      className={`
        relative overflow-hidden
        ${colorClasses.bg} ${colorClasses.border}
        border-2 rounded-xl p-6
        shadow-md hover:shadow-xl
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </div>
          <div className={`text-4xl font-bold ${colorClasses.text} mt-3 mb-2`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {subtitle}
            </div>
            {trend && (
              <div className={`flex items-center text-xs font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? '↑' : '↓'}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </div>
        <div className={`text-5xl ${colorClasses.icon} opacity-80`}>
          {icon}
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-500"
        style={{
          transform: 'skewX(-20deg) translateX(-100%)',
          animation: onClick ? 'shine 3s infinite' : 'none'
        }}
      />
    </div>
  );
}
