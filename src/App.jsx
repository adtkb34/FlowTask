import { useMemo, useState } from 'react';
import ModuleView from './components/ModuleView.jsx';
import Modal from './components/Modal.jsx';

const PRIORITIES = ['低', '中', '高'];
const STATUSES = ['未开始', '进行中', '已完成'];

const createId = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const [stages, setStages] = useState([
    { id: 'stage-plan', name: '规划' },
    { id: 'stage-build', name: '开发' },
    { id: 'stage-review', name: '验收' }
  ]);

  const [stageTasks, setStageTasks] = useState({
    'stage-plan': [
      { id: 'stage-plan-task-1', name: '需求确认', taskTypeId: 'type-feature' },
      { id: 'stage-plan-task-2', name: '方案评审', taskTypeId: null }
    ],
    'stage-build': [{ id: 'stage-build-task-1', name: '开发排期', taskTypeId: 'type-feature' }],
    'stage-review': []
  });

  const [taskTypes, setTaskTypes] = useState([
    { id: 'type-feature', name: '功能' },
    { id: 'type-bug', name: '缺陷修复' },
    { id: 'type-doc', name: '文档' }
  ]);

  const [workflows, setWorkflows] = useState([
    {
      id: 'workflow-default',
      name: '标准产品流程',
      stageIds: ['stage-plan', 'stage-build', 'stage-review']
    }
  ]);

  const [projects, setProjects] = useState([
    { id: 'project-alpha', name: 'Alpha 项目', workflowId: 'workflow-default' }
  ]);

  const [modules, setModules] = useState([
    { id: 'module-alpha-core', projectId: 'project-alpha', name: '核心模块', workflowId: null },
    { id: 'module-alpha-mobile', projectId: 'project-alpha', name: '移动端', workflowId: 'workflow-default' }
  ]);

  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      moduleId: 'module-alpha-core',
      stageId: 'stage-plan',
      taskTypeId: 'type-feature',
      name: '需求梳理',
      description: '梳理 MVP 范围',
      priority: '高',
      status: '进行中',
      startDate: '2024-06-01',
      endDate: '2024-06-07',
      parentTaskId: null
    },
    {
      id: 'task-1-1',
      moduleId: 'module-alpha-core',
      stageId: 'stage-plan',
      taskTypeId: 'type-doc',
      name: 'PRD 草稿',
      description: '完成初版 PRD 文档',
      priority: '中',
      status: '未开始',
      startDate: '',
      endDate: '',
      parentTaskId: 'task-1'
    }
  ]);

  const [stageModalState, setStageModalState] = useState({
    open: false,
    mode: 'create',
    stageId: null
  });
  const [stageModalData, setStageModalData] = useState({ name: '', tasks: [] });
  const [stageModalTaskDraft, setStageModalTaskDraft] = useState({
    id: null,
    name: '',
    taskTypeId: ''
  });
  const [taskTypeModalState, setTaskTypeModalState] = useState({
    open: false,
    mode: 'create',
    taskTypeId: null,
    name: ''
  });
  const [workflowModalState, setWorkflowModalState] = useState({
    open: false,
    mode: 'create',
    workflowId: null,
    name: '',
    stageIds: ['stage-plan', 'stage-build']
  });
  const [projectModalState, setProjectModalState] = useState({
    open: false,
    mode: 'create',
    projectId: null,
    name: '',
    workflowId: 'workflow-default'
  });
  const [moduleModalState, setModuleModalState] = useState({
    open: false,
    mode: 'create',
    moduleId: null,
    projectId: 'project-alpha',
    name: '',
    workflowId: 'workflow-default'
  });

  const [selectedProjectId, setSelectedProjectId] = useState('project-alpha');
  const [selectedModuleId, setSelectedModuleId] = useState('module-alpha-core');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  const selectedWorkflow = useMemo(() => {
    if (!selectedModule || !selectedProject) return null;
    const workflowId = selectedModule.workflowId || selectedProject.workflowId;
    return workflows.find((workflow) => workflow.id === workflowId) || null;
  }, [selectedModule, selectedProject, workflows]);

  const resetStageModalTaskDraft = () => {
    setStageModalTaskDraft({ id: null, name: '', taskTypeId: '' });
  };

  const closeStageModal = () => {
    setStageModalState({ open: false, mode: 'create', stageId: null });
    setStageModalData({ name: '', tasks: [] });
    resetStageModalTaskDraft();
  };

  const openCreateStageModal = () => {
    setStageModalState({ open: true, mode: 'create', stageId: null });
    setStageModalData({ name: '', tasks: [] });
    resetStageModalTaskDraft();
  };

  const openEditStageModal = (stageId) => {
    const targetStage = stages.find((stage) => stage.id === stageId);
    setStageModalState({ open: true, mode: 'edit', stageId });
    setStageModalData({
      name: targetStage?.name || '',
      tasks: [...(stageTasks[stageId] || [])]
    });
    resetStageModalTaskDraft();
  };

  const handleStageTaskDraftSubmit = (event) => {
    event.preventDefault();
    const trimmedName = stageModalTaskDraft.name.trim();
    if (!trimmedName) return;
    setStageModalData((prev) => {
      if (stageModalTaskDraft.id) {
        return {
          ...prev,
          tasks: prev.tasks.map((task) =>
            task.id === stageModalTaskDraft.id
              ? { ...task, name: trimmedName, taskTypeId: stageModalTaskDraft.taskTypeId || null }
              : task
          )
        };
      }
      const newTask = {
        id: `stage-task-${createId()}`,
        name: trimmedName,
        taskTypeId: stageModalTaskDraft.taskTypeId || null
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
    resetStageModalTaskDraft();
  };

  const handleRemoveStageTask = (taskId) => {
    setStageModalData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId)
    }));
    setStageModalTaskDraft((draft) => (draft.id === taskId ? { id: null, name: '', taskTypeId: '' } : draft));
  };

  const handleSaveStageModal = () => {
    const trimmedName = stageModalData.name.trim();
    if (!trimmedName) return;

    if (stageModalState.mode === 'create') {
      const newStageId = `stage-${createId()}`;
      const newStage = { id: newStageId, name: trimmedName };
      setStages((prev) => [...prev, newStage]);
      setStageTasks((prev) => ({
        ...prev,
        [newStageId]: stageModalData.tasks.map((task) => ({
          ...task,
          id: task.id || `stage-task-${createId()}`,
          taskTypeId: task.taskTypeId || null
        }))
      }));
    } else if (stageModalState.stageId) {
      const { stageId } = stageModalState;
      setStages((prev) =>
        prev.map((stage) => (stage.id === stageId ? { ...stage, name: trimmedName } : stage))
      );
      setStageTasks((prev) => ({
        ...prev,
        [stageId]: stageModalData.tasks.map((task) => ({
          ...task,
          id: task.id || `stage-task-${createId()}`,
          taskTypeId: task.taskTypeId || null
        }))
      }));
    }

    closeStageModal();
  };

  const closeTaskTypeModal = () => {
    setTaskTypeModalState({ open: false, mode: 'create', taskTypeId: null, name: '' });
  };

  const openCreateTaskTypeModal = () => {
    setTaskTypeModalState({ open: true, mode: 'create', taskTypeId: null, name: '' });
  };

  const openEditTaskTypeModal = (taskTypeId) => {
    const target = taskTypes.find((taskType) => taskType.id === taskTypeId);
    setTaskTypeModalState({
      open: true,
      mode: 'edit',
      taskTypeId,
      name: target?.name || ''
    });
  };

  const handleSaveTaskTypeModal = () => {
    const trimmedName = taskTypeModalState.name.trim();
    if (!trimmedName) return;
    if (taskTypeModalState.mode === 'create') {
      const newTaskType = { id: `type-${createId()}`, name: trimmedName };
      setTaskTypes((prev) => [...prev, newTaskType]);
    } else if (taskTypeModalState.taskTypeId) {
      setTaskTypes((prev) =>
        prev.map((taskType) =>
          taskType.id === taskTypeModalState.taskTypeId ? { ...taskType, name: trimmedName } : taskType
        )
      );
    }
    closeTaskTypeModal();
  };

  const closeWorkflowModal = () => {
    setWorkflowModalState({ open: false, mode: 'create', workflowId: null, name: '', stageIds: [] });
  };

  const openCreateWorkflowModal = () => {
    setWorkflowModalState({
      open: true,
      mode: 'create',
      workflowId: null,
      name: '',
      stageIds: stages.map((stage) => stage.id).slice(0, 2)
    });
  };

  const openEditWorkflowModal = (workflowId) => {
    const workflow = workflows.find((item) => item.id === workflowId);
    setWorkflowModalState({
      open: true,
      mode: 'edit',
      workflowId,
      name: workflow?.name || '',
      stageIds: workflow?.stageIds || []
    });
  };

  const handleSaveWorkflowModal = () => {
    const trimmedName = workflowModalState.name.trim();
    if (!trimmedName || workflowModalState.stageIds.length === 0) return;

    if (workflowModalState.mode === 'create') {
      const newWorkflow = {
        id: `workflow-${createId()}`,
        name: trimmedName,
        stageIds: workflowModalState.stageIds
      };
      setWorkflows((prev) => [...prev, newWorkflow]);
    } else if (workflowModalState.workflowId) {
      setWorkflows((prev) =>
        prev.map((workflow) =>
          workflow.id === workflowModalState.workflowId
            ? { ...workflow, name: trimmedName, stageIds: workflowModalState.stageIds }
            : workflow
        )
      );
    }
    closeWorkflowModal();
  };

  const closeProjectModal = () => {
    setProjectModalState({
      open: false,
      mode: 'create',
      projectId: null,
      name: '',
      workflowId: workflows[0]?.id || ''
    });
  };

  const openCreateProjectModal = () => {
    setProjectModalState({
      open: true,
      mode: 'create',
      projectId: null,
      name: '',
      workflowId: workflows[0]?.id || ''
    });
  };

  const openEditProjectModal = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    setProjectModalState({
      open: true,
      mode: 'edit',
      projectId,
      name: project?.name || '',
      workflowId: project?.workflowId || workflows[0]?.id || ''
    });
  };

  const handleSaveProjectModal = () => {
    const trimmedName = projectModalState.name.trim();
    if (!trimmedName || !projectModalState.workflowId) return;

    if (projectModalState.mode === 'create') {
      const newProject = {
        id: `project-${createId()}`,
        name: trimmedName,
        workflowId: projectModalState.workflowId
      };
      setProjects((prev) => [...prev, newProject]);
      setSelectedProjectId(newProject.id);
    } else if (projectModalState.projectId) {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectModalState.projectId
            ? { ...project, name: trimmedName, workflowId: projectModalState.workflowId }
            : project
        )
      );
    }
    closeProjectModal();
  };

  const closeModuleModal = () => {
    setModuleModalState({
      open: false,
      mode: 'create',
      moduleId: null,
      projectId: projects[0]?.id || '',
      name: '',
      workflowId: workflows[0]?.id || ''
    });
  };

  const openCreateModuleModal = () => {
    setModuleModalState({
      open: true,
      mode: 'create',
      moduleId: null,
      projectId: selectedProjectId || projects[0]?.id || '',
      name: '',
      workflowId: workflows[0]?.id || ''
    });
  };

  const openEditModuleModal = (moduleId) => {
    const module = modules.find((item) => item.id === moduleId);
    setModuleModalState({
      open: true,
      mode: 'edit',
      moduleId,
      projectId: module?.projectId || selectedProjectId || projects[0]?.id || '',
      name: module?.name || '',
      workflowId: module?.workflowId || ''
    });
  };

  const handleSaveModuleModal = () => {
    const trimmedName = moduleModalState.name.trim();
    if (!trimmedName || !moduleModalState.projectId) return;

    if (moduleModalState.mode === 'create') {
      const newModule = {
        id: `module-${createId()}`,
        projectId: moduleModalState.projectId,
        name: trimmedName,
        workflowId: moduleModalState.workflowId || null
      };
      setModules((prev) => [...prev, newModule]);
      setSelectedProjectId(newModule.projectId);
      setSelectedModuleId(newModule.id);
    } else if (moduleModalState.moduleId) {
      const updatedModule = {
        projectId: moduleModalState.projectId,
        name: trimmedName,
        workflowId: moduleModalState.workflowId || null
      };
      setModules((prev) =>
        prev.map((module) =>
          module.id === moduleModalState.moduleId
            ? { ...module, ...updatedModule }
            : module
        )
      );
      if (selectedModuleId === moduleModalState.moduleId) {
        setSelectedProjectId(moduleModalState.projectId);
      }
    }
    closeModuleModal();
  };

  const handleAddTask = (taskPayload) => {
    const newTask = {
      id: `task-${createId()}`,
      ...taskPayload
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleUpdateTask = (taskId, updates) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...updates
            }
          : task
      )
    );
  };

  const taskTypesMap = useMemo(
    () => new Map(taskTypes.map((taskType) => [taskType.id, taskType])),
    [taskTypes]
  );

  return (
    <div className="app-container">
      <h1>FlowTask 项目管理中心</h1>
      <div className="grid-layout">
        <div className="card">
          <div className="card-header">
            <h2>基础配置</h2>
            <button type="button" onClick={openCreateStageModal}>
              新建阶段
            </button>
          </div>
          <div className="section-title">阶段列表</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>阶段名称</th>
                  <th>关联任务数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => {
                  const stageTaskList = stageTasks[stage.id] || [];
                  return (
                    <tr key={stage.id}>
                      <td>{stage.name}</td>
                      <td>{stageTaskList.length}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => openEditStageModal(stage.id)}>
                          编辑
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {stages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      暂无阶段，请先创建。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="section-header">
            <div className="section-title">任务类型</div>
            <button type="button" onClick={openCreateTaskTypeModal}>
              新建任务类型
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>类型名称</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {taskTypes.map((taskType) => (
                  <tr key={taskType.id}>
                    <td>{taskType.name}</td>
                    <td className="table-actions">
                      <button type="button" onClick={() => openEditTaskTypeModal(taskType.id)}>
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {taskTypes.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="empty-cell">
                      暂无任务类型。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>工作流管理</h2>
            <button type="button" onClick={openCreateWorkflowModal}>
              新建工作流
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>工作流名称</th>
                  <th>包含阶段</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <td>{workflow.name}</td>
                    <td>
                      {workflow.stageIds
                        .map((stageId) => stages.find((stage) => stage.id === stageId)?.name)
                        .filter(Boolean)
                        .join(' / ') || '未关联阶段'}
                    </td>
                    <td className="table-actions">
                      <button type="button" onClick={() => openEditWorkflowModal(workflow.id)}>
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {workflows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      暂无工作流。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>项目与模块</h2>
          </div>
          <div className="section-header">
            <div className="section-title">项目</div>
            <button type="button" onClick={openCreateProjectModal}>
              新建项目
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>关联工作流</th>
                  <th>包含模块</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const relatedModules = modules.filter((module) => module.projectId === project.id);
                  return (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{workflows.find((workflow) => workflow.id === project.workflowId)?.name || '未设置'}</td>
                      <td>{relatedModules.map((module) => module.name).join(' / ') || '暂无模块'}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => openEditProjectModal(project.id)}>
                          编辑
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      暂无项目。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="section-header">
            <div className="section-title">模块</div>
            <button type="button" onClick={openCreateModuleModal}>
              新建模块
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>模块名称</th>
                  <th>所属项目</th>
                  <th>使用工作流</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr key={module.id}>
                    <td>{module.name}</td>
                    <td>{projects.find((project) => project.id === module.projectId)?.name || '未关联项目'}</td>
                    <td>
                      {module.workflowId
                        ? workflows.find((workflow) => workflow.id === module.workflowId)?.name || '未设置'
                        : '使用项目默认工作流'}
                    </td>
                    <td className="table-actions">
                      <button type="button" onClick={() => openEditModuleModal(module.id)}>
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {modules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      暂无模块。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>模块工作台</h2>
        <div className="module-selector">
          <select
            value={selectedProjectId}
            onChange={(event) => {
              setSelectedProjectId(event.target.value);
              const targetProject = projects.find((project) => project.id === event.target.value);
              const firstModule = modules.find((module) => module.projectId === targetProject?.id);
              setSelectedModuleId(firstModule?.id || '');
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={selectedModuleId || ''}
            onChange={(event) => setSelectedModuleId(event.target.value)}
          >
            <option value="" disabled>
              请选择模块
            </option>
            {modules
              .filter((module) => module.projectId === selectedProjectId)
              .map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
          </select>
        </div>

        {selectedModule && selectedProject && selectedWorkflow ? (
          <ModuleView
            module={selectedModule}
            project={selectedProject}
            workflow={selectedWorkflow}
            stages={stages}
            taskTypes={taskTypes}
            tasks={tasks.filter((task) => task.moduleId === selectedModule.id)}
            stageTemplates={stageTasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            priorities={PRIORITIES}
            statuses={STATUSES}
          />
        ) : (
          <div className="empty-state">请选择模块查看任务看板。</div>
        )}
      </div>

      <Modal
        isOpen={stageModalState.open}
        title={stageModalState.mode === 'create' ? '新建阶段' : '编辑阶段'}
        onClose={closeStageModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeStageModal}>
              取消
            </button>
            <button type="button" onClick={handleSaveStageModal}>
              保存
            </button>
          </>
        }
      >
        <div className="form-item">
          <label>阶段名称</label>
          <input
            value={stageModalData.name}
            onChange={(event) =>
              setStageModalData((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="请输入阶段名称"
          />
        </div>

        <div className="form-item">
          <label>阶段任务</label>
          <form className="stage-task-modal-form" onSubmit={handleStageTaskDraftSubmit}>
            <input
              value={stageModalTaskDraft.name}
              onChange={(event) =>
                setStageModalTaskDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="任务名称"
            />
            <select
              value={stageModalTaskDraft.taskTypeId}
              onChange={(event) =>
                setStageModalTaskDraft((prev) => ({ ...prev, taskTypeId: event.target.value }))
              }
            >
              <option value="">不指定任务类型</option>
              {taskTypes.map((taskType) => (
                <option key={taskType.id} value={taskType.id}>
                  {taskType.name}
                </option>
              ))}
            </select>
            <button type="submit">
              {stageModalTaskDraft.id ? '更新任务' : '添加任务'}
            </button>
            {stageModalTaskDraft.id ? (
              <button
                type="button"
                className="secondary"
                onClick={resetStageModalTaskDraft}
              >
                取消编辑
              </button>
            ) : null}
          </form>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>类型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {stageModalData.tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.name}</td>
                  <td>{task.taskTypeId ? taskTypesMap.get(task.taskTypeId)?.name || '未指定' : '未指定'}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setStageModalTaskDraft({
                          id: task.id,
                          name: task.name,
                          taskTypeId: task.taskTypeId || ''
                        })
                      }
                    >
                      编辑
                    </button>
                    <button type="button" className="danger" onClick={() => handleRemoveStageTask(task.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {stageModalData.tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-cell">
                    暂无任务。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        isOpen={taskTypeModalState.open}
        title={taskTypeModalState.mode === 'create' ? '新建任务类型' : '编辑任务类型'}
        onClose={closeTaskTypeModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeTaskTypeModal}>
              取消
            </button>
            <button type="button" onClick={handleSaveTaskTypeModal}>
              保存
            </button>
          </>
        }
      >
        <div className="form-item">
          <label>类型名称</label>
          <input
            value={taskTypeModalState.name}
            onChange={(event) =>
              setTaskTypeModalState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="请输入任务类型名称"
          />
        </div>
      </Modal>

      <Modal
        isOpen={workflowModalState.open}
        title={workflowModalState.mode === 'create' ? '新建工作流' : '编辑工作流'}
        onClose={closeWorkflowModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeWorkflowModal}>
              取消
            </button>
            <button type="button" onClick={handleSaveWorkflowModal}>
              保存
            </button>
          </>
        }
      >
        <div className="form-item">
          <label>工作流名称</label>
          <input
            value={workflowModalState.name}
            onChange={(event) =>
              setWorkflowModalState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="请输入工作流名称"
          />
        </div>
        <div className="form-item">
          <label>选择阶段</label>
          <div className="checkbox-group">
            {stages.map((stage) => {
              const checked = workflowModalState.stageIds.includes(stage.id);
              return (
                <label key={stage.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const { checked } = event.target;
                      setWorkflowModalState((prev) => ({
                        ...prev,
                        stageIds: checked
                          ? [...prev.stageIds, stage.id]
                          : prev.stageIds.filter((id) => id !== stage.id)
                      }));
                    }}
                  />
                  {stage.name}
                </label>
              );
            })}
            {stages.length === 0 ? <div className="empty-inline">暂无阶段可选。</div> : null}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={projectModalState.open}
        title={projectModalState.mode === 'create' ? '新建项目' : '编辑项目'}
        onClose={closeProjectModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeProjectModal}>
              取消
            </button>
            <button type="button" onClick={handleSaveProjectModal}>
              保存
            </button>
          </>
        }
      >
        <div className="form-item">
          <label>项目名称</label>
          <input
            value={projectModalState.name}
            onChange={(event) =>
              setProjectModalState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="请输入项目名称"
          />
        </div>
        <div className="form-item">
          <label>关联工作流</label>
          <select
            value={projectModalState.workflowId}
            onChange={(event) =>
              setProjectModalState((prev) => ({ ...prev, workflowId: event.target.value }))
            }
          >
            <option value="" disabled>
              请选择工作流
            </option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      <Modal
        isOpen={moduleModalState.open}
        title={moduleModalState.mode === 'create' ? '新建模块' : '编辑模块'}
        onClose={closeModuleModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeModuleModal}>
              取消
            </button>
            <button type="button" onClick={handleSaveModuleModal}>
              保存
            </button>
          </>
        }
      >
        <div className="form-item">
          <label>模块名称</label>
          <input
            value={moduleModalState.name}
            onChange={(event) =>
              setModuleModalState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="请输入模块名称"
          />
        </div>
        <div className="form-item">
          <label>所属项目</label>
          <select
            value={moduleModalState.projectId}
            onChange={(event) =>
              setModuleModalState((prev) => ({ ...prev, projectId: event.target.value }))
            }
          >
            <option value="" disabled>
              请选择项目
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-item">
          <label>关联工作流</label>
          <select
            value={moduleModalState.workflowId || ''}
            onChange={(event) =>
              setModuleModalState((prev) => ({
                ...prev,
                workflowId: event.target.value === '' ? '' : event.target.value
              }))
            }
          >
            <option value="">使用项目默认工作流</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
