CREATE TABLE stage_task_subtasks (
    id VARCHAR(64) PRIMARY KEY,
    stage_task_id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_task_subtasks_stage_task FOREIGN KEY (stage_task_id) REFERENCES stage_tasks(id) ON DELETE CASCADE
);
