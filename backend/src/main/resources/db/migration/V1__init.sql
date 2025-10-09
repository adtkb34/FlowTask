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
