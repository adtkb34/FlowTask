import { useMemo, useState } from 'react';
import ModuleView from './components/ModuleView.jsx';

const PRIORITIES = ['低', '中', '高'];
const STATUSES = ['未开始', '进行中', '已完成'];

const createId = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const [stages, setStages] = useState([
    { id: 'stage-plan', name: '规划' },
    { id: 'stage-build', name: '开发' },
    { id: 'stage-review', name: '验收' }
  ]);

  const [taskTypes, setTaskTypes] = useState([
    { id: 'type-feature', name: '功能' },
    { id: 'type-bug', name: '缺陷修复' },
    { id: 'type-doc', name: '文档' }
  ]);

  const [workflows, setWorkflows] = useState([
    {
      id: 'workflow-default',
      name: '标准产品流程',
      stageIds: ['stage-plan', 'stage-build', 'stage-review'],
      taskTypeIds: ['type-feature', 'type-bug', 'type-doc']
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

  const [stageName, setStageName] = useState('');
  const [taskTypeName, setTaskTypeName] = useState('');
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    stageIds: ['stage-plan', 'stage-build'],
    taskTypeIds: ['type-feature']
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    workflowId: 'workflow-default'
  });

  const [moduleForm, setModuleForm] = useState({
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

  const handleCreateStage = (event) => {
    event.preventDefault();
    if (!stageName.trim()) return;
    const newStage = { id: `stage-${createId()}`, name: stageName.trim() };
    setStages((prev) => [...prev, newStage]);
    setStageName('');
  };

  const handleCreateTaskType = (event) => {
    event.preventDefault();
    if (!taskTypeName.trim()) return;
    const newTaskType = { id: `type-${createId()}`, name: taskTypeName.trim() };
    setTaskTypes((prev) => [...prev, newTaskType]);
    setTaskTypeName('');
  };

  const handleCreateWorkflow = (event) => {
    event.preventDefault();
    if (!workflowForm.name.trim() || workflowForm.stageIds.length === 0) return;
    const newWorkflow = {
      id: `workflow-${createId()}`,
      name: workflowForm.name.trim(),
      stageIds: workflowForm.stageIds,
      taskTypeIds: workflowForm.taskTypeIds
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    setWorkflowForm({ name: '', stageIds: [], taskTypeIds: [] });
  };

  const handleCreateProject = (event) => {
    event.preventDefault();
    if (!projectForm.name.trim() || !projectForm.workflowId) return;
    const newProject = {
      id: `project-${createId()}`,
      name: projectForm.name.trim(),
      workflowId: projectForm.workflowId
    };
    setProjects((prev) => [...prev, newProject]);
    setProjectForm({ name: '', workflowId: projectForm.workflowId });
    setSelectedProjectId(newProject.id);
  };

  const handleCreateModule = (event) => {
    event.preventDefault();
    if (!moduleForm.name.trim() || !moduleForm.projectId) return;
    const newModule = {
      id: `module-${createId()}`,
      projectId: moduleForm.projectId,
      name: moduleForm.name.trim(),
      workflowId: moduleForm.workflowId || null
    };
    setModules((prev) => [...prev, newModule]);
    setModuleForm({ ...moduleForm, name: '' });
    setSelectedProjectId(newModule.projectId);
    setSelectedModuleId(newModule.id);
  };

  const handleAddTask = (taskPayload) => {
    const newTask = {
      id: `task-${createId()}`,
      ...taskPayload
    };
    setTasks((prev) => [...prev, newTask]);
  };

  return (
    <div className="app-container">
      <h1>FlowTask 项目管理中心</h1>
      <div className="grid-layout">
        <div className="card">
          <h2>基础配置</h2>
          <div>
            <div className="section-title">创建阶段</div>
            <form onSubmit={handleCreateStage}>
              <input
                value={stageName}
                onChange={(event) => setStageName(event.target.value)}
                placeholder="阶段名称"
              />
              <button type="submit">添加阶段</button>
            </form>
            <ul className="entity-list">
              {stages.map((stage) => (
                <li key={stage.id} className="entity-item">
                  {stage.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="section-title">创建任务类型</div>
            <form onSubmit={handleCreateTaskType}>
              <input
                value={taskTypeName}
                onChange={(event) => setTaskTypeName(event.target.value)}
                placeholder="任务类型名称"
              />
              <button type="submit">添加任务类型</button>
            </form>
            <ul className="entity-list">
              {taskTypes.map((taskType) => (
                <li key={taskType.id} className="entity-item">
                  {taskType.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <h2>工作流管理</h2>
          <form onSubmit={handleCreateWorkflow}>
            <input
              value={workflowForm.name}
              onChange={(event) =>
                setWorkflowForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="工作流名称"
            />
            <label className="section-title">选择阶段</label>
            <select
              multiple
              value={workflowForm.stageIds}
              onChange={(event) =>
                setWorkflowForm((prev) => ({
                  ...prev,
                  stageIds: Array.from(event.target.selectedOptions, (option) => option.value)
                }))
              }
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <label className="section-title">选择任务类型</label>
            <select
              multiple
              value={workflowForm.taskTypeIds}
              onChange={(event) =>
                setWorkflowForm((prev) => ({
                  ...prev,
                  taskTypeIds: Array.from(event.target.selectedOptions, (option) => option.value)
                }))
              }
            >
              {taskTypes.map((taskType) => (
                <option key={taskType.id} value={taskType.id}>
                  {taskType.name}
                </option>
              ))}
            </select>
            <button type="submit">创建工作流</button>
          </form>

          <div className="section-title">现有工作流</div>
          <ul className="entity-list">
            {workflows.map((workflow) => (
              <li key={workflow.id} className="entity-item">
                <div>{workflow.name}</div>
                <div className="task-meta">
                  阶段：{workflow.stageIds
                    .map((stageId) => stages.find((stage) => stage.id === stageId)?.name)
                    .filter(Boolean)
                    .join(' / ')}
                </div>
                <div className="task-meta">
                  任务类型：{workflow.taskTypeIds
                    .map((typeId) => taskTypes.find((type) => type.id === typeId)?.name)
                    .filter(Boolean)
                    .join(' / ')}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>项目与模块</h2>
          <div className="section-title">创建项目</div>
          <form onSubmit={handleCreateProject}>
            <input
              value={projectForm.name}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="项目名称"
            />
            <select
              value={projectForm.workflowId}
              onChange={(event) =>
                setProjectForm((prev) => ({ ...prev, workflowId: event.target.value }))
              }
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
            <button type="submit">创建项目</button>
          </form>

          <div className="section-title">创建模块</div>
          <form onSubmit={handleCreateModule}>
            <select
              value={moduleForm.projectId}
              onChange={(event) => setModuleForm((prev) => ({ ...prev, projectId: event.target.value }))}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              value={moduleForm.name}
              onChange={(event) => setModuleForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="模块名称"
            />
            <select
              value={moduleForm.workflowId || ''}
              onChange={(event) =>
                setModuleForm((prev) => ({
                  ...prev,
                  workflowId: event.target.value === '' ? null : event.target.value
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
            <button type="submit">创建模块</button>
          </form>

          <div className="section-title">当前项目</div>
          <ul className="entity-list">
            {projects.map((project) => (
              <li key={project.id} className="entity-item">
                <div>{project.name}</div>
                <div className="task-meta">
                  工作流：{workflows.find((workflow) => workflow.id === project.workflowId)?.name || '未设置'}
                </div>
                <div className="task-meta">
                  模块：
                  {modules
                    .filter((module) => module.projectId === project.id)
                    .map((module) => module.name)
                    .join(' / ') || '暂无'}
                </div>
              </li>
            ))}
          </ul>
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
            onAddTask={handleAddTask}
            priorities={PRIORITIES}
            statuses={STATUSES}
          />
        ) : (
          <div className="empty-state">请选择模块查看任务看板。</div>
        )}
      </div>
    </div>
  );
}
