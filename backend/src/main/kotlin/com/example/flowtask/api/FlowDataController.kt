package com.example.flowtask.api

import com.example.flowtask.service.FlowDataService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api")
class FlowDataController(private val flowDataService: FlowDataService) {

    @GetMapping("/initial-data")
    fun getInitialData(): FlowDataResponse = flowDataService.getInitialData()

    @GetMapping("/stages")
    fun getStages(): List<Stage> = flowDataService.getStages()

    @PostMapping("/stages")
    fun createStage(@RequestBody request: StageRequest): Stage {
        if (request.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Stage name is required")
        }
        return flowDataService.createStage(request)
    }

    @PutMapping("/stages/{id}")
    fun updateStage(@PathVariable id: String, @RequestBody request: StageRequest): Stage {
        if (request.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Stage name is required")
        }
        return flowDataService.updateStage(id, request)
    }

    @GetMapping("/task-types")
    fun getTaskTypes(): List<TaskType> = flowDataService.getTaskTypes()

    @PostMapping("/task-types")
    fun createTaskType(@RequestBody request: TaskTypeRequest): TaskType {
        if (request.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task type name is required")
        }
        return flowDataService.createTaskType(request)
    }

    @PutMapping("/task-types/{id}")
    fun updateTaskType(@PathVariable id: String, @RequestBody request: TaskTypeRequest): TaskType {
        if (request.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task type name is required")
        }
        return flowDataService.updateTaskType(id, request)
    }

    @GetMapping("/workflows")
    fun getWorkflows(): List<Workflow> = flowDataService.getWorkflows()

    @PostMapping("/workflows")
    fun createWorkflow(@RequestBody request: WorkflowRequest): Workflow {
        if (request.name.isBlank() || request.stageIds.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Workflow name and stages are required")
        }
        return flowDataService.createWorkflow(request)
    }

    @PutMapping("/workflows/{id}")
    fun updateWorkflow(@PathVariable id: String, @RequestBody request: WorkflowRequest): Workflow {
        if (request.name.isBlank() || request.stageIds.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Workflow name and stages are required")
        }
        return flowDataService.updateWorkflow(id, request)
    }

    @GetMapping("/projects")
    fun getProjects(): List<Project> = flowDataService.getProjects()

    @PostMapping("/projects")
    fun createProject(@RequestBody request: ProjectRequest): Project {
        if (request.name.isBlank() || request.workflowId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Project name and workflow are required")
        }
        return flowDataService.createProject(request)
    }

    @PutMapping("/projects/{id}")
    fun updateProject(@PathVariable id: String, @RequestBody request: ProjectRequest): Project {
        if (request.name.isBlank() || request.workflowId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Project name and workflow are required")
        }
        return flowDataService.updateProject(id, request)
    }

    @GetMapping("/modules")
    fun getModules(): List<Module> = flowDataService.getModules()

    @PostMapping("/modules")
    fun createModule(@RequestBody request: ModuleRequest): Module {
        if (request.name.isBlank() || request.projectId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Module name and project are required")
        }
        return flowDataService.createModule(request)
    }

    @PutMapping("/modules/{id}")
    fun updateModule(@PathVariable id: String, @RequestBody request: ModuleRequest): Module {
        if (request.name.isBlank() || request.projectId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Module name and project are required")
        }
        return flowDataService.updateModule(id, request)
    }

    @GetMapping("/tasks")
    fun getTasks(): List<Task> = flowDataService.getTasks()

    @PostMapping("/tasks")
    fun createTask(@RequestBody request: TaskCreateRequest): Task {
        validateTaskPayload(request.moduleId, request.stageId, request.name, request.priority, request.status)
        if (request.parentTaskId != null && request.parentStageTaskId != null) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task cannot have both parent task and parent stage task")
        }
        return flowDataService.createTask(request)
    }

    @PutMapping("/tasks/{id}")
    fun updateTask(@PathVariable id: String, @RequestBody request: TaskUpdateRequest): Task {
        validateTaskPayload(null, request.stageId, request.name, request.priority, request.status)
        return flowDataService.updateTask(id, request)
    }

    private fun validateTaskPayload(
        moduleId: String?,
        stageId: String?,
        name: String?,
        priority: String?,
        status: String?
    ) {
        if (moduleId != null && moduleId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Module is required")
        }
        if (stageId == null || stageId.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Stage is required")
        }
        if (name == null || name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task name is required")
        }
        if (priority == null || priority.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task priority is required")
        }
        if (status == null || status.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task status is required")
        }
    }

    @ExceptionHandler(IllegalArgumentException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String?> =
        mapOf("error" to exception.message)

    @ExceptionHandler(org.springframework.dao.EmptyResultDataAccessException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleNotFound(): Map<String, String> = mapOf("error" to "Resource not found")
}
