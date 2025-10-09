CREATE TABLE stage_tasks (
    id VARCHAR(64) PRIMARY KEY,
    stage_id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_tasks_stage FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
);