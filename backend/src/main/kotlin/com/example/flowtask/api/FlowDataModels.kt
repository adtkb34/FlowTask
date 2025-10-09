package com.example.flowtask.api

data class Stage(
    val id: String,
    val name: String,
    val tasks: List<StageTask> = emptyList()
)

data class StageTask(
    val id: String,
    val stageId: String,
    val name: String,
    val sortOrder: Int,
    val subtasks: List<StageSubtask> = emptyList()
)

data class StageSubtask(
    val id: String,
    val stageTaskId: String,
    val name: String,
    val sortOrder: Int
)

data class TaskType(
    val id: String,
    val name: String
)

data class Workflow(
    val id: String,
    val name: String,
    val stageIds: List<String>
)

data class Project(
    val id: String,
    val name: String,
    val workflowId: String
)

data class Module(
    val id: String,
    val projectId: String,
    val name: String,
    val workflowId: String?
)

data class Task(
    val id: String,
    val moduleId: String,
    val stageId: String,
    val taskTypeId: String?,
    val name: String,
    val description: String?,
    val priority: String,
    val status: String,
    val startDate: String?,
    val endDate: String?,
    val parentTaskId: String?,
    val parentStageTaskId: String?
)

data class FlowDataResponse(
    val stages: List<Stage>,
    val taskTypes: List<TaskType>,
    val workflows: List<Workflow>,
    val projects: List<Project>,
    val modules: List<Module>,
    val tasks: List<Task>
)

data class StageRequest(
    val name: String,
    val tasks: List<StageTaskRequest> = emptyList()
)

data class StageTaskRequest(
    val name: String,
    val subtasks: List<StageSubtaskRequest> = emptyList()
)

data class StageSubtaskRequest(
    val name: String
)

data class TaskTypeRequest(
    val name: String
)

data class WorkflowRequest(
    val name: String,
    val stageIds: List<String>
)

data class ProjectRequest(
    val name: String,
    val workflowId: String
)

data class ModuleRequest(
    val name: String,
    val projectId: String,
    val workflowId: String?
)

data class TaskCreateRequest(
    val moduleId: String,
    val stageId: String,
    val taskTypeId: String?,
    val name: String,
    val description: String?,
    val priority: String,
    val status: String,
    val startDate: String?,
    val endDate: String?,
    val parentTaskId: String?,
    val parentStageTaskId: String?
)

data class TaskUpdateRequest(
    val stageId: String,
    val taskTypeId: String?,
    val name: String,
    val description: String?,
    val priority: String,
    val status: String,
    val startDate: String?,
    val endDate: String?,
    val parentTaskId: String?,
    val parentStageTaskId: String?
)
