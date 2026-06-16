import React, { useEffect, useRef } from 'react';
import { Tooltip } from 'antd';
import { useAgvStore } from '../../store/agvStore';
import { mapPoints } from '../../mock/path';
import type { Waypoint } from '../../types/path';
import type { AGV } from '../../types/agv';
import type { MapPoint } from '../../types/path';

interface AgvMapProps {
  showPaths?: boolean;
  selectedPath?: Waypoint[];
  onAgvClick?: (agv: AGV) => void;
  onPointClick?: (point: MapPoint) => void;
  highlightPoint?: { name: string; type: 'start' | 'end' } | null;
  height?: number;
}

const AgvMap: React.FC<AgvMapProps> = ({
  showPaths = true,
  selectedPath,
  onAgvClick,
  onPointClick,
  highlightPoint,
  height = 500,
}) => {
  const { agvList } = useAgvStore();
  const svgRef = useRef<SVGSVGElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#10B981';
      case 'idle':
        return '#3B82F6';
      case 'charging':
        return '#F59E0B';
      case 'fault':
        return '#EF4444';
      case 'maintenance':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'idle':
        return '待机';
      case 'charging':
        return '充电中';
      case 'fault':
        return '故障';
      case 'maintenance':
        return '维护中';
      default:
        return '未知';
    }
  };

  const getPointColor = (type: string) => {
    switch (type) {
      case 'warehouse':
        return '#3B82F6';
      case 'workshop':
        return '#8B5CF6';
      case 'yard':
        return '#F97316';
      case 'dock':
        return '#10B981';
      case 'charging':
        return '#F59E0B';
      case 'intersection':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const mapWidth = 800;
  const mapHeight = 600;

  const roadSegments = [
    { x1: 80, y1: 150, x2: 650, y2: 150 },
    { x1: 80, y1: 200, x2: 650, y2: 200 },
    { x1: 80, y1: 300, x2: 650, y2: 300 },
    { x1: 80, y1: 400, x2: 650, y2: 400 },
    { x1: 80, y1: 450, x2: 650, y2: 450 },
    { x1: 150, y1: 80, x2: 150, y2: 520 },
    { x1: 300, y1: 80, x2: 300, y2: 520 },
    { x1: 400, y1: 80, x2: 400, y2: 520 },
    { x1: 550, y1: 80, x2: 550, y2: 520 },
    { x1: 650, y1: 80, x2: 650, y2: 520 },
  ];

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="w-full h-full"
        style={{ height }}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#1E293B"
              strokeWidth="0.5"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

        {roadSegments.map((road, index) => (
          <line
            key={`road-${index}`}
            x1={road.x1}
            y1={road.y1}
            x2={road.x2}
            y2={road.y2}
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
        ))}

        {roadSegments.map((road, index) => (
          <line
            key={`road-center-${index}`}
            x1={road.x1}
            y1={road.y1}
            x2={road.x2}
            y2={road.y2}
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="10 10"
          />
        ))}

        {showPaths && selectedPath && selectedPath.length > 1 && (
          <path
            d={selectedPath
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ')}
            fill="none"
            stroke="#F97316"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              strokeDasharray: '10 5',
              animation: 'dash 1s linear infinite',
            }}
          />
        )}

        {mapPoints.map((point, index) => {
          const isStart = highlightPoint?.name === point.name && highlightPoint?.type === 'start';
          const isEnd = highlightPoint?.name === point.name && highlightPoint?.type === 'end';
          const highlightColor = isStart ? '#10B981' : isEnd ? '#EF4444' : null;
          return (
            <g
              key={`point-${index}`}
              className={onPointClick && point.type !== 'intersection' ? 'cursor-pointer' : ''}
              onClick={() => {
                if (onPointClick && point.type !== 'intersection') {
                  onPointClick(point);
                }
              }}
            >
              {highlightColor && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={32}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth="3"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={point.type === 'intersection' ? 8 : 16}
                fill={highlightColor || getPointColor(point.type)}
                opacity="0.9"
              />
              {point.type !== 'intersection' && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={20}
                  fill="none"
                  stroke={highlightColor || getPointColor(point.type)}
                  strokeWidth="2"
                  opacity="0.3"
                />
              )}
              <text
                x={point.x}
                y={point.y + 32}
                textAnchor="middle"
                fill={highlightColor || '#94A3B8'}
                fontSize="11"
                fontWeight={highlightColor ? 'bold' : '500'}
              >
                {point.name}
                {isStart && ' (起)'}
                {isEnd && ' (终)'}
              </text>
            </g>
          );
        })}

        {agvList.map((agv) => (
          <g
            key={agv.id}
            className="cursor-pointer transition-all duration-300"
            onClick={() => onAgvClick?.(agv)}
          >
            <circle
              cx={agv.x}
              cy={agv.y}
              r={22}
              fill={getStatusColor(agv.status)}
              opacity="0.2"
            />
            <rect
              x={agv.x - 14}
              y={agv.y - 10}
              width={28}
              height={20}
              rx={4}
              fill={getStatusColor(agv.status)}
              filter="url(#glow)"
            />
            <rect
              x={agv.x - 10}
              y={agv.y - 6}
              width={8}
              height={6}
              rx={1}
              fill="white"
              opacity="0.3"
            />
            <text
              x={agv.x}
              y={agv.y - 16}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {agv.id}
            </text>
            {agv.status === 'running' && (
              <circle
                cx={agv.x + 16}
                cy={agv.y - 16}
                r={4}
                fill="#10B981"
                className="animate-pulse"
              />
            )}
            {agv.status === 'fault' && (
              <circle
                cx={agv.x + 16}
                cy={agv.y - 16}
                r={4}
                fill="#EF4444"
                className="animate-pulse"
              />
            )}
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 bg-slate-800 bg-opacity-90 rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-2 font-medium">图例</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-slate-300">运行中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-slate-300">待机</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-slate-300">充电中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-slate-300">故障</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-slate-300">维护中</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -15;
          }
        }
      `}</style>
    </div>
  );
};

export default AgvMap;
