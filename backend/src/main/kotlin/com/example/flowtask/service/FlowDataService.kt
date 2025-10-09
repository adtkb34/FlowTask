package com.example.flowtask.service

import com.example.flowtask.api.*
import org.springframework.dao.EmptyResultDataAccessException
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.jdbc.core.namedparam.SqlParameterSource
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

@Service
class FlowDataService(private val jdbcTemplate: NamedParameterJdbcTemplate) {

    fun getInitialData(): FlowDataResponse {
        val stages = getStages()
        val taskTypes = getTaskTypes()
        val workflows = getWorkflows()
        val projects = getProjects()
        val modules = getModules()
        val tasks = getTasks()
        return FlowDataResponse(stages, taskTypes, workflows, projects, modules, tasks)
    }

    fun getStages(): List<Stage> {
        val sql = "SELECT id, name FROM stages ORDER BY created_at, name"
        val stages = jdbcTemplate.query(sql) { rs, _ ->
            Stage(
                id = rs.getString("id"),
                name = rs.getString("name"),
                tasks = emptyList()
            )
        }
        if (stages.isEmpty()) {
            return stages
        }
        val stageIds = stages.map { it.id }
        val tasksSql = """
            SELECT id, stage_id, name, sort_order
            FROM stage_tasks
            WHERE stage_id IN (:stageIds)
            ORDER BY stage_id, sort_order, created_at
        """
        val stageTasks = jdbcTemplate.query(tasksSql, mapOf("stageIds" to stageIds)) { rs, _ ->
            StageTask(
                id = rs.getString("id"),
                stageId = rs.getString("stage_id"),
                name = rs.getString("name"),
                sortOrder = rs.getInt("sort_order"),
                subtasks = emptyList()
            )
        }

        val tasksWithSubtasks = if (stageTasks.isEmpty()) {
            emptyMap<String, List<StageTask>>()
        } else {
            val taskIds = stageTasks.map(StageTask::id)
            val subtasksSql = """
                SELECT id, stage_task_id, name, sort_order
                FROM stage_task_subtasks
                WHERE stage_task_id IN (:taskIds)
                ORDER BY stage_task_id, sort_order, created_at
            """
            val subtasks = jdbcTemplate.query(subtasksSql, mapOf("taskIds" to taskIds)) { rs, _ ->
                StageSubtask(
                    id = rs.getString("id"),
                    stageTaskId = rs.getString("stage_task_id"),
                    name = rs.getString("name"),
                    sortOrder = rs.getInt("sort_order")
                )
            }.groupBy(StageSubtask::stageTaskId)

            stageTasks
                .map { task -> task.copy(subtasks = subtasks[task.id] ?: emptyList()) }
                .groupBy(StageTask::stageId)
        }

        return stages.map { stage ->
            stage.copy(tasks = tasksWithSubtasks[stage.id] ?: emptyList())
        }
    }

    fun getTaskTypes(): List<TaskType> {
        val sql = "SELECT id, name FROM task_types ORDER BY created_at, name"
        return jdbcTemplate.query(sql) { rs, _ ->
            TaskType(
                id = rs.getString("id"),
                name = rs.getString("name")
            )
        }
    }

    fun getWorkflows(): List<Workflow> {
        val workflows = jdbcTemplate.query("SELECT id, name FROM workflows ORDER BY created_at, name") { rs, _ ->
            Workflow(
                id = rs.getString("id"),
                name = rs.getString("name"),
                stageIds = emptyList()
            )
        }
        if (workflows.isEmpty()) {
            return workflows
        }
        val workflowIds = workflows.map { it.id }
        val stagesSql = """
            SELECT workflow_id, stage_id
            FROM workflow_stages
            WHERE workflow_id IN (:ids)
            ORDER BY workflow_id, sort_order
        """
        val stageMap = jdbcTemplate.query(stagesSql, mapOf("ids" to workflowIds)) { rs, _ ->
            rs.getString("workflow_id") to rs.getString("stage_id")
        }.groupBy({ it.first }, { it.second })
        return workflows.map { workflow ->
            workflow.copy(stageIds = stageMap[workflow.id] ?: emptyList())
        }
    }

    fun getProjects(): List<Project> {
        val sql = "SELECT id, name, workflow_id FROM projects ORDER BY created_at, name"
        return jdbcTemplate.query(sql) { rs, _ ->
            Project(
                id = rs.getString("id"),
                name = rs.getString("name"),
                workflowId = rs.getString("workflow_id")?.takeIf { it.isNotBlank() }
            )
        }
    }

