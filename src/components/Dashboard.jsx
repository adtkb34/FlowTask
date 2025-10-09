import { useEffect, useMemo, useState } from 'react';

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
const GROUPING_FIELDS = [
  { key: 'stage', label: '阶段' },
  { key: 'taskType', label: '任务类型' },
  { key: 'priority', label: '优先级' },
  { key: 'status', label: '状态' }
];
const UNASSIGNED_MODULE_KEY = '__unassigned__';

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

const getTextColor = (hex) => {
  if (!hex) return '#0f172a';
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) return '#0f172a';
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#f8fafc';
};

const PieChart = ({ data, size = 240 }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) {
    return <div className="dashboard-chart-empty">暂无可用的任务数据</div>;
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
        const midAngle = startAngle + sliceAngle / 2;
        currentAngle = endAngle;

        const labelRadius = radius * 0.65;
        const labelX = center + labelRadius * Math.cos(midAngle);
        const labelY = center + labelRadius * Math.sin(midAngle);

        if (sliceAngle >= Math.PI * 2 - 1e-6) {
          return (
            <g key={item.key}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill={item.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              >
                <title>{`${item.label}: ${item.value} (${item.percentage})`}</title>
              </circle>
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={getTextColor(item.color)}
                fontSize={14}
              >
                {item.value}
              </text>
            </g>
          );
        }

        return (
          <g key={item.key}>
            <path
              d={describeSlice(center, center, radius, startAngle, endAngle)}
              fill={item.color}
              stroke="#ffffff"
              strokeWidth={1.5}
            >
              <title>{`${item.label}: ${item.value} (${item.percentage})`}</title>
            </path>
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={getTextColor(item.color)}
              fontSize={14}
            >
              {item.value}
            </text>
          </g>
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
  stages,
  taskTypes,
  priorities,
  moduleDistinctionEnabled,
  onModuleDistinctionChange
}) => {
  const moduleLabelMap = useMemo(() => {
    const map = new Map();
    modules.forEach((module) => {
      map.set(module.id, module.name);
    });
    map.set(UNASSIGNED_MODULE_KEY, '未分配模块');
    return map;
  }, [modules]);

  const moduleColorMap = useMemo(() => {
    const map = new Map();
    modules.forEach((module, index) => {
      map.set(module.id, MODULE_COLOR_PALETTE[index % MODULE_COLOR_PALETTE.length]);
    });
    const unassignedIndex = modules.length % MODULE_COLOR_PALETTE.length;
    map.set(UNASSIGNED_MODULE_KEY, MODULE_COLOR_PALETTE[unassignedIndex]);
    return map;
  }, [modules]);

  const moduleOptions = useMemo(() => {
    const options = modules.map((module) => ({ id: module.id, label: module.name }));
    const hasUnassigned = tasks.some((task) => !task.moduleId);
    if (hasUnassigned) {
      options.push({ id: UNASSIGNED_MODULE_KEY, label: moduleLabelMap.get(UNASSIGNED_MODULE_KEY) });
    }
    return options;
  }, [modules, tasks, moduleLabelMap]);

  const [selectedModuleIds, setSelectedModuleIds] = useState(() => moduleOptions.map((option) => option.id));

  useEffect(() => {
    const optionIds = moduleOptions.map((option) => option.id);
    setSelectedModuleIds((prev) => {
      const filtered = prev.filter((id) => optionIds.includes(id));
      const selectedSet = new Set(filtered);
      const ordered = optionIds.filter((id) => selectedSet.has(id));
      const missing = optionIds.filter((id) => !selectedSet.has(id));
      const next = [...ordered, ...missing];
      if (next.length === 0) {
        return optionIds;
      }
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [moduleOptions]);

  const [selectedGroupFields, setSelectedGroupFields] = useState(['status']);

  const stageNameMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.name])), [stages]);
  const taskTypeNameMap = useMemo(
    () => new Map(taskTypes.map((taskType) => [taskType.id, taskType.name])),
    [taskTypes]
  );
  const groupLabelMap = useMemo(
    () => new Map(GROUPING_FIELDS.map((item) => [item.key, item.label])),
    []
  );

  const allowModuleDistinction = selectedModuleIds.filter(Boolean).length > 1;

  useEffect(() => {
    if (moduleDistinctionEnabled && !allowModuleDistinction) {
      onModuleDistinctionChange?.(false);
    }
  }, [allowModuleDistinction, moduleDistinctionEnabled, onModuleDistinctionChange]);

  const moduleDimensionEnabled = moduleDistinctionEnabled && allowModuleDistinction;

  const filteredTasks = useMemo(() => {
    if (selectedModuleIds.length === 0) {
      return [];
    }
    const selectedSet = new Set(selectedModuleIds);
    return tasks.filter((task) => selectedSet.has(task.moduleId ?? UNASSIGNED_MODULE_KEY));
  }, [selectedModuleIds, tasks]);

  const groupingFields = selectedGroupFields.length > 0 ? selectedGroupFields : ['status'];

  const baseEntries = useMemo(() => {
    if (filteredTasks.length === 0) {
      return [];
    }
    const combos = new Map();
    filteredTasks.forEach((task) => {
      const moduleKey = task.moduleId ?? UNASSIGNED_MODULE_KEY;
      const values = {};
      const labelParts = [];

      if (moduleDimensionEnabled) {
        labelParts.push(`模块：${moduleLabelMap.get(moduleKey) || '未分配模块'}`);
      }

      groupingFields.forEach((field) => {
        let entry;
        if (field === 'stage') {
          const stageId = task.stageId || '__no_stage__';
          const label = stageNameMap.get(task.stageId) || (task.stageId ? `未知阶段(${task.stageId})` : '未指定阶段');
          entry = { key: stageId, label };
        } else if (field === 'taskType') {
          const typeId = task.taskTypeId || '__no_task_type__';
          const label = task.taskTypeId
            ? taskTypeNameMap.get(task.taskTypeId) || `未知类型(${task.taskTypeId})`
            : '未指定类型';
          entry = { key: typeId, label };
        } else if (field === 'priority') {
          const priorityValue = task.priority || '';
          const label = priorityValue || '未设置优先级';
          entry = { key: priorityValue || '__no_priority__', label };
        } else if (field === 'status') {
          const statusValue = task.status || '';
          const label = statusValue || '未设置状态';
          entry = { key: statusValue || '__no_status__', label };
        } else {
          entry = { key: 'unknown', label: '未知' };
        }
        values[field] = entry;
        const fieldLabel = groupLabelMap.get(field) || field;
        labelParts.push(`${fieldLabel}：${entry.label}`);
      });

      const keyParts = [];
      if (moduleDimensionEnabled) {
        keyParts.push(moduleKey);
      }
      groupingFields.forEach((field) => {
        keyParts.push(values[field]?.key ?? '__unset__');
      });
      const mapKey = keyParts.join('|');
      const current = combos.get(mapKey);
      if (current) {
        current.value += 1;
      } else {
        combos.set(mapKey, {
          key: mapKey,
          moduleKey: moduleDimensionEnabled ? moduleKey : null,
          values,
          labelParts,
          value: 1
        });
      }
    });
    const entries = Array.from(combos.values()).map((item) => ({
      ...item,
      label: item.labelParts.join(' / ')
    }));
    entries.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    return entries;
  }, [
    filteredTasks,
    moduleDimensionEnabled,
    moduleLabelMap,
    groupingFields,
    groupLabelMap,
    stageNameMap,
    taskTypeNameMap
  ]);

  const coloredEntries = useMemo(() => {
    const moduleCounters = new Map();
    let paletteIndex = 0;
    return baseEntries.map((entry) => {
      let color;
      if (moduleDimensionEnabled) {
        const moduleKey = entry.moduleKey ?? UNASSIGNED_MODULE_KEY;
        const baseColor = moduleColorMap.get(moduleKey) || MODULE_COLOR_PALETTE[0];
        const count = moduleCounters.get(moduleKey) || 0;
        const adjustment = STATUS_SHADE_STEPS[count % STATUS_SHADE_STEPS.length];
        moduleCounters.set(moduleKey, count + 1);
        color = adjustColor(baseColor, adjustment);
      } else if (groupingFields.length === 1 && groupingFields[0] === 'status') {
        const statusKey = entry.values.status?.key || '';
        color = STATUS_COLORS[statusKey] || '#94a3b8';
      } else {
        color = MODULE_COLOR_PALETTE[paletteIndex % MODULE_COLOR_PALETTE.length];
        paletteIndex += 1;
      }
      return { ...entry, color };
    });
  }, [baseEntries, moduleDimensionEnabled, moduleColorMap, groupingFields]);

  const totalTasks = filteredTasks.length;

  const legendEntries = useMemo(
    () =>
      coloredEntries.map((entry) => ({
        ...entry,
        percentage:
          totalTasks === 0
            ? '0%'
            : `${((entry.value / totalTasks) * 100)
                .toFixed(1)
                .replace(/\.0$/, '')}%`
      })),
    [coloredEntries, totalTasks]
  );

  const chartData = useMemo(
    () => legendEntries.filter((entry) => entry.value > 0),
    [legendEntries]
  );

  const toggleDisabled = !allowModuleDistinction;

  return (
    <section className="card dashboard-card">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h2>项目任务仪表盘</h2>
          <p className="dashboard-subtitle">
            {project ? `项目“${project.name}”的任务分布概览` : '请选择项目以查看任务概览'}
          </p>
        </div>
        <label className="dashboard-toggle">
          <input
            type="checkbox"
            checked={moduleDistinctionEnabled && !toggleDisabled}
            onChange={(event) => onModuleDistinctionChange?.(event.target.checked)}
            disabled={toggleDisabled}
            title={toggleDisabled ? '至少需要 2 个已选模块才能区分显示' : undefined}
          />
          <span>在饼图中区分模块</span>
        </label>
      </div>

      <div className="dashboard-controls">
        <div className="dashboard-filter-group">
          <div className="dashboard-filter-title">模块筛选</div>
          {moduleOptions.length > 0 ? (
            <div className="dashboard-checkbox-grid">
              {moduleOptions.map((option) => {
                const checked = selectedModuleIds.includes(option.id);
                return (
                  <label key={option.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const { checked: isChecked } = event.target;
                        setSelectedModuleIds((prev) => {
                          if (isChecked) {
                            if (prev.includes(option.id)) return prev;
                            return [...prev, option.id];
                          }
                          if (prev.length <= 1) {
                            return prev;
                          }
                          const next = prev.filter((id) => id !== option.id);
                          return next.length === 0 ? prev : next;
                        });
                      }}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-filter-empty">暂无模块可筛选</div>
          )}
        </div>

        <div className="dashboard-filter-group">
          <div className="dashboard-filter-title">饼图维度</div>
          <div className="dashboard-checkbox-grid">
            {GROUPING_FIELDS.map((field) => {
              const checked = selectedGroupFields.includes(field.key);
              return (
                <label key={field.key}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const { checked: isChecked } = event.target;
                      setSelectedGroupFields((prev) => {
                        if (isChecked) {
                          if (prev.includes(field.key)) return prev;
                          return [...prev, field.key];
                        }
                        return prev.filter((item) => item !== field.key);
                      });
                    }}
                  />
                  {field.label}
                </label>
              );
            })}
          </div>
          <p className="dashboard-filter-hint">未选择维度时将按状态统计</p>
        </div>
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
          {legendEntries.length === 0 ? (
            <li className="dashboard-legend-item muted">
              <span className="dashboard-legend-text">暂无匹配的任务</span>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
};

export default Dashboard;
