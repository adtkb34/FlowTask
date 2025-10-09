import { useMemo } from 'react';

const STATUS_COLORS = {
  未开始: '#94a3b8',
  进行中: '#60a5fa',
  已完成: '#34d399'
};

const MODULE_COLOR_PALETTE = [
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#22d3ee',
  '#f59e0b',
  '#10b981'
];

const STATUS_SHADE_STEPS = [-0.18, 0.02, 0.18, 0.3];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const adjustColor = (hex, amount) => {
  if (!hex) return '#94a3b8';
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) return '#94a3b8';
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const transform = (channel) => {
    if (amount < 0) {
      return Math.round(channel * (1 + amount));
    }
    return Math.round(channel + (255 - channel) * amount);
  };

  const nextR = clamp(transform(r), 0, 255);
  const nextG = clamp(transform(g), 0, 255);
  const nextB = clamp(transform(b), 0, 255);
  const nextHex = (nextR << 16) | (nextG << 8) | nextB;
  return `#${nextHex.toString(16).padStart(6, '0')}`;
};

const describeSlice = (cx, cy, radius, startAngle, endAngle) => {
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    'M',
    cx,
    cy,
    'L',
    startX,
    startY,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    endX,
    endY,
    'Z'
  ].join(' ');
};

const PieChart = ({ data, size = 240 }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) {
    return (
      <div className="dashboard-chart-empty">暂无可用的任务数据</div>
    );
  }

  const radius = size / 2;
  const center = size / 2;
  let currentAngle = -Math.PI / 2;

  return (
    <svg
      className="dashboard-chart-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="任务状态饼图"
    >
      {data.map((item) => {
        if (item.value <= 0) {
          return null;
        }
        const sliceAngle = (item.value / total) * Math.PI * 2;
        const startAngle = currentAngle;
        const endAngle = startAngle + sliceAngle;
        currentAngle = endAngle;

        if (sliceAngle >= Math.PI * 2 - 1e-6) {
          return (
            <circle
              key={item.key}
              cx={center}
              cy={center}
              r={radius}
              fill={item.color}
              stroke="#ffffff"
              strokeWidth={1.5}
            >
              <title>{`${item.label}: ${item.value} (${item.percentage})`}</title>
            </circle>
          );
        }

        return (
          <path
            key={item.key}
            d={describeSlice(center, center, radius, startAngle, endAngle)}
            fill={item.color}
            stroke="#ffffff"
            strokeWidth={1.5}
          >
            <title>{`${item.label}: ${item.value} (${item.percentage})`}</title>
          </path>
        );
      })}
    </svg>
  );
};

