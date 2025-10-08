import { useEffect, useMemo, useState } from 'react';

const createDraft = ({ defaultTaskTypeId, defaultPriority, defaultStatus }) => ({
  name: '',
  description: '',
  taskTypeId: defaultTaskTypeId || '',
  priority: defaultPriority,
  status: defaultStatus,
  startDate: '',
  endDate: ''
});

const TaskTree = ({
  task,
  tasks,
  taskTypesMap,
  priorities,
  statuses,
  workflowTaskTypes,
  subtaskDrafts,
  onToggleSubtask,
  onUpdateSubtaskDraft,
  onSubmitSubtask
}) => {
  const subtasks = tasks.filter((item) => item.parentTaskId === task.id);
  const draftState = subtaskDrafts[task.id];
  const draft = draftState?.form;

  return (
    <div className="task-card">
      <div className="task-meta">
        <span className="badge">{taskTypesMap.get(task.taskTypeId)?.name || '未分类'}</span>
        <span>优先级：{task.priority}</span>
        <span>状态：{task.status}</span>
        {task.startDate && <span>开始：{task.startDate}</span>}
        {task.endDate && <span>结束：{task.endDate}</span>}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{task.name}</div>
      {task.description && <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{task.description}</div>}
      <div className="task-actions">
        <button type="button" onClick={() => onToggleSubtask(task.id)}>
          {draftState?.open ? '关闭子任务表单' : '添加子任务'}
        </button>
      </div>

      {draftState?.open && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitSubtask(task.id);
          }}
        >
          <input
            value={draft?.name || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'name', event.target.value)}
            placeholder="子任务名称"
          />
          <select
            value={draft?.taskTypeId || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'taskTypeId', event.target.value)}
          >
            <option value="" disabled>
              选择任务类型
            </option>
            {workflowTaskTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={draft?.priority || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'priority', event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <select
            value={draft?.status || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'status', event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={draft?.startDate || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'startDate', event.target.value)}
          />
          <input
            type="date"
            value={draft?.endDate || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'endDate', event.target.value)}
          />
          <textarea
            rows={2}
            value={draft?.description || ''}
            onChange={(event) => onUpdateSubtaskDraft(task.id, 'description', event.target.value)}
            placeholder="子任务描述"
          />
          <button type="submit">保存子任务</button>
        </form>
      )}

      {subtasks.length > 0 && (
        <div className="subtask-container">
          {subtasks.map((subtask) => (
            <TaskTree
              key={subtask.id}
              task={subtask}
              tasks={tasks}
              taskTypesMap={taskTypesMap}
              priorities={priorities}
              statuses={statuses}
              workflowTaskTypes={workflowTaskTypes}
              subtaskDrafts={subtaskDrafts}
              onToggleSubtask={onToggleSubtask}
              onUpdateSubtaskDraft={onUpdateSubtaskDraft}
              onSubmitSubtask={onSubmitSubtask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ModuleView = ({
  module,
  project,
  workflow,
  stages,
  taskTypes,
  tasks,
  onAddTask,
  priorities,
  statuses
}) => {
  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const taskTypesMap = useMemo(
    () => new Map(taskTypes.map((taskType) => [taskType.id, taskType])),
    [taskTypes]
  );

  const workflowStages = workflow.stageIds
    .map((stageId) => stageMap.get(stageId))
    .filter(Boolean);
  const workflowTaskTypes = workflow.taskTypeIds
    .map((typeId) => taskTypesMap.get(typeId))
    .filter(Boolean);

  const defaultTaskTypeId = workflowTaskTypes[0]?.id || '';
  const defaultPriority = priorities[Math.floor(priorities.length / 2)] || '';
  const defaultStatus = statuses[0] || '';

  const [stageDrafts, setStageDrafts] = useState({});
  const [subtaskDrafts, setSubtaskDrafts] = useState({});

  useEffect(() => {
    setStageDrafts((prev) => {
      const next = { ...prev };
      workflow.stageIds.forEach((stageId) => {
        if (!next[stageId]) {
          next[stageId] = createDraft({
            defaultTaskTypeId,
            defaultPriority,
            defaultStatus
          });
        }
      });
      Object.keys(next).forEach((stageId) => {
        if (!workflow.stageIds.includes(stageId)) {
          delete next[stageId];
        }
      });
      return next;
    });
  }, [workflow.stageIds, defaultTaskTypeId, defaultPriority, defaultStatus]);

  useEffect(() => {
    setSubtaskDrafts({});
  }, [module.id, workflow.id]);

  const updateStageDraft = (stageId, field, value) => {
    setStageDrafts((prev) => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [field]: value
      }
    }));
  };

  const handleSubmitStageTask = (stageId, event) => {
    event.preventDefault();
    const draft = stageDrafts[stageId];
    if (!draft || !draft.name.trim()) return;
    const taskTypeId = draft.taskTypeId || defaultTaskTypeId;
    if (!taskTypeId) return;
    onAddTask({
      moduleId: module.id,
      stageId,
      taskTypeId,
      name: draft.name.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      parentTaskId: null
    });
    setStageDrafts((prev) => ({
      ...prev,
      [stageId]: createDraft({ defaultTaskTypeId, defaultPriority, defaultStatus })
    }));
  };

  const toggleSubtask = (taskId) => {
    setSubtaskDrafts((prev) => {
      const next = { ...prev };
      const current = next[taskId];
      if (!current) {
        next[taskId] = {
          open: true,
          form: createDraft({ defaultTaskTypeId, defaultPriority, defaultStatus })
        };
      } else {
        next[taskId] = { ...current, open: !current.open };
      }
      return next;
    });
  };

  const updateSubtaskDraft = (taskId, field, value) => {
    setSubtaskDrafts((prev) => {
      const current = prev[taskId] || {
        open: true,
        form: createDraft({ defaultTaskTypeId, defaultPriority, defaultStatus })
      };
      return {
        ...prev,
        [taskId]: {
          open: true,
          form: {
            ...current.form,
            [field]: value
          }
        }
      };
    });
  };

  const submitSubtask = (taskId) => {
    const draftState = subtaskDrafts[taskId];
    const draft = draftState?.form;
    if (!draft || !draft.name.trim()) return;
    const parentTask = tasks.find((task) => task.id === taskId);
    if (!parentTask) return;
    const taskTypeId = draft.taskTypeId || defaultTaskTypeId;
    if (!taskTypeId) return;
    onAddTask({
      moduleId: module.id,
      stageId: parentTask.stageId,
      taskTypeId,
      name: draft.name.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      parentTaskId: taskId
    });
    setSubtaskDrafts((prev) => ({
      ...prev,
      [taskId]: {
        open: true,
        form: createDraft({ defaultTaskTypeId, defaultPriority, defaultStatus })
      }
    }));
  };

  return (
    <div>
      <div className="task-meta" style={{ marginBottom: 8 }}>
        <span>所属项目：{project.name}</span>
        <span>模块：{module.name}</span>
        <span>工作流：{workflow.name}</span>
      </div>
      <div className="workflow-stage-grid">
        {workflowStages.map((stage) => {
          const stageTasks = tasks.filter(
            (task) => task.stageId === stage.id && task.parentTaskId === null
          );

          const draft = stageDrafts[stage.id] || createDraft({
            defaultTaskTypeId,
            defaultPriority,
            defaultStatus
          });

          return (
            <div key={stage.id} className="stage-column">
              <h3>{stage.name}</h3>
              <form className="inline-form" onSubmit={(event) => handleSubmitStageTask(stage.id, event)}>
                <input
                  value={draft.name}
                  onChange={(event) => updateStageDraft(stage.id, 'name', event.target.value)}
                  placeholder="任务名称"
                />
                <select
                  value={draft.taskTypeId}
                  onChange={(event) => updateStageDraft(stage.id, 'taskTypeId', event.target.value)}
                >
                  <option value="" disabled>
                    选择任务类型
                  </option>
                  {workflowTaskTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.priority}
                  onChange={(event) => updateStageDraft(stage.id, 'priority', event.target.value)}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.status}
                  onChange={(event) => updateStageDraft(stage.id, 'status', event.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => updateStageDraft(stage.id, 'startDate', event.target.value)}
                />
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => updateStageDraft(stage.id, 'endDate', event.target.value)}
                />
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(event) => updateStageDraft(stage.id, 'description', event.target.value)}
                  placeholder="任务描述"
                />
                <button type="submit">保存任务</button>
              </form>

              <div style={{ marginTop: 12 }}>
                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <TaskTree
                      key={task.id}
                      task={task}
                      tasks={tasks}
                      taskTypesMap={taskTypesMap}
                      priorities={priorities}
                      statuses={statuses}
                      workflowTaskTypes={workflowTaskTypes}
                      subtaskDrafts={subtaskDrafts}
                      onToggleSubtask={toggleSubtask}
                      onUpdateSubtaskDraft={updateSubtaskDraft}
                      onSubmitSubtask={submitSubtask}
                    />
                  ))
                ) : (
                  <div className="empty-state">暂无任务</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleView;
