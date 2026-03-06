CREATE TABLE "solo_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"solo_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solo_instances" ADD CONSTRAINT "solo_instances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solo_instances_company_status_idx" ON "solo_instances" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "solo_instances_company_solo_idx" ON "solo_instances" USING btree ("company_id","solo_id");