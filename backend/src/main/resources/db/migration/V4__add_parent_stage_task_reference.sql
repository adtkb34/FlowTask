ALTER TABLE tasks
    ADD COLUMN parent_stage_task_id VARCHAR(64);

ALTER TABLE tasks
    ADD CONSTRAINT fk_task_parent_stage_task
    FOREIGN KEY (parent_stage_task_id) REFERENCES stage_tasks(id);
