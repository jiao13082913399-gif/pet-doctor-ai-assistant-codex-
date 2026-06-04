-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "nickname" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'doctor',
    "position" TEXT,
    "city" TEXT,
    "current_store_id" TEXT,
    "is_director" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_login_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "users_current_store_id_fkey" FOREIGN KEY ("current_store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_auth_bindings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "auth_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "union_id" TEXT,
    "credential_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_auth_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "user_store_relations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'doctor',
    "position" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_store_relations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_store_relations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT,
    "source_recording_id" TEXT,
    "pet_owner_name" TEXT,
    "pet_name" TEXT,
    "memory_type" TEXT NOT NULL DEFAULT 'customer_profile',
    "title" TEXT,
    "content_json" JSONB,
    "content_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "memories_source_recording_id_fkey" FOREIGN KEY ("source_recording_id") REFERENCES "recordings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "memory_update_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memory_id" TEXT,
    "user_id" TEXT NOT NULL,
    "recording_id" TEXT,
    "generation_result_id" TEXT,
    "suggestion_type" TEXT NOT NULL DEFAULT 'update',
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "memory_update_suggestions_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "memory_update_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memory_update_suggestions_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "memory_update_suggestions_generation_result_id_fkey" FOREIGN KEY ("generation_result_id") REFERENCES "generation_results" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT,
    "audio_url" TEXT NOT NULL,
    "audio_format" TEXT,
    "audio_duration" INTEGER,
    "upload_type" TEXT NOT NULL DEFAULT 'web_recording',
    "transcript_text" TEXT,
    "ai_detected_scene" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'uploaded',
    "pet_owner_name" TEXT,
    "pet_name" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recordings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recording_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "result_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_json" JSONB,
    "content_text" TEXT,
    "module_status" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_default_generated" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmed_by_user" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "generation_results_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generation_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generation_result_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "custom_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "generation_feedback_generation_result_id_fkey" FOREIGN KEY ("generation_result_id") REFERENCES "generation_results" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "recording_id" TEXT,
    "generation_result_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pet_owner_name" TEXT,
    "pet_name" TEXT,
    "due_time" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "todos_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "todos_generation_result_id_fkey" FOREIGN KEY ("generation_result_id") REFERENCES "generation_results" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custom_tool_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "recording_id" TEXT,
    "generation_result_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirement_json" JSONB,
    "requirement_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "custom_tool_requirements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "custom_tool_requirements_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "custom_tool_requirements_generation_result_id_fkey" FOREIGN KEY ("generation_result_id") REFERENCES "generation_results" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "item_type" TEXT NOT NULL DEFAULT 'note',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "project_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "store_id" TEXT,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL DEFAULT 'document',
    "url" TEXT,
    "content_text" TEXT,
    "metadata_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resources_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "recording_id" TEXT,
    "generation_result_id" TEXT,
    "call_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "estimated_cost" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_call_logs_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_call_logs_generation_result_id_fkey" FOREIGN KEY ("generation_result_id") REFERENCES "generation_results" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_current_store_id" ON "users"("current_store_id");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_user_auth_bindings_user_id" ON "user_auth_bindings"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_auth_bindings_status" ON "user_auth_bindings"("status");

-- CreateIndex
CREATE INDEX "idx_user_auth_bindings_created_at" ON "user_auth_bindings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_auth_bindings_provider_user" ON "user_auth_bindings"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "idx_stores_status" ON "stores"("status");

-- CreateIndex
CREATE INDEX "idx_stores_created_at" ON "stores"("created_at");

-- CreateIndex
CREATE INDEX "idx_stores_deleted_at" ON "stores"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_user_store_relations_user_id" ON "user_store_relations"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_store_relations_store_id" ON "user_store_relations"("store_id");

-- CreateIndex
CREATE INDEX "idx_user_store_relations_status" ON "user_store_relations"("status");

-- CreateIndex
CREATE INDEX "idx_user_store_relations_created_at" ON "user_store_relations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_store_relations_user_store" ON "user_store_relations"("user_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_memories_user_id" ON "memories"("user_id");

-- CreateIndex
CREATE INDEX "idx_memories_store_id" ON "memories"("store_id");

-- CreateIndex
CREATE INDEX "idx_memories_recording_id" ON "memories"("source_recording_id");

-- CreateIndex
CREATE INDEX "idx_memories_status" ON "memories"("status");

-- CreateIndex
CREATE INDEX "idx_memories_created_at" ON "memories"("created_at");

-- CreateIndex
CREATE INDEX "idx_memories_deleted_at" ON "memories"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_memory_id" ON "memory_update_suggestions"("memory_id");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_user_id" ON "memory_update_suggestions"("user_id");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_recording_id" ON "memory_update_suggestions"("recording_id");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_generation_result_id" ON "memory_update_suggestions"("generation_result_id");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_status" ON "memory_update_suggestions"("status");

-- CreateIndex
CREATE INDEX "idx_memory_update_suggestions_created_at" ON "memory_update_suggestions"("created_at");

-- CreateIndex
CREATE INDEX "idx_recordings_user_id" ON "recordings"("user_id");

-- CreateIndex
CREATE INDEX "idx_recordings_store_id" ON "recordings"("store_id");

-- CreateIndex
CREATE INDEX "idx_recordings_processing_status" ON "recordings"("processing_status");

-- CreateIndex
CREATE INDEX "idx_recordings_created_at" ON "recordings"("created_at");

-- CreateIndex
CREATE INDEX "idx_recordings_deleted_at" ON "recordings"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_generation_results_recording_id" ON "generation_results"("recording_id");

-- CreateIndex
CREATE INDEX "idx_generation_results_user_id" ON "generation_results"("user_id");

-- CreateIndex
CREATE INDEX "idx_generation_results_result_type" ON "generation_results"("result_type");

-- CreateIndex
CREATE INDEX "idx_generation_results_module_status" ON "generation_results"("module_status");

-- CreateIndex
CREATE INDEX "idx_generation_results_status" ON "generation_results"("status");

-- CreateIndex
CREATE INDEX "idx_generation_results_created_at" ON "generation_results"("created_at");

-- CreateIndex
CREATE INDEX "idx_generation_results_deleted_at" ON "generation_results"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_generation_feedback_generation_result_id" ON "generation_feedback"("generation_result_id");

-- CreateIndex
CREATE INDEX "idx_generation_feedback_user_id" ON "generation_feedback"("user_id");

-- CreateIndex
CREATE INDEX "idx_generation_feedback_action" ON "generation_feedback"("action");

-- CreateIndex
CREATE INDEX "idx_generation_feedback_created_at" ON "generation_feedback"("created_at");

-- CreateIndex
CREATE INDEX "idx_todos_user_id" ON "todos"("user_id");

-- CreateIndex
CREATE INDEX "idx_todos_recording_id" ON "todos"("recording_id");

-- CreateIndex
CREATE INDEX "idx_todos_generation_result_id" ON "todos"("generation_result_id");

-- CreateIndex
CREATE INDEX "idx_todos_status" ON "todos"("status");

-- CreateIndex
CREATE INDEX "idx_todos_created_at" ON "todos"("created_at");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_user_id" ON "custom_tool_requirements"("user_id");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_recording_id" ON "custom_tool_requirements"("recording_id");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_generation_result_id" ON "custom_tool_requirements"("generation_result_id");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_status" ON "custom_tool_requirements"("status");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_created_at" ON "custom_tool_requirements"("created_at");

-- CreateIndex
CREATE INDEX "idx_custom_tool_requirements_deleted_at" ON "custom_tool_requirements"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_projects_user_id" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "idx_projects_store_id" ON "projects"("store_id");

-- CreateIndex
CREATE INDEX "idx_projects_status" ON "projects"("status");

-- CreateIndex
CREATE INDEX "idx_projects_created_at" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "idx_projects_deleted_at" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_project_items_project_id" ON "project_items"("project_id");

-- CreateIndex
CREATE INDEX "idx_project_items_user_id" ON "project_items"("user_id");

-- CreateIndex
CREATE INDEX "idx_project_items_status" ON "project_items"("status");

-- CreateIndex
CREATE INDEX "idx_project_items_created_at" ON "project_items"("created_at");

-- CreateIndex
CREATE INDEX "idx_project_items_deleted_at" ON "project_items"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_resources_user_id" ON "resources"("user_id");

-- CreateIndex
CREATE INDEX "idx_resources_store_id" ON "resources"("store_id");

-- CreateIndex
CREATE INDEX "idx_resources_project_id" ON "resources"("project_id");

-- CreateIndex
CREATE INDEX "idx_resources_status" ON "resources"("status");

-- CreateIndex
CREATE INDEX "idx_resources_created_at" ON "resources"("created_at");

-- CreateIndex
CREATE INDEX "idx_resources_deleted_at" ON "resources"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_user_id" ON "ai_call_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_recording_id" ON "ai_call_logs"("recording_id");

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_generation_result_id" ON "ai_call_logs"("generation_result_id");

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_status" ON "ai_call_logs"("status");

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_created_at" ON "ai_call_logs"("created_at");
