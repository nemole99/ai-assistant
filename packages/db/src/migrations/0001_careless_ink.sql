CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category_id" text NOT NULL,
	"project_id" text,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"markdown_content" text,
	"error_message" text,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_category_id_document_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_categoryId_idx" ON "document" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "document_projectId_idx" ON "document" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_uploadedBy_idx" ON "document" USING btree ("uploaded_by");