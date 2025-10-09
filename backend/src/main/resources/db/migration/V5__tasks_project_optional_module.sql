ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_task_module;
ALTER TABLE tasks ADD COLUMN project_id VARCHAR(64);
UPDATE tasks t
SET project_id = m.project_id
FROM modules m
WHERE t.module_id = m.id;
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE tasks ALTER COLUMN module_id DROP NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_task_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL;
