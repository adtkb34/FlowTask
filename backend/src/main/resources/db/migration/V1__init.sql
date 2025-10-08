CREATE TABLE stages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_types (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflows (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_stages (
    workflow_id VARCHAR(64) NOT NULL,
    stage_id VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL,
    PRIMARY KEY (workflow_id, sort_order),
    CONSTRAINT fk_workflow_stage_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_stage_stage FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
);

CREATE TABLE projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    workflow_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE modules (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    workflow_id VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_module_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_module_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE tasks (
    id VARCHAR(64) PRIMARY KEY,
    module_id VARCHAR(64) NOT NULL,
    stage_id VARCHAR(64) NOT NULL,
    task_type_id VARCHAR(64),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_date DATE,
    end_date DATE,
    parent_task_id VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_stage FOREIGN KEY (stage_id) REFERENCES stages(id),
    CONSTRAINT fk_task_task_type FOREIGN KEY (task_type_id) REFERENCES task_types(id),
    CONSTRAINT fk_task_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

INSERT INTO stages (id, name) VALUES
  ('stage-plan', '规划'),
  ('stage-build', '开发'),
  ('stage-review', '验收');

INSERT INTO task_types (id, name) VALUES
  ('type-feature', '功能'),
  ('type-bug', '缺陷修复'),
  ('type-doc', '文档');

INSERT INTO workflows (id, name) VALUES
  ('workflow-default', '标准产品流程');

INSERT INTO workflow_stages (workflow_id, stage_id, sort_order) VALUES
  ('workflow-default', 'stage-plan', 0),
  ('workflow-default', 'stage-build', 1),
  ('workflow-default', 'stage-review', 2);

INSERT INTO projects (id, name, workflow_id) VALUES
  ('project-alpha', 'Alpha 项目', 'workflow-default');

INSERT INTO modules (id, project_id, name, workflow_id) VALUES
  ('module-alpha-core', 'project-alpha', '核心模块', NULL),
  ('module-alpha-mobile', 'project-alpha', '移动端', 'workflow-default');

INSERT INTO tasks (id, module_id, stage_id, task_type_id, name, description, priority, status, start_date, end_date, parent_task_id) VALUES
  ('task-1', 'module-alpha-core', 'stage-plan', 'type-feature', '需求梳理', '梳理 MVP 范围', '高', '进行中', '2024-06-01', '2024-06-07', NULL),
  ('task-1-1', 'module-alpha-core', 'stage-plan', 'type-doc', 'PRD 草稿', '完成初版 PRD 文档', '中', '未开始', NULL, NULL, 'task-1');
