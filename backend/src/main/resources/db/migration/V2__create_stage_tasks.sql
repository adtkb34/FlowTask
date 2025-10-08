CREATE TABLE stage_tasks (
    id VARCHAR(64) PRIMARY KEY,
    stage_id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_tasks_stage FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
);

INSERT INTO stage_tasks (id, stage_id, name, sort_order) VALUES
  ('stage-plan-template-1', 'stage-plan', '需求澄清', 0),
  ('stage-build-template-1', 'stage-build', '开发实现', 0),
  ('stage-review-template-1', 'stage-review', '上线验收', 0);
