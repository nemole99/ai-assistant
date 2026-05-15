CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."system_purpose" AS ENUM('pipeline_text', 'pipeline_embedding');--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'INGESTING';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'INGESTED';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'INGEST_FAILED';--> statement-breakpoint
CREATE TABLE "system_ai_config" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" "system_purpose" NOT NULL,
	"provider_type" text NOT NULL,
	"api_key" text NOT NULL,
	"model_id" text NOT NULL,
	"base_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_ai_config_purpose_unique" UNIQUE("purpose")
);
--> statement-breakpoint
CREATE TABLE "wiki_page" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_page_title_unique" UNIQUE("title"),
	CONSTRAINT "wiki_page_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wiki_page_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"wiki_page_id" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "wiki_page_source" (
	"wiki_page_id" text NOT NULL,
	"document_id" text NOT NULL,
	CONSTRAINT "wiki_page_source_wiki_page_id_document_id_pk" PRIMARY KEY("wiki_page_id","document_id")
);
--> statement-breakpoint
ALTER TABLE "wiki_page_chunk" ADD CONSTRAINT "wiki_page_chunk_wiki_page_id_wiki_page_id_fk" FOREIGN KEY ("wiki_page_id") REFERENCES "public"."wiki_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_source" ADD CONSTRAINT "wiki_page_source_wiki_page_id_wiki_page_id_fk" FOREIGN KEY ("wiki_page_id") REFERENCES "public"."wiki_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_source" ADD CONSTRAINT "wiki_page_source_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_page_chunk_wikiPageId_idx" ON "wiki_page_chunk" USING btree ("wiki_page_id");--> statement-breakpoint
CREATE INDEX "wiki_page_chunk_embedding_idx" ON "wiki_page_chunk" USING hnsw ("embedding" vector_cosine_ops);