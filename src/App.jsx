import { useCallback, useEffect, useMemo, useState } from 'react';
import ModuleView from './components/ModuleView.jsx';
import Modal from './components/Modal.jsx';

const PRIORITIES = ['低', '中', '高'];
const STATUSES = ['未开始', '进行中', '已完成'];

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const payload = await response.json();
      if (payload && typeof payload.error === 'string') {
        message = payload.error;
      }
    } catch (error) {
      // ignore json parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export default function App() {
  const [stages, setStages] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stageModalState, setStageModalState] = useState({
    open: false,
    mode: 'create',
    stageId: null,
    name: ''
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
    stageIds: []
  });
  const [projectModalState, setProjectModalState] = useState({
    open: false,
    mode: 'create',
    projectId: null,
    name: '',
    workflowId: ''
  });
  const [moduleModalState, setModuleModalState] = useState({
    open: false,
    mode: 'create',
    moduleId: null,
    projectId: '',
    name: '',
    workflowId: ''
  });

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const loadData = useCallback(
    async ({ projectId: overrideProjectId, moduleId: overrideModuleId } = {}) => {
      try {
        setLoading(true);
        setError(null);
        const data = await requestJson('/api/initial-data');
        setStages(data.stages || []);
        setTaskTypes(data.taskTypes || []);
        setWorkflows(data.workflows || []);
        setProjects(data.projects || []);
        setModules(data.modules || []);
        setTasks(data.tasks || []);

        let nextProjectId = overrideProjectId ?? selectedProjectId;
        if (!data.projects.some((project) => project.id === nextProjectId)) {
          nextProjectId = data.projects[0]?.id || '';
        }

        let nextModuleId = overrideModuleId ?? selectedModuleId;
        if (!data.modules.some((module) => module.id === nextModuleId)) {
          const projectScopedModule = data.modules.find((module) => module.projectId === nextProjectId);
          nextModuleId = projectScopedModule?.id || data.modules[0]?.id || '';
        }

        setSelectedProjectId(nextProjectId);
        setSelectedModuleId(nextModuleId);

        setProjectModalState((prev) => {
          const nextWorkflowId = prev.workflowId && data.workflows.some((workflow) => workflow.id === prev.workflowId)
            ? prev.workflowId
            : data.workflows[0]?.id || '';
          return { ...prev, workflowId: nextWorkflowId };
        });
        setModuleModalState((prev) => {
          const nextProjectForModal = prev.projectId && data.projects.some((project) => project.id === prev.projectId)
            ? prev.projectId
            : nextProjectId || data.projects[0]?.id || '';
          const nextWorkflowForModal = prev.workflowId && data.workflows.some((workflow) => workflow.id === prev.workflowId)
            ? prev.workflowId
            : data.workflows[0]?.id || '';
          return {
            ...prev,
            projectId: nextProjectForModal,
            workflowId: nextWorkflowForModal
          };
        });
        setWorkflowModalState((prev) => {
          const validStageIds = prev.stageIds.filter((id) => data.stages.some((stage) => stage.id === id));
          const fallbackStageIds = validStageIds.length > 0
            ? validStageIds
            : data.stages.slice(0, 2).map((stage) => stage.id);
          return { ...prev, stageIds: fallbackStageIds };
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [selectedModuleId, selectedProjectId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const closeStageModal = () => {
    setStageModalState({ open: false, mode: 'create', stageId: null, name: '' });
  };

  const openCreateStageModal = () => {
    setStageModalState({ open: true, mode: 'create', stageId: null, name: '' });
  };

  const openEditStageModal = (stageId) => {
    const targetStage = stages.find((stage) => stage.id === stageId);
    setStageModalState({
      open: true,
      mode: 'edit',
      stageId,
      name: targetStage?.name || ''
    });
  };

  const handleSaveStageModal = async () => {
    const trimmedName = stageModalState.name.trim();
    if (!trimmedName) return;
    try {
      if (stageModalState.mode === 'create') {
        await requestJson('/api/stages', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName })
        });
      } else if (stageModalState.stageId) {
        await requestJson(`/api/stages/${stageModalState.stageId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmedName })
        });
      }
      await loadData();
      closeStageModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存阶段失败');
    }
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

  const handleSaveTaskTypeModal = async () => {
    const trimmedName = taskTypeModalState.name.trim();
    if (!trimmedName) return;
    try {
      if (taskTypeModalState.mode === 'create') {
        await requestJson('/api/task-types', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName })
        });
      } else if (taskTypeModalState.taskTypeId) {
        await requestJson(`/api/task-types/${taskTypeModalState.taskTypeId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmedName })
        });
      }
      await loadData();
      closeTaskTypeModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存任务类型失败');
    }
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

  const handleSaveWorkflowModal = async () => {
    const trimmedName = workflowModalState.name.trim();
    if (!trimmedName || workflowModalState.stageIds.length === 0) return;
    try {
      if (workflowModalState.mode === 'create') {
        await requestJson('/api/workflows', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName, stageIds: workflowModalState.stageIds })
        });
      } else if (workflowModalState.workflowId) {
        await requestJson(`/api/workflows/${workflowModalState.workflowId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmedName, stageIds: workflowModalState.stageIds })
        });
      }
      await loadData();
      closeWorkflowModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存工作流失败');
    }
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

  const handleSaveProjectModal = async () => {
    const trimmedName = projectModalState.name.trim();
    if (!trimmedName || !projectModalState.workflowId) return;
    try {
      if (projectModalState.mode === 'create') {
        const created = await requestJson('/api/projects', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName, workflowId: projectModalState.workflowId })
        });
        await loadData({ projectId: created.id });
      } else if (projectModalState.projectId) {
        await requestJson(`/api/projects/${projectModalState.projectId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmedName, workflowId: projectModalState.workflowId })
        });
        await loadData({ projectId: projectModalState.projectId });
      }
      closeProjectModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存项目失败');
    }
  };

  const closeModuleModal = () => {
    setModuleModalState({
      open: false,
      mode: 'create',
      moduleId: null,
      projectId: selectedProjectId || projects[0]?.id || '',
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

  const handleSaveModuleModal = async () => {
    const trimmedName = moduleModalState.name.trim();
    if (!trimmedName || !moduleModalState.projectId) return;
    try {
      if (moduleModalState.mode === 'create') {
        const created = await requestJson('/api/modules', {
          method: 'POST',
          body: JSON.stringify({
            name: trimmedName,
            projectId: moduleModalState.projectId,
            workflowId: moduleModalState.workflowId || null
          })
        });
        await loadData({ projectId: created.projectId, moduleId: created.id });
      } else if (moduleModalState.moduleId) {
        await requestJson(`/api/modules/${moduleModalState.moduleId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: trimmedName,
            projectId: moduleModalState.projectId,
            workflowId: moduleModalState.workflowId || null
          })
        });
        const nextSelection = moduleModalState.moduleId === selectedModuleId
          ? { projectId: moduleModalState.projectId, moduleId: moduleModalState.moduleId }
          : {};
        await loadData(nextSelection);
      }
      closeModuleModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存模块失败');
    }
  };

  const handleAddTask = async (taskPayload) => {
    try {
      const created = await requestJson('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskPayload)
      });
      const moduleInfo = modules.find((module) => module.id === created.moduleId);
      await loadData({ projectId: moduleInfo?.projectId, moduleId: created.moduleId });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '新增任务失败');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const targetTask = tasks.find((task) => task.id === taskId);
      await requestJson(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      const moduleInfo = targetTask ? modules.find((module) => module.id === targetTask.moduleId) : null;
      await loadData({ projectId: moduleInfo?.projectId, moduleId: targetTask?.moduleId });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新任务失败');
    }
  };

  const stageOptions = stages;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>研发流程管理</h1>
        {error ? <div className="error-banner">{error}</div> : null}
      </header>

      <main className="app-main">
        <div className="layout-grid">
          <div className="sidebar">
            <div className="card">
              <div className="card-header">
                <h2>阶段管理</h2>
                <button type="button" onClick={openCreateStageModal} disabled={loading}>
                  新建阶段
                </button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>阶段名称</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage) => (
                      <tr key={stage.id}>
                        <td>{stage.name}</td>
                        <td className="table-actions">
                          <button type="button" onClick={() => openEditStageModal(stage.id)} disabled={loading}>
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stages.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="empty-cell">
                          暂无阶段。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>任务类型</h2>
                <button type="button" onClick={openCreateTaskTypeModal} disabled={loading}>
                  新建类型
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
                          <button type="button" onClick={() => openEditTaskTypeModal(taskType.id)} disabled={loading}>
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
                <button type="button" onClick={openCreateWorkflowModal} disabled={loading}>
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
                          <button type="button" onClick={() => openEditWorkflowModal(workflow.id)} disabled={loading}>
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
                <button type="button" onClick={openCreateProjectModal} disabled={loading}>
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
                            <button type="button" onClick={() => openEditProjectModal(project.id)} disabled={loading}>
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
                <button type="button" onClick={openCreateModuleModal} disabled={loading}>
                  新建模块
                </button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>模块名称</th>
                      <th>所属项目</th>
                      <th>指定工作流</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((module) => (
                      <tr key={module.id} className={module.id === selectedModuleId ? 'active-row' : ''}>
                        <td>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                              setSelectedProjectId(module.projectId);
                              setSelectedModuleId(module.id);
                            }}
                            disabled={loading}
                          >
                            {module.name}
                          </button>
                        </td>
                        <td>{projects.find((project) => project.id === module.projectId)?.name || '未知项目'}</td>
                        <td>{module.workflowId ? workflows.find((workflow) => workflow.id === module.workflowId)?.name || '未设置' : '继承项目'}</td>
                        <td className="table-actions">
                          <button type="button" onClick={() => openEditModuleModal(module.id)} disabled={loading}>
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

          <div className="content">
            {loading && tasks.length === 0 ? (
              <div className="empty-panel">正在加载数据...</div>
            ) : null}
            {!loading && (!selectedModule || !selectedProject || !selectedWorkflow) ? (
              <div className="empty-panel">请先选择有效的项目、模块和工作流。</div>
            ) : null}
            {!loading && selectedModule && selectedProject && selectedWorkflow ? (
              <ModuleView
                module={selectedModule}
                project={selectedProject}
                workflow={selectedWorkflow}
                stages={stages}
                taskTypes={taskTypes}
                tasks={tasks.filter((task) => task.moduleId === selectedModule.id)}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                priorities={PRIORITIES}
                statuses={STATUSES}
              />
            ) : null}
          </div>
        </div>
      </main>

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
        <label className="form-field">
          <span>阶段名称</span>
          <input
            value={stageModalState.name}
            onChange={(event) => setStageModalState((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="请输入阶段名称"
          />
        </label>
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
        <label className="form-field">
          <span>类型名称</span>
          <input
            value={taskTypeModalState.name}
            onChange={(event) => setTaskTypeModalState((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="请输入类型名称"
          />
        </label>
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
        <label className="form-field">
          <span>工作流名称</span>
          <input
            value={workflowModalState.name}
            onChange={(event) => setWorkflowModalState((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="请输入工作流名称"
          />
        </label>
        <label className="form-field">
          <span>包含阶段</span>
          <div className="checkbox-group">
            {stageOptions.map((stage) => (
              <label key={stage.id}>
                <input
                  type="checkbox"
                  checked={workflowModalState.stageIds.includes(stage.id)}
                  onChange={(event) => {
                    setWorkflowModalState((prev) => {
                      if (event.target.checked) {
                        return { ...prev, stageIds: [...prev.stageIds, stage.id] };
                      }
                      return { ...prev, stageIds: prev.stageIds.filter((id) => id !== stage.id) };
                    });
                  }}
                />
                {stage.name}
              </label>
            ))}
            {stageOptions.length === 0 ? <div className="empty-cell">请先创建阶段</div> : null}
          </div>
        </label>
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
        <label className="form-field">
          <span>项目名称</span>
          <input
            value={projectModalState.name}
            onChange={(event) => setProjectModalState((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="请输入项目名称"
          />
        </label>
        <label className="form-field">
          <span>关联工作流</span>
          <select
            value={projectModalState.workflowId}
            onChange={(event) => setProjectModalState((prev) => ({ ...prev, workflowId: event.target.value }))}
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
        </label>
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
        <label className="form-field">
          <span>模块名称</span>
          <input
            value={moduleModalState.name}
            onChange={(event) => setModuleModalState((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="请输入模块名称"
          />
        </label>
        <label className="form-field">
          <span>所属项目</span>
          <select
            value={moduleModalState.projectId}
            onChange={(event) => setModuleModalState((prev) => ({ ...prev, projectId: event.target.value }))}
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
        </label>
        <label className="form-field">
          <span>指定工作流（可选）</span>
          <select
            value={moduleModalState.workflowId || ''}
            onChange={(event) =>
              setModuleModalState((prev) => ({ ...prev, workflowId: event.target.value || null }))
            }
          >
            <option value="">继承项目工作流</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </label>
      </Modal>
    </div>
  );
}