    fun getModules(): List<Module> {
        val sql = "SELECT id, project_id, name, workflow_id FROM modules ORDER BY created_at, name"
        return jdbcTemplate.query(sql) { rs, _ ->
            Module(
                id = rs.getString("id"),
                projectId = rs.getString("project_id"),
                name = rs.getString("name"),
                workflowId = rs.getString("workflow_id")
            )
        }
    }

    fun getTasks(): List<Task> {
        val sql = """
            SELECT id, project_id, module_id, stage_id, task_type_id, name, description, priority, status,
                   start_date, end_date, parent_task_id, parent_stage_task_id
            FROM tasks
            ORDER BY created_at, name
        """
        val tasks = jdbcTemplate.query(sql) { rs, _ ->
            Task(
                id = rs.getString("id") ?: "",
                projectId = rs.getString("project_id") ?: "",
                moduleId = rs.getString("module_id")?.takeIf { it.isNotBlank() },
                stageId = rs.getString("stage_id") ?: "",
                taskTypeId = rs.getString("task_type_id")?.takeIf { it.isNotBlank() },
                name = rs.getString("name") ?: "(未命名任务)",
                description = rs.getString("description") ?: "",
                priority = rs.getString("priority") ?: "",
                status = rs.getString("status") ?: "",
                startDate = rs.getString("start_date"),
                endDate = rs.getString("end_date"),
                parentTaskId = rs.getString("parent_task_id")?.takeIf { it.isNotBlank() },
                parentStageTaskId = rs.getString("parent_stage_task_id")?.takeIf { it.isNotBlank() }
            )

        }
        if (tasks.isEmpty()) {
            return tasks
        }

        val workLogs = loadTaskWorkLogs(tasks.map(Task::id))
        return tasks.map { task ->
            task.copy(workLogs = workLogs[task.id] ?: emptyList())
        }
    }

    @Transactional
    fun createStage(request: StageRequest): Stage {
        val id = UUID.randomUUID().toString()
        val params = MapSqlParameterSource()
            .addValue("id", id)
            .addValue("name", request.name.trim())
        jdbcTemplate.update("INSERT INTO stages(id, name) VALUES (:id, :name)", params)
        val tasks = saveStageTasks(id, request.tasks)
        return Stage(id, request.name.trim(), tasks)
    }

