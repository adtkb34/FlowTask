import { useCallback, useEffect, useMemo, useState } from 'react';

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

const IndeterminateCheckbox = ({ indeterminate, ...props }) => {
  const setRef = useCallback(
    (node) => {
      if (node) {
        node.indeterminate = Boolean(indeterminate);
      }
    },
    [indeterminate]
  );

  return <input ref={setRef} {...props} />;
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
  const [modulesExpanded, setModulesExpanded] = useState(true);

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

  const dimensionValueOptions = useMemo(() => {
    const knownStageIds = new Set();
    const stageOptions = stages
      .filter((stage) => stage && stage.id)
      .map((stage) => {
        knownStageIds.add(stage.id);
        return { key: stage.id, label: stage.name || '未命名阶段' };
      });
    const extraStageIds = new Set();
    tasks.forEach((task) => {
      if (task?.stageId && !knownStageIds.has(task.stageId)) {
        extraStageIds.add(task.stageId);
      }
    });
    extraStageIds.forEach((stageId) => {
      stageOptions.push({ key: stageId, label: `未知阶段(${stageId})` });
    });
    stageOptions.unshift({ key: '__no_stage__', label: '未指定阶段' });

    const knownTaskTypeIds = new Set();
    const taskTypeOptions = taskTypes
      .filter((taskType) => taskType && taskType.id)
      .map((taskType) => {
        knownTaskTypeIds.add(taskType.id);
        return { key: taskType.id, label: taskType.name || '未命名类型' };
      });
    const extraTaskTypeIds = new Set();
    tasks.forEach((task) => {
      if (task?.taskTypeId && !knownTaskTypeIds.has(task.taskTypeId)) {
        extraTaskTypeIds.add(task.taskTypeId);
      }
    });
    extraTaskTypeIds.forEach((taskTypeId) => {
      taskTypeOptions.push({ key: taskTypeId, label: `未知类型(${taskTypeId})` });
    });
    taskTypeOptions.unshift({ key: '__no_task_type__', label: '未指定类型' });

    const normalizeStringOptions = (values, emptyLabel) => {
      const seen = new Set();
      const normalized = [];
      values.forEach((value) => {
        const key = typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
        const optionKey = key || emptyLabel.key;
        if (seen.has(optionKey)) {
          return;
        }
        seen.add(optionKey);
        normalized.push({ key: optionKey, label: key || emptyLabel.label });
      });
      const existingIndex = normalized.findIndex((item) => item.key === emptyLabel.key);
      if (existingIndex >= 0) {
        const [existing] = normalized.splice(existingIndex, 1);
        normalized.unshift({ key: emptyLabel.key, label: existing.label || emptyLabel.label });
      } else {
        normalized.unshift(emptyLabel);
      }
      return normalized;
    };

    const priorityOptions = normalizeStringOptions(
      [...priorities, ...tasks.map((task) => task?.priority ?? '')],
      {
        key: '__no_priority__',
        label: '未设置优先级'
      }
    );

    const statusOptions = normalizeStringOptions(
      [...statuses, ...tasks.map((task) => task?.status ?? '')],
      {
        key: '__no_status__',
        label: '未设置状态'
      }
    );

    return {
      stage: stageOptions,
      taskType: taskTypeOptions,
      priority: priorityOptions,
      status: statusOptions
    };
  }, [priorities, stages, statuses, taskTypes, tasks]);

  const [dimensionSelections, setDimensionSelections] = useState({});
  const [expandedDimensions, setExpandedDimensions] = useState(() => {
    const initial = {};
    GROUPING_FIELDS.forEach((field) => {
      initial[field.key] = true;
    });
    return initial;
  });

  useEffect(() => {
    setDimensionSelections((prev) => {
      let changed = false;
      const next = {};
      GROUPING_FIELDS.forEach((field) => {
        const options = dimensionValueOptions[field.key] || [];
        const optionKeys = options.map((option) => option.key);
        const prevEntry = prev[field.key];
        if (!prevEntry) {
          next[field.key] = {
            enabled: field.key === 'status',
            selectedValues: optionKeys,
            availableValues: optionKeys
          };
          changed = true;
          return;
        }

        const prevSelectedSet = new Set(Array.isArray(prevEntry.selectedValues) ? prevEntry.selectedValues : []);
        const previouslyAllSelected =
          prevEntry.selectedValues &&
          prevEntry.availableValues &&
          prevEntry.selectedValues.length > 0 &&
          prevEntry.availableValues.length > 0 &&
          prevEntry.availableValues.length === prevEntry.selectedValues.length &&
          prevEntry.availableValues.every((value) => prevSelectedSet.has(value));

        let selectedValues = optionKeys.filter((key) => prevSelectedSet.has(key));
        if (previouslyAllSelected) {
          selectedValues = optionKeys;
        }

        const enabled = typeof prevEntry.enabled === 'boolean' ? prevEntry.enabled : field.key === 'status';
        const nextEntry = {
          enabled,
          selectedValues,
          availableValues: optionKeys
        };

        next[field.key] = nextEntry;
        if (
          prevEntry.enabled !== nextEntry.enabled ||
          (prevEntry.availableValues || []).length !== nextEntry.availableValues.length ||
          (prevEntry.availableValues || []).some((value, index) => value !== nextEntry.availableValues[index]) ||
          prevEntry.selectedValues.length !== nextEntry.selectedValues.length ||
          prevEntry.selectedValues.some((value, index) => value !== nextEntry.selectedValues[index])
        ) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [dimensionValueOptions]);

  const dimensionSelectionState = useMemo(() => {
    const state = {};
    GROUPING_FIELDS.forEach((field) => {
      const entry = dimensionSelections[field.key];
      const options = dimensionValueOptions[field.key] || [];
      const optionKeys = options.map((option) => option.key);
      if (!entry) {
        state[field.key] = {
          enabled: field.key === 'status',
          selectedValues: optionKeys,
          availableValues: optionKeys
        };
      } else {
        state[field.key] = {
          enabled: entry.enabled,
          selectedValues: Array.isArray(entry.selectedValues) ? entry.selectedValues : [],
          availableValues: Array.isArray(entry.availableValues) ? entry.availableValues : optionKeys
        };
      }
    });
    return state;
  }, [dimensionSelections, dimensionValueOptions]);

  const updateDimensionSelection = useCallback(
    (dimensionKey, updater) => {
      setDimensionSelections((prev) => {
        const current = prev[dimensionKey] || {
          enabled: dimensionKey === 'status',
          selectedValues: (dimensionValueOptions[dimensionKey] || []).map((option) => option.key),
          availableValues: (dimensionValueOptions[dimensionKey] || []).map((option) => option.key)
        };

        const result = updater(current, dimensionValueOptions[dimensionKey] || []);
        const nextEntry = {
          ...current,
          ...result,
          availableValues: current.availableValues
        };

        const isSame =
          current.enabled === nextEntry.enabled &&
          current.selectedValues.length === nextEntry.selectedValues.length &&
          current.selectedValues.every((value, index) => value === nextEntry.selectedValues[index]);

        if (isSame) {
          return prev;
        }

        return {
          ...prev,
          [dimensionKey]: nextEntry
        };
      });
    },
    [dimensionValueOptions]
  );

  const handleDimensionToggle = useCallback(
    (dimensionKey, enabled) => {
      updateDimensionSelection(dimensionKey, (current) => ({
        ...current,
        enabled
      }));
    },
    [updateDimensionSelection]
  );

  const handleDimensionSelectAll = useCallback(
    (dimensionKey, checked) => {
      const availableValues =
        dimensionSelectionState[dimensionKey]?.availableValues ||
        (dimensionValueOptions[dimensionKey] || []).map((option) => option.key);
      updateDimensionSelection(dimensionKey, (current) => ({
        ...current,
        selectedValues: checked ? availableValues : []
      }));
    },
    [dimensionSelectionState, dimensionValueOptions, updateDimensionSelection]
  );

  const handleDimensionValueToggle = useCallback(
    (dimensionKey, valueKey, checked) => {
      const options = dimensionValueOptions[dimensionKey] || [];
      updateDimensionSelection(dimensionKey, (current) => {
        const selectedSet = new Set(current.selectedValues);
        if (checked) {
          selectedSet.add(valueKey);
        } else {
          selectedSet.delete(valueKey);
        }
        const ordered = options.map((option) => option.key).filter((key) => selectedSet.has(key));
        return {
          ...current,
          selectedValues: ordered
        };
      });
    },
    [dimensionValueOptions, updateDimensionSelection]
  );

  const toggleDimensionExpansion = useCallback((dimensionKey) => {
    setExpandedDimensions((prev) => ({
      ...prev,
      [dimensionKey]: !prev[dimensionKey]
    }));
  }, []);

  const toggleModuleExpansion = useCallback(() => {
    setModulesExpanded((prev) => !prev);
  }, []);

  const handleModuleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedModuleIds(moduleOptions.map((option) => option.id));
      } else {
        setSelectedModuleIds([]);
      }
    },
    [moduleOptions]
  );

  const handleModuleToggle = useCallback(
    (moduleId, checked) => {
      setSelectedModuleIds((prev) => {
        const optionOrder = moduleOptions.map((option) => option.id);
        const selectedSet = new Set(prev);
        if (checked) {
          selectedSet.add(moduleId);
        } else {
          selectedSet.delete(moduleId);
        }
        return optionOrder.filter((id) => selectedSet.has(id));
      });
    },
    [moduleOptions]
  );

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

  const groupingFields = useMemo(() => {
    const active = GROUPING_FIELDS.filter((field) => dimensionSelectionState[field.key]?.enabled).map((field) => field.key);
    return active.length > 0 ? active : ['status'];
  }, [dimensionSelectionState]);

  const dimensionFilters = useMemo(() => {
    const filters = {};
    GROUPING_FIELDS.forEach((field) => {
      const entry = dimensionSelectionState[field.key];
      if (!entry || !entry.enabled) {
        return;
      }
      const availableLength = entry.availableValues?.length || 0;
      if (availableLength === 0) {
        return;
      }
      if (!Array.isArray(entry.selectedValues) || entry.selectedValues.length === 0) {
        filters[field.key] = new Set();
        return;
      }
      if (entry.selectedValues.length === availableLength) {
        return;
      }
      filters[field.key] = new Set(entry.selectedValues);
    });
    return filters;
  }, [dimensionSelectionState]);

  const filteredTasks = useMemo(() => {
    if (selectedModuleIds.length === 0) {
      return [];
    }
    const selectedSet = new Set(selectedModuleIds);
    return tasks.filter((task) => {
      if (!selectedSet.has(task.moduleId ?? UNASSIGNED_MODULE_KEY)) {
        return false;
      }
      for (const [fieldKey, allowedValues] of Object.entries(dimensionFilters)) {
        if (!(allowedValues instanceof Set)) {
          continue;
        }
        let valueKey;
        if (fieldKey === 'stage') {
          valueKey = task.stageId || '__no_stage__';
        } else if (fieldKey === 'taskType') {
          valueKey = task.taskTypeId || '__no_task_type__';
        } else if (fieldKey === 'priority') {
          valueKey = task.priority || '__no_priority__';
        } else if (fieldKey === 'status') {
          valueKey = task.status || '__no_status__';
        }
        if (allowedValues.size === 0) {
          return false;
        }
        if (!allowedValues.has(valueKey)) {
          return false;
        }
      }
      return true;
    });
  }, [dimensionFilters, selectedModuleIds, tasks]);

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
        <div className="dashboard-filter-tree">
          <div className="dashboard-tree-node">
            <div className="dashboard-tree-header">
              <button
                type="button"
                className="dashboard-tree-expander"
                onClick={toggleModuleExpansion}
                aria-expanded={modulesExpanded}
                aria-label={modulesExpanded ? '折叠模块选项' : '展开模块选项'}
              >
                {modulesExpanded ? '▾' : '▸'}
              </button>
              <span className="dashboard-tree-label">模块</span>
              <span className="dashboard-tree-count">
                {selectedModuleIds.length}/{moduleOptions.length}
              </span>
            </div>
            {modulesExpanded ? (
              <div className="dashboard-tree-children">
                <label className="dashboard-tree-child">
                  <IndeterminateCheckbox
                    type="checkbox"
                    checked={moduleOptions.length > 0 && selectedModuleIds.length === moduleOptions.length}
                    indeterminate={
                      moduleOptions.length > 0 &&
                      selectedModuleIds.length > 0 &&
                      selectedModuleIds.length < moduleOptions.length
                    }
                    onChange={(event) => handleModuleSelectAll(event.target.checked)}
                    disabled={moduleOptions.length === 0}
                  />
                  <span>全选</span>
                </label>
                {moduleOptions.map((option) => (
                  <label key={option.id} className="dashboard-tree-child">
                    <input
                      type="checkbox"
                      checked={selectedModuleIds.includes(option.id)}
                      onChange={(event) => handleModuleToggle(option.id, event.target.checked)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                {moduleOptions.length === 0 ? (
                  <div className="dashboard-tree-empty">暂无模块可筛选</div>
                ) : null}
              </div>
            ) : null}
          </div>

          {GROUPING_FIELDS.map((field) => {
              const selection = dimensionSelectionState[field.key];
              const options = dimensionValueOptions[field.key] || [];
              const expanded = expandedDimensions[field.key];
              const selectedCount = selection?.selectedValues?.length || 0;
              const totalCount = selection?.availableValues?.length || options.length;
              const partiallySelected =
                totalCount > 0 && selectedCount > 0 && selectedCount < totalCount;
              const allSelected = totalCount > 0 && selectedCount === totalCount;
              return (
                <div key={field.key} className="dashboard-tree-node">
                  <div className="dashboard-tree-header">
                    <button
                      type="button"
                      className="dashboard-tree-expander"
                      onClick={() => toggleDimensionExpansion(field.key)}
                      aria-expanded={expanded}
                      aria-label={expanded ? '折叠维度选项' : '展开维度选项'}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
                    <label className="dashboard-tree-parent">
                      <input
                        type="checkbox"
                        checked={Boolean(selection?.enabled)}
                        onChange={(event) => handleDimensionToggle(field.key, event.target.checked)}
                      />
                      <span>{field.label}</span>
                    </label>
                    <span className="dashboard-tree-count">
                      {selectedCount}/{totalCount || 0}
                    </span>
                  </div>
                  {expanded ? (
                    <div className="dashboard-tree-children">
                      <label className="dashboard-tree-child">
                        <IndeterminateCheckbox
                          type="checkbox"
                          checked={allSelected && totalCount > 0}
                          indeterminate={partiallySelected}
                          onChange={(event) => handleDimensionSelectAll(field.key, event.target.checked)}
                          disabled={totalCount === 0}
                        />
                        <span>全选</span>
                      </label>
                      {options.map((option) => (
                        <label key={option.key} className="dashboard-tree-child">
                          <input
                            type="checkbox"
                            checked={selection?.selectedValues?.includes(option.key)}
                            onChange={(event) =>
                              handleDimensionValueToggle(field.key, option.key, event.target.checked)
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                      {options.length === 0 ? (
                        <div className="dashboard-tree-empty">暂无可选值</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
        <p className="dashboard-filter-hint">未启用维度时将按状态统计</p>
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
