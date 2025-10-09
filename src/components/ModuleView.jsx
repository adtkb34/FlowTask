import { Fragment, useEffect, useMemo, useState } from 'react';

const flattenTree = (nodes, depth = 0, accumulator = [], options = {}) => {
  const { includeTemplates = true } = options;
  nodes.forEach((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const nodeKind = typeof node.nodeKind === 'string' ? node.nodeKind : node.isTemplate ? 'template-task' : 'task';
    const isTemplate = nodeKind.startsWith('template');
    const shouldInclude = includeTemplates || !isTemplate;
    if (shouldInclude) {
      accumulator.push({ node, depth, isTemplate, nodeKind });
      if (children.length > 0) {
        flattenTree(children, depth + 1, accumulator, options);
      }
      return;
    }

    if (children.length > 0) {
      flattenTree(children, depth, accumulator, options);
    }
  });
  return accumulator;
};

const ModuleView = ({
  module,
  project,
  workflow,
  stages,
  taskTypes,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  priorities,
  statuses
}) => {
  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const stageRemarkMap = useMemo(() => {
    const map = new Map();
    stages.forEach((stage) => {
      if (!stage || !Array.isArray(stage.tasks)) {
        if (stage?.id) {
          map.set(stage.id, '');
        }
        return;
      }

      const remarkParts = stage.tasks
        .map((task) => {
          const taskName = typeof task?.name === 'string' ? task.name.trim() : '';
          if (!taskName) {
            return null;
          }
          const subtaskNames = Array.isArray(task.subtasks)
            ? task.subtasks
                .map((subtask) => (typeof subtask?.name === 'string' ? subtask.name.trim() : ''))
                .filter((name) => Boolean(name))
            : [];
          if (subtaskNames.length > 0) {
            return `${taskName}（${subtaskNames.join('、')}）`;
          }
          return taskName;
        })
        .filter(Boolean);

      const remark = remarkParts.length > 0 ? `阶段任务：${remarkParts.join('；')}` : '';
      if (stage.id) {
        map.set(stage.id, remark);
      }
    });
    return map;
  }, [stages]);
  const { stageRoots: taskTreeByStage, stageTaskChildren } = useMemo(() => {
    const nodes = new Map();
    tasks.forEach((task) => {
      nodes.set(task.id, { ...task, children: [], nodeKind: 'task' });
    });

    tasks.forEach((task) => {
      if (task.parentTaskId && nodes.has(task.parentTaskId) && nodes.has(task.id)) {
        nodes.get(task.parentTaskId).children.push(nodes.get(task.id));
      }
    });

    const stageRoots = new Map();
    const stageTaskChildrenMap = new Map();

    tasks.forEach((task) => {
      const node = nodes.get(task.id);
      if (!node) return;

      if (task.parentTaskId && nodes.has(task.parentTaskId)) {
        return;
      }

      if (task.parentStageTaskId) {
        if (!stageTaskChildrenMap.has(task.parentStageTaskId)) {
          stageTaskChildrenMap.set(task.parentStageTaskId, []);
        }
        stageTaskChildrenMap.get(task.parentStageTaskId).push(node);
        return;
      }

      if (!stageRoots.has(task.stageId)) {
        stageRoots.set(task.stageId, []);
      }
      stageRoots.get(task.stageId).push(node);
    });

    return { stageRoots, stageTaskChildren: stageTaskChildrenMap };
  }, [tasks]);

  const stageTemplateMap = useMemo(() => {
    const map = new Map();
    stages.forEach((stage) => {
      const templates = [...(stage.tasks || [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((task) => {
          const templateSubtasks = [...(task.subtasks || [])]
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((subtask) => ({
              id: subtask.id,
              stageId: stage.id,
              name: subtask.name,
              taskTypeId: null,
              priority: '',
              status: '',
              startDate: '',
              endDate: '',
              description: '',
              children: [],
              isTemplate: true,
              nodeKind: 'template-subtask'
            }));
          const actualChildren = stageTaskChildren.get(task.id) || [];
          return {
            id: task.id,
            stageId: stage.id,
            name: task.name,
            taskTypeId: null,
            priority: '',
            status: '',
            startDate: '',
            endDate: '',
            description: '',
            children: [...templateSubtasks, ...actualChildren],
            isTemplate: true,
            nodeKind: 'template-task'
          };
        });
      map.set(stage.id, templates);
    });
    return map;
  }, [stageTaskChildren, stages]);
  const taskTypesMap = useMemo(
    () => new Map(taskTypes.map((taskType) => [taskType.id, taskType])),
    [taskTypes]
  );
  const stageOrder = useMemo(() => [...(workflow.stageIds || [])], [workflow.stageIds]);
  const stageOptions = useMemo(() => {
    const ordered = [...stageOrder];
    const extras = stages
      .map((stage) => stage.id)
      .filter((stageId) => stageId && !ordered.includes(stageId));
    return [...ordered, ...extras];
  }, [stageOrder, stages]);
  const defaultPriority = useMemo(
    () => priorities[Math.floor(priorities.length / 2)] || '',
    [priorities]
  );
  const defaultStatus = useMemo(() => statuses[0] || '', [statuses]);

  const emptyForm = useMemo(
    () => ({
      stageId: stageOrder[0] || '',
      name: '',
      taskTypeId: '',
      priority: defaultPriority,
      status: defaultStatus,
      startDate: '',
      endDate: '',
      description: ''
    }),
    [stageOrder, defaultPriority, defaultStatus]
  );

  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'create',
    parentTaskId: null,
    parentStageTaskId: null,
    taskId: null,
    form: emptyForm
  });

  const parentTaskOptions = useMemo(() => {
    if (!dialogState.form.stageId) return [];
    const templateRoots = stageTemplateMap.get(dialogState.form.stageId) || [];
    const stageRoots = taskTreeByStage.get(dialogState.form.stageId) || [];
    return flattenTree([...templateRoots, ...stageRoots]);
  }, [dialogState.form.stageId, stageTemplateMap, taskTreeByStage]);

  useEffect(() => {
    setDialogState({
      open: false,
      mode: 'create',
      parentTaskId: null,
      parentStageTaskId: null,
      taskId: null,
      form: { ...emptyForm }
    });
  }, [emptyForm, module.id, workflow.id]);

  const stageGroups = useMemo(() => {
    const stageIdSet = new Set(stageOrder);
    const groups = stageOrder.map((stageId) => {
      const templateRows = flattenTree(stageTemplateMap.get(stageId) || [], 0, [], { includeTemplates: false });
      const actualRows = flattenTree(taskTreeByStage.get(stageId) || []);
      return {
        stageId,
        stage: stageMap.get(stageId),
        rows: [...actualRows, ...templateRows]
      };
    });

    const otherStageRoots = [];
    stageTemplateMap.forEach((templates, stageId) => {
      if (!stageIdSet.has(stageId)) {
        otherStageRoots.push(...templates);
      }
    });
    taskTreeByStage.forEach((roots, stageId) => {
      if (!stageIdSet.has(stageId)) {
        otherStageRoots.push(...roots);
      }
    });

    if (otherStageRoots.length > 0) {
      groups.push({
        stageId: 'others',
        stage: { id: 'others', name: '其他阶段' },
        rows: flattenTree(otherStageRoots, 0, [], { includeTemplates: false })
      });
    }

    return groups;
  }, [stageMap, stageOrder, stageTemplateMap, taskTreeByStage]);

  const openCreateTaskDialog = () => {
    setDialogState({
      open: true,
      mode: 'create',
      parentTaskId: null,
      parentStageTaskId: null,
      taskId: null,
      form: { ...emptyForm }
    });
  };

  const openCreateSubtaskDialog = (task) => {
    setDialogState({
      open: true,
      mode: 'create',
      parentTaskId: task.id,
      parentStageTaskId: null,
      taskId: null,
      form: {
        ...emptyForm,
        stageId: task.stageId,
        priority: task.priority || emptyForm.priority,
        status: task.status || emptyForm.status
      }
    });
  };

  const openEditTaskDialog = (task) => {
    setDialogState({
      open: true,
      mode: 'edit',
      parentTaskId: task.parentTaskId || null,
      parentStageTaskId: task.parentStageTaskId || null,
      taskId: task.id,
      form: {
        stageId: task.stageId,
        name: task.name,
        taskTypeId: task.taskTypeId || '',
        priority: task.priority || defaultPriority,
        status: task.status || defaultStatus,
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        description: task.description || ''
      }
    });
  };

  const updateDialogForm = (field, value) => {
    setDialogState((prev) => {
      const next = {
        ...prev,
        form: {
          ...prev.form,
          [field]: value
        }
      };
      if (field === 'stageId') {
        next.parentTaskId = null;
        next.parentStageTaskId = null;
      }
      return next;
    });
  };

  const closeDialog = () => {
    setDialogState({
      open: false,
      mode: 'create',
      parentTaskId: null,
      parentStageTaskId: null,
      taskId: null,
      form: { ...emptyForm }
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!dialogState.form.name.trim()) return;
    if (!dialogState.form.stageId) return;

    const normalizedTaskTypeId = dialogState.form.taskTypeId ? dialogState.form.taskTypeId : null;
    const payload = {
      moduleId: module.id,
      stageId: dialogState.form.stageId,
      taskTypeId: normalizedTaskTypeId,
      name: dialogState.form.name.trim(),
      description: dialogState.form.description.trim(),
      priority: dialogState.form.priority,
      status: dialogState.form.status,
      startDate: dialogState.form.startDate,
      endDate: dialogState.form.endDate,
      parentTaskId: dialogState.mode === 'create' ? dialogState.parentTaskId : null,
      parentStageTaskId:
        dialogState.mode === 'create' ? dialogState.parentStageTaskId : null
    };

    if (dialogState.mode === 'create') {
      onAddTask(payload);
    } else if (dialogState.mode === 'edit' && dialogState.taskId) {
      onUpdateTask(dialogState.taskId, {
        stageId: payload.stageId,
        taskTypeId: payload.taskTypeId,
        name: payload.name,
        description: payload.description,
        priority: payload.priority,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        parentTaskId: dialogState.parentTaskId,
        parentStageTaskId: dialogState.parentStageTaskId
      });
    }

    closeDialog();
  };

  const handleParentSelectionChange = (event) => {
    const { value } = event.target;
    setDialogState((prev) => {
      if (!value) {
        return { ...prev, parentTaskId: null, parentStageTaskId: null };
      }
      const [type, id] = value.split(':');
      if (type === 'task') {
        return { ...prev, parentTaskId: id, parentStageTaskId: null };
      }
      if (type === 'template-task') {
        return { ...prev, parentTaskId: null, parentStageTaskId: id };
      }
      return prev;
    });
  };

  const parentSelectionValue = dialogState.parentTaskId
    ? `task:${dialogState.parentTaskId}`
    : dialogState.parentStageTaskId
    ? `template-task:${dialogState.parentStageTaskId}`
    : '';

  return (
    <div>
      <div className="task-meta" style={{ marginBottom: 12 }}>
        <span>所属项目：{project.name}</span>
        <span>模块：{module.name}</span>
        <span>工作流：{workflow.name}</span>
      </div>

      <div className="module-toolbar">
        <button type="button" onClick={openCreateTaskDialog}>
          新增任务
        </button>
      </div>

      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th>任务</th>
              <th>阶段</th>
              <th>任务类型</th>
              <th>优先级</th>
              <th>状态</th>
              <th>开始日期</th>
              <th>结束日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {stageGroups.map((group) => {
              const stageRemark = group.stage ? stageRemarkMap.get(group.stage.id) : '';
              return (
                <Fragment key={group.stageId}>
                  <tr className="stage-header">
                    <td colSpan={8}>
                      <div className="stage-header-content">
                        <span className="stage-header-title">{group.stage?.name || '未命名阶段'}</span>
                        {stageRemark ? (
                          <span className="stage-header-remark">{stageRemark}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {group.rows.length > 0 ? (
                    <>
                      {group.rows.map(({ node, depth, isTemplate }) => (
                        <tr key={node.id} className={isTemplate ? 'template-task-row' : undefined}>
                        <td>
                          <div className="task-name-cell">
                            <div
                              className="task-name-title"
                              style={{ paddingLeft: depth * 16 }}
                            >
                              {node.name}
                              {isTemplate ? <span className="task-label">（阶段模板）</span> : null}
                            </div>
                            {node.description && (
                              <div
                                className="task-name-description"
                                style={{ paddingLeft: depth * 16 }}
                              >
                                {node.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{stageMap.get(node.stageId)?.name || '未指定'}</td>
                        <td>
                          {isTemplate
                            ? '--'
                            : node.taskTypeId
                            ? taskTypesMap.get(node.taskTypeId)?.name || '未指定'
                            : '未指定'}
                        </td>
                        <td>{isTemplate ? '--' : node.priority}</td>
                        <td>{isTemplate ? '--' : node.status}</td>
                        <td>{isTemplate ? '--' : node.startDate || '--'}</td>
                        <td>{isTemplate ? '--' : node.endDate || '--'}</td>
                        <td>
                          {isTemplate ? (
                            <span className="muted-text">阶段模板任务</span>
                          ) : (
                            <div className="task-actions">
                              <button type="button" onClick={() => openEditTaskDialog(node)}>
                                编辑
                              </button>
                              <button
                                type="button"
                                className="secondary-action"
                                onClick={() => openCreateSubtaskDialog(node)}
                              >
                                添加子任务
                              </button>
                              <button
                                type="button"
                                className="danger-action"
                                onClick={() => {
                                  if (window.confirm('确定要删除该任务及其子任务吗？')) {
                                    onDeleteTask(node.id);
                                  }
                                }}
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr className="empty-row">
                    <td colSpan={8}>该阶段暂未创建任务</td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialogState.open && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>
              {dialogState.mode === 'create'
                ? dialogState.parentTaskId || dialogState.parentStageTaskId
                  ? '添加子任务'
                  : '新增任务'
                : '编辑任务'}
            </h3>
            <form onSubmit={handleSubmit} className="dialog-form">
              <div className="dialog-grid">
                <label className="dialog-field">
                  <span>所属阶段</span>
                  <select
                    value={dialogState.form.stageId}
                    onChange={(event) => updateDialogForm('stageId', event.target.value)}
                    disabled={
                      dialogState.mode === 'create' &&
                      (dialogState.parentTaskId !== null || dialogState.parentStageTaskId !== null)
                    }
                  >
                    <option value="" disabled>
                      选择阶段
                    </option>
                    {stageOptions.map((stageId) => (
                      <option key={stageId} value={stageId}>
                        {stageMap.get(stageId)?.name || '未命名阶段'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>父任务（可选）</span>
                  <select
                    value={parentSelectionValue}
                    onChange={handleParentSelectionChange}
                    disabled={dialogState.mode === 'edit'}
                  >
                    <option value="">不选择父任务</option>
                    {parentTaskOptions.map(({ node, depth, isTemplate, nodeKind }) => {
                      const indent = depth > 0 ? `${'　'.repeat(depth)}└ ` : '';
                      const optionValue =
                        nodeKind === 'task'
                          ? `task:${node.id}`
                          : nodeKind === 'template-task'
                          ? `template-task:${node.id}`
                          : `template-subtask:${node.id}`;
                      return (
                        <option
                          key={`${nodeKind}:${node.id}`}
                          value={optionValue}
                          disabled={nodeKind === 'template-subtask'}
                        >
                          {`${indent}${node.name}${isTemplate ? '（阶段模板）' : ''}`}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>任务名称</span>
                  <input
                    value={dialogState.form.name}
                    onChange={(event) => updateDialogForm('name', event.target.value)}
                    placeholder="请输入任务名称"
                  />
                </label>
                <label className="dialog-field">
                  <span>任务类型</span>
                  <select
                    value={dialogState.form.taskTypeId}
                    onChange={(event) => updateDialogForm('taskTypeId', event.target.value)}
                  >
                    <option value="">不指定任务类型</option>
                    {taskTypes.map((taskType) => (
                      <option key={taskType.id} value={taskType.id}>
                        {taskType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>优先级</span>
                  <select
                    value={dialogState.form.priority}
                    onChange={(event) => updateDialogForm('priority', event.target.value)}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>状态</span>
                  <select
                    value={dialogState.form.status}
                    onChange={(event) => updateDialogForm('status', event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>开始日期</span>
                  <input
                    type="date"
                    value={dialogState.form.startDate}
                    onChange={(event) => updateDialogForm('startDate', event.target.value)}
                  />
                </label>
                <label className="dialog-field">
                  <span>结束日期</span>
                  <input
                    type="date"
                    value={dialogState.form.endDate}
                    onChange={(event) => updateDialogForm('endDate', event.target.value)}
                  />
                </label>
                <label className="dialog-field dialog-field-full">
                  <span>任务描述</span>
                  <textarea
                    value={dialogState.form.description}
                    onChange={(event) => updateDialogForm('description', event.target.value)}
                    placeholder="补充任务描述"
                  />
                </label>
              </div>
              <div className="dialog-actions">
                <button type="button" className="secondary" onClick={closeDialog}>
                  取消
                </button>
                <button type="submit">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleView;