    @Transactional
    fun updateStage(id: String, request: StageRequest): Stage {
        val rows = jdbcTemplate.update(
            "UPDATE stages SET name = :name WHERE id = :id",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", request.name.trim())
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        val tasks = saveStageTasks(id, request.tasks)
        return Stage(id, request.name.trim(), tasks)
    }

    @Transactional
    fun createTaskType(request: TaskTypeRequest): TaskType {
        val id = UUID.randomUUID().toString()
        val params = MapSqlParameterSource()
            .addValue("id", id)
            .addValue("name", request.name.trim())
        jdbcTemplate.update("INSERT INTO task_types(id, name) VALUES (:id, :name)", params)
        return TaskType(id, request.name.trim())
    }

    @Transactional
    fun updateTaskType(id: String, request: TaskTypeRequest): TaskType {
        val rows = jdbcTemplate.update(
            "UPDATE task_types SET name = :name WHERE id = :id",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", request.name.trim())
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        return TaskType(id, request.name.trim())
    }

    @Transactional
    fun createWorkflow(request: WorkflowRequest): Workflow {
        val id = UUID.randomUUID().toString()
        jdbcTemplate.update(
            "INSERT INTO workflows(id, name) VALUES (:id, :name)",
            MapSqlParameterSource().addValue("id", id).addValue("name", request.name.trim())
        )
        saveWorkflowStages(id, request.stageIds)
        return Workflow(id, request.name.trim(), request.stageIds)
    }

    @Transactional
    fun updateWorkflow(id: String, request: WorkflowRequest): Workflow {
        val rows = jdbcTemplate.update(
            "UPDATE workflows SET name = :name WHERE id = :id",
            MapSqlParameterSource().addValue("id", id).addValue("name", request.name.trim())
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        jdbcTemplate.update(
            "DELETE FROM workflow_stages WHERE workflow_id = :id",
            MapSqlParameterSource().addValue("id", id)
        )
        saveWorkflowStages(id, request.stageIds)
        return Workflow(id, request.name.trim(), request.stageIds)
    }

    private fun saveWorkflowStages(workflowId: String, stageIds: List<String>) {
        jdbcTemplate.update(
            "DELETE FROM workflow_stages WHERE workflow_id = :id",
            MapSqlParameterSource().addValue("id", workflowId)
        )
        if (stageIds.isEmpty()) return
        val sql = """
            INSERT INTO workflow_stages(workflow_id, stage_id, sort_order)
            VALUES (:workflowId, :stageId, :order)
        """
        val batchParams = stageIds.mapIndexed { index, stageId ->
            MapSqlParameterSource()
                .addValue("workflowId", workflowId)
                .addValue("stageId", stageId)
                .addValue("order", index)
        }.toTypedArray<SqlParameterSource>()
        jdbcTemplate.batchUpdate(sql, batchParams)
    }

    private fun saveStageTasks(stageId: String, taskRequests: List<StageTaskRequest>): List<StageTask> {
        jdbcTemplate.update(
            "DELETE FROM stage_tasks WHERE stage_id = :stageId",
            MapSqlParameterSource().addValue("stageId", stageId)
        )

        data class NormalizedStageTask(val name: String, val subtasks: List<String>)

        val normalizedTasks = taskRequests.mapNotNull { request ->
            val trimmedName = request.name.trim()
            if (trimmedName.isEmpty()) {
                return@mapNotNull null
            }
            val normalizedSubtasks = request.subtasks.mapNotNull { subtaskRequest ->
                val trimmedSubtaskName = subtaskRequest.name.trim()
                trimmedSubtaskName.takeIf { it.isNotEmpty() }
            }
            NormalizedStageTask(trimmedName, normalizedSubtasks)
        }

        if (normalizedTasks.isEmpty()) {
            return emptyList()
        }

        val tasks = normalizedTasks.mapIndexed { index, normalized ->
            val taskId = UUID.randomUUID().toString()
            val subtasks = normalized.subtasks.mapIndexed { subIndex, subtaskName ->
                StageSubtask(
                    id = UUID.randomUUID().toString(),
                    stageTaskId = taskId,
                    name = subtaskName,
                    sortOrder = subIndex
                )
            }
            StageTask(
                id = taskId,
                stageId = stageId,
                name = normalized.name,
                sortOrder = index,
                subtasks = subtasks
            )
        }

        val sql = """
            INSERT INTO stage_tasks(id, stage_id, name, sort_order)
            VALUES (:id, :stageId, :name, :sortOrder)
        """.trimIndent()
        val params = tasks.map {
            MapSqlParameterSource()
                .addValue("id", it.id)
                .addValue("stageId", it.stageId)
                .addValue("name", it.name)
                .addValue("sortOrder", it.sortOrder)
        }.toTypedArray<SqlParameterSource>()

        jdbcTemplate.batchUpdate(sql, params)

        val subtaskSql = """
            INSERT INTO stage_task_subtasks(id, stage_task_id, name, sort_order)
            VALUES (:id, :stageTaskId, :name, :sortOrder)
        """.trimIndent()
        val subtaskParams = tasks
            .flatMap { task ->
                task.subtasks.map { subtask ->
                    MapSqlParameterSource()
                        .addValue("id", subtask.id)
                        .addValue("stageTaskId", subtask.stageTaskId)
                        .addValue("name", subtask.name)
                        .addValue("sortOrder", subtask.sortOrder)
                }
            }
            .toTypedArray<SqlParameterSource>()

        if (subtaskParams.isNotEmpty()) {
            jdbcTemplate.batchUpdate(subtaskSql, subtaskParams)
        }

        return tasks
    }

    @Transactional
    fun createProject(request: ProjectRequest): Project {
        val id = UUID.randomUUID().toString()
        jdbcTemplate.update(
            "INSERT INTO projects(id, name, workflow_id) VALUES (:id, :name, :workflowId)",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", request.name.trim())
                .addValue("workflowId", request.workflowId)
        )
        return Project(id, request.name.trim(), request.workflowId.trim())
    }

    @Transactional
    fun updateProject(id: String, request: ProjectRequest): Project {
        val rows = jdbcTemplate.update(
            "UPDATE projects SET name = :name, workflow_id = :workflowId WHERE id = :id",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", request.name.trim())
                .addValue("workflowId", request.workflowId)
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        return Project(id, request.name.trim(), request.workflowId.trim())
    }

    @Transactional
    fun createModule(request: ModuleRequest): Module {
        val id = UUID.randomUUID().toString()
        jdbcTemplate.update(
            "INSERT INTO modules(id, project_id, name, workflow_id) VALUES (:id, :projectId, :name, :workflowId)",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("projectId", request.projectId)
                .addValue("name", request.name.trim())
                .addValue("workflowId", request.workflowId)
        )
        return Module(id, request.projectId, request.name.trim(), request.workflowId)
    }

    @Transactional
    fun updateModule(id: String, request: ModuleRequest): Module {
        val rows = jdbcTemplate.update(
            "UPDATE modules SET project_id = :projectId, name = :name, workflow_id = :workflowId WHERE id = :id",
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("projectId", request.projectId)
                .addValue("name", request.name.trim())
                .addValue("workflowId", request.workflowId)
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        return Module(id, request.projectId, request.name.trim(), request.workflowId)
    }

    @Transactional
    fun createTask(request: TaskCreateRequest): Task {
        if (request.parentTaskId != null && request.parentStageTaskId != null) {
            throw IllegalArgumentException("Task cannot have both parent task and parent stage task")
        }

        request.parentStageTaskId?.let { parentStageTaskId ->
            val parentStageId = jdbcTemplate.query(
                "SELECT stage_id FROM stage_tasks WHERE id = :id",
                mapOf("id" to parentStageTaskId)
            ) { rs, _ ->
                rs.getString("stage_id")
            }.firstOrNull() ?: throw IllegalArgumentException("Parent stage task not found")

            if (parentStageId != request.stageId) {
                throw IllegalArgumentException("Parent stage task belongs to a different stage")
            }
        }

        val projectExists = jdbcTemplate.query(
            "SELECT id FROM projects WHERE id = :id",
            mapOf("id" to request.projectId)
        ) { rs, _ -> rs.getString("id") }.isNotEmpty()
        if (!projectExists) {
            throw IllegalArgumentException("Project not found")
        }

        request.moduleId?.let { moduleId ->
            val moduleProjectId = jdbcTemplate.query(
                "SELECT project_id FROM modules WHERE id = :id",
                mapOf("id" to moduleId)
            ) { rs, _ -> rs.getString("project_id") }
                .firstOrNull() ?: throw IllegalArgumentException("Module not found")
            if (moduleProjectId != request.projectId) {
                throw IllegalArgumentException("Module does not belong to the selected project")
            }
        }

        val id = UUID.randomUUID().toString()
        val params = MapSqlParameterSource()
            .addValue("id", id)
            .addValue("projectId", request.projectId)
            .addValue("moduleId", request.moduleId)
            .addValue("stageId", request.stageId)
            .addValue("taskTypeId", request.taskTypeId)
            .addValue("name", request.name.trim())
            .addValue("description", request.description?.trim().takeIf { !it.isNullOrEmpty() })
            .addValue("priority", request.priority)
            .addValue("status", request.status)
            .addValue("startDate", parseDate(request.startDate))
            .addValue("endDate", parseDate(request.endDate))
            .addValue("parentTaskId", request.parentTaskId)
            .addValue("parentStageTaskId", request.parentStageTaskId)
        jdbcTemplate.update(
            """
                INSERT INTO tasks(id, project_id, module_id, stage_id, task_type_id, name, description, priority, status, start_date, end_date, parent_task_id, parent_stage_task_id)
                VALUES (:id, :projectId, :moduleId, :stageId, :taskTypeId, :name, :description, :priority, :status, :startDate, :endDate, :parentTaskId, :parentStageTaskId)
            """.trimIndent(),
            params
        )
        return findTaskById(id)
    }

    @Transactional
    fun updateTask(id: String, request: TaskUpdateRequest): Task {
        if (request.parentTaskId != null && request.parentStageTaskId != null) {
            throw IllegalArgumentException("Task cannot have both parent task and parent stage task")
        }

        request.parentStageTaskId?.let { parentStageTaskId ->
            val parentStageId = jdbcTemplate.query(
                "SELECT stage_id FROM stage_tasks WHERE id = :id",
                mapOf("id" to parentStageTaskId)
            ) { rs, _ ->
                rs.getString("stage_id")
            }.firstOrNull() ?: throw IllegalArgumentException("Parent stage task not found")

            if (parentStageId != request.stageId) {
                throw IllegalArgumentException("Parent stage task belongs to a different stage")
            }
        }

        val rows = jdbcTemplate.update(
            """
                UPDATE tasks
                SET stage_id = :stageId,
                    task_type_id = :taskTypeId,
                    name = :name,
                    description = :description,
                    priority = :priority,
                    status = :status,
                    start_date = :startDate,
                    end_date = :endDate,
                    parent_task_id = :parentTaskId,
                    parent_stage_task_id = :parentStageTaskId
                WHERE id = :id
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", id)
                .addValue("stageId", request.stageId)
                .addValue("taskTypeId", request.taskTypeId)
                .addValue("name", request.name.trim())
                .addValue("description", request.description?.trim().takeIf { !it.isNullOrEmpty() })
                .addValue("priority", request.priority)
                .addValue("status", request.status)
                .addValue("startDate", parseDate(request.startDate))
                .addValue("endDate", parseDate(request.endDate))
                .addValue("parentTaskId", request.parentTaskId)
                .addValue("parentStageTaskId", request.parentStageTaskId)
        )
        if (rows == 0) {
            throw EmptyResultDataAccessException(1)
        }
        return findTaskById(id)
    }

    @Transactional
    fun deleteTask(id: String) {
        // Ensure task exists before attempting deletion
        findTaskById(id)

        val idsToDelete = mutableListOf<String>()
        val stack = ArrayDeque<String>()
        stack.add(id)

        while (stack.isNotEmpty()) {
            val current = stack.removeLast()
            idsToDelete.add(current)
            val children = jdbcTemplate.query(
                "SELECT id FROM tasks WHERE parent_task_id = :parentId",
                mapOf("parentId" to current)
            ) { rs, _ ->
                rs.getString("id")
            }
            children.forEach { childId -> stack.add(childId) }
        }

        if (idsToDelete.isNotEmpty()) {
            jdbcTemplate.update(
                "DELETE FROM tasks WHERE id IN (:ids)",
                mapOf("ids" to idsToDelete)
            )
        }
    }

    private fun findTaskById(id: String): Task {
        val sql = """
            SELECT id, project_id, module_id, stage_id, task_type_id, name, description, priority, status,
                   start_date, end_date, parent_task_id, parent_stage_task_id
            FROM tasks
            WHERE id = :id
        """
        val task = jdbcTemplate.query(sql, mapOf("id" to id)) { rs, _ ->
            Task(
                id = rs.getString("id"),
                projectId = rs.getString("project_id"),
                moduleId = rs.getString("module_id")?.takeIf { it.isNotBlank() },
                stageId = rs.getString("stage_id"),
                taskTypeId = rs.getString("task_type_id")?.takeIf { it.isNotBlank() },
                name = rs.getString("name"),
                description = rs.getString("description"),
                priority = rs.getString("priority"),
                status = rs.getString("status"),
                startDate = rs.getString("start_date"),
                endDate = rs.getString("end_date"),
                parentTaskId = rs.getString("parent_task_id")?.takeIf { it.isNotBlank() },
                parentStageTaskId = rs.getString("parent_stage_task_id")?.takeIf { it.isNotBlank() }
            )
        }.firstOrNull() ?: throw EmptyResultDataAccessException(1)

        val workLogs = loadTaskWorkLogs(listOf(task.id))[task.id] ?: emptyList()
        return task.copy(workLogs = workLogs)
    }

    private fun parseDate(value: String?): LocalDate? {
        if (value.isNullOrBlank()) return null
        return try {
            LocalDate.parse(value)
        } catch (ex: DateTimeParseException) {
            throw IllegalArgumentException("Invalid date format: $value", ex)
        }
    }

    private fun loadTaskWorkLogs(taskIds: List<String>): Map<String, List<TaskWorkLog>> {
        if (taskIds.isEmpty()) {
            return emptyMap()
        }
        val sql = """
            SELECT id, task_id, work_time, content
            FROM task_work_logs
            WHERE task_id IN (:taskIds)
            ORDER BY task_id, work_time, created_at
        """
        return jdbcTemplate.query(sql, mapOf("taskIds" to taskIds)) { rs, _ ->
            TaskWorkLog(
                id = rs.getString("id"),
                taskId = rs.getString("task_id"),
                workTime = rs.getTimestamp("work_time")?.toLocalDateTime()?.toString() ?: "",
                content = rs.getString("content") ?: ""
            )
        }.groupBy(TaskWorkLog::taskId)
    }
}