const Dashboard = ({
  project,
  tasks,
  modules,
  statuses,
  moduleDistinctionEnabled,
  onModuleDistinctionChange
}) => {
  const moduleColorMap = useMemo(() => {
    const map = new Map();
    modules.forEach((module, index) => {
      map.set(module.id, MODULE_COLOR_PALETTE[index % MODULE_COLOR_PALETTE.length]);
    });
    return map;
  }, [modules]);

  const statusAdjustmentMap = useMemo(() => {
    const map = new Map();
    statuses.forEach((status, index) => {
      const adjustment = STATUS_SHADE_STEPS[index % STATUS_SHADE_STEPS.length];
      map.set(status, adjustment);
    });
    return map;
  }, [statuses]);

  const fallbackStatus = statuses.length > 0 ? statuses[statuses.length - 1] : '';

  const baseStatusData = useMemo(() => {
    const counts = statuses.map((status) => ({
      key: status,
      label: status,
      status,
      value: 0,
      color: STATUS_COLORS[status] || '#94a3b8'
    }));

    tasks.forEach((task) => {
      const status = statuses.includes(task.status) ? task.status : fallbackStatus;
      const target = counts.find((item) => item.status === status);
      if (target) {
        target.value += 1;
      }
    });
    return counts;
  }, [fallbackStatus, statuses, tasks]);

  const { chartData, legendEntries, totalTasks } = useMemo(() => {
    if (!moduleDistinctionEnabled || modules.length <= 1) {
      const total = baseStatusData.reduce((acc, item) => acc + item.value, 0);
      const formatted = baseStatusData.map((item) => ({
        ...item,
        percentage: total === 0 ? '0%' : `${((item.value / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
      }));
      return {
        chartData: formatted.filter((item) => item.value > 0),
        legendEntries: formatted,
        totalTasks: total
      };
    }

    const moduleStatusCounts = new Map();
    tasks.forEach((task) => {
      const normalizedStatus = statuses.includes(task.status) ? task.status : fallbackStatus;
      if (!normalizedStatus) return;
      const key = `${task.moduleId}-${normalizedStatus}`;
      moduleStatusCounts.set(key, (moduleStatusCounts.get(key) || 0) + 1);
    });

    const entries = [];
    const legend = [];
    let total = 0;
    modules.forEach((module, moduleIndex) => {
      const baseColor = moduleColorMap.get(module.id) || MODULE_COLOR_PALETTE[moduleIndex % MODULE_COLOR_PALETTE.length];
      statuses.forEach((status, statusIndex) => {
        const statusCount = moduleStatusCounts.get(`${module.id}-${status}`) || 0;
        const adjustment = statusAdjustmentMap.get(status) ?? STATUS_SHADE_STEPS[statusIndex % STATUS_SHADE_STEPS.length];
        const color = adjustColor(baseColor, adjustment);
        const label = `${module.name} · ${status}`;
        legend.push({
          key: `${module.id}-${status}`,
          label,
          value: statusCount,
          color,
          percentage: 0
        });
        total += statusCount;
        if (statusCount > 0) {
          entries.push({
            key: `${module.id}-${status}`,
            label,
            value: statusCount,
            color,
            percentage: '0%'
          });
        }
      });
    });

    const formattedEntries = entries.map((item) => ({
      ...item,
      percentage: total === 0 ? '0%' : `${((item.value / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
    }));

    const formattedLegend = legend.map((item) => ({
      ...item,
      percentage: total === 0 ? '0%' : `${((item.value / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
    }));

    return {
      chartData: formattedEntries,
      legendEntries: formattedLegend,
      totalTasks: total
    };
  }, [
    baseStatusData,
    moduleDistinctionEnabled,
    moduleColorMap,
    modules,
    statusAdjustmentMap,
    statuses,
    tasks,
    fallbackStatus
  ]);

  const toggleDisabled = modules.length <= 1;

  return (
    <section className="card dashboard-card">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h2>项目任务仪表盘</h2>
          <p className="dashboard-subtitle">
            {project ? `项目“${project.name}”的任务状态分布` : '请选择项目以查看任务状态概览'}
          </p>
        </div>
        <label className="dashboard-toggle">
          <input
            type="checkbox"
            checked={moduleDistinctionEnabled}
            onChange={(event) => onModuleDistinctionChange?.(event.target.checked)}
            disabled={toggleDisabled}
            title={toggleDisabled ? '至少需要 2 个模块才能区分显示' : undefined}
          />
          <span>在饼图中区分模块</span>
        </label>
      </div>
      <div className="dashboard-body">
        <div className="dashboard-chart-container">
          <div className="dashboard-chart">
            <PieChart data={chartData} />
            {totalTasks > 0 ? (
              <div className="dashboard-chart-center">
                <span className="dashboard-chart-total">{totalTasks}</span>
                <span className="dashboard-chart-label">任务总数</span>
              </div>
            ) : null}
          </div>
        </div>
        <ul className="dashboard-legend" aria-label="任务状态图例">
          {legendEntries.map((item) => (
            <li key={item.key} className="dashboard-legend-item">
              <span className="dashboard-legend-color" style={{ backgroundColor: item.color }} />
              <div className="dashboard-legend-text">
                <span className="dashboard-legend-label">{item.label}</span>
                <span className="dashboard-legend-value">
                  {item.value} {item.percentage !== '0%' ? `(${item.percentage})` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Dashboard;
