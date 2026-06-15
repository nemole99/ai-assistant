CREATE TYPE "public"."employee_level" AS ENUM('JUNIOR', 'SENIOR');--> statement-breakpoint
CREATE TYPE "public"."evaluation_audit_action" AS ENUM('CREATE_TICKET', 'UPDATE_TICKET', 'DELETE_TICKET', 'IMPORT_TICKET', 'UPDATE_TIMESHEET', 'SET_HOLIDAYS', 'CREATE_KPI', 'UPDATE_KPI');--> statement-breakpoint
CREATE TYPE "public"."evaluation_ticket_category" AS ENUM('bug', 'feature');--> statement-breakpoint
CREATE TABLE "evaluation_audit_log" (
	"action" "evaluation_audit_action" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"details" jsonb,
	"employee_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"performed_by" text
);
--> statement-breakpoint
CREATE TABLE "evaluation_kpi_productivity" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"monthly_values" jsonb DEFAULT '{}'::jsonb,
	"project_id" text NOT NULL,
	"result" real,
	"target" real,
	"title" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_kpi_productivity_unique" UNIQUE("employee_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_kpi_quality" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"monthly_values" jsonb DEFAULT '{}'::jsonb,
	"project_id" text NOT NULL,
	"reopen_number" real,
	"reopen_percent" real,
	"result" real,
	"title" text,
	"total_by_mar" real,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_kpi_quality_unique" UNIQUE("employee_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_kpi_sharing" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"monthly_values" jsonb DEFAULT '{}'::jsonb,
	"project_id" text NOT NULL,
	"result" real,
	"target" real,
	"title" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_kpi_sharing_unique" UNIQUE("employee_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_kpi_summary" (
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"result_productivity" real,
	"result_reopen" real,
	"result_sharing" real,
	"target_productivity" real,
	"target_reopen" real,
	"target_sharing" real,
	"title" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_kpi_summary_unique" UNIQUE("employee_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_ticket" (
	"category" "evaluation_ticket_category" NOT NULL,
	"code_fix_actual" real NOT NULL,
	"code_fix_estimate" real NOT NULL,
	"code_review_actual" real NOT NULL,
	"code_review_estimate" real NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"investigate_actual" real NOT NULL,
	"investigate_estimate" real NOT NULL,
	"process_date" date NOT NULL,
	"project_id" text NOT NULL,
	"reopen_status" integer DEFAULT 0 NOT NULL,
	"ticket_url" text NOT NULL,
	"total_effort" real,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_ticket_ticket_url_unique" UNIQUE("ticket_url")
);
--> statement-breakpoint
CREATE TABLE "evaluation_timesheet_entry" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"day" integer NOT NULL,
	"employee_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	CONSTRAINT "evaluation_timesheet_entry_unique" UNIQUE("month","employee_id","day")
);
--> statement-breakpoint
CREATE TABLE "evaluation_timesheet_holiday" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"day" integer NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	CONSTRAINT "evaluation_timesheet_holiday_unique" UNIQUE("month","day")
);
--> statement-breakpoint
ALTER TABLE "wiki_page_source" DROP CONSTRAINT "wiki_page_source_document_id_document_id_fk";
--> statement-breakpoint
ALTER TABLE "wiki_page_source" ALTER COLUMN "document_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "level" "employee_level";--> statement-breakpoint
ALTER TABLE "evaluation_audit_log" ADD CONSTRAINT "evaluation_audit_log_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_audit_log" ADD CONSTRAINT "evaluation_audit_log_performed_by_employee_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_productivity" ADD CONSTRAINT "evaluation_kpi_productivity_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_productivity" ADD CONSTRAINT "evaluation_kpi_productivity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_quality" ADD CONSTRAINT "evaluation_kpi_quality_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_quality" ADD CONSTRAINT "evaluation_kpi_quality_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_sharing" ADD CONSTRAINT "evaluation_kpi_sharing_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_sharing" ADD CONSTRAINT "evaluation_kpi_sharing_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_summary" ADD CONSTRAINT "evaluation_kpi_summary_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_kpi_summary" ADD CONSTRAINT "evaluation_kpi_summary_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_ticket" ADD CONSTRAINT "evaluation_ticket_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_ticket" ADD CONSTRAINT "evaluation_ticket_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_timesheet_entry" ADD CONSTRAINT "evaluation_timesheet_entry_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluation_audit_log_action_idx" ON "evaluation_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "evaluation_audit_log_createdAt_idx" ON "evaluation_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "evaluation_kpi_productivity_employeeId_idx" ON "evaluation_kpi_productivity" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_kpi_quality_employeeId_idx" ON "evaluation_kpi_quality" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_kpi_sharing_employeeId_idx" ON "evaluation_kpi_sharing" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_kpi_summary_employeeId_idx" ON "evaluation_kpi_summary" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_ticket_employeeId_idx" ON "evaluation_ticket" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_ticket_projectId_idx" ON "evaluation_ticket" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evaluation_ticket_processDate_idx" ON "evaluation_ticket" USING btree ("process_date");--> statement-breakpoint
CREATE INDEX "evaluation_timesheet_month_idx" ON "evaluation_timesheet_entry" USING btree ("month");--> statement-breakpoint
CREATE INDEX "evaluation_timesheet_employeeId_idx" ON "evaluation_timesheet_entry" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "evaluation_timesheet_holiday_month_idx" ON "evaluation_timesheet_holiday" USING btree ("month");--> statement-breakpoint
ALTER TABLE "wiki_page_source" ADD CONSTRAINT "wiki_page_source_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;