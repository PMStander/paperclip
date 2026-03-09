ALTER TABLE "issues" ADD COLUMN "blocked_by_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_blocked_by_issue_id_issues_id_fk" FOREIGN KEY ("blocked_by_issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_blocked_by_idx" ON "issues" USING btree ("company_id","blocked_by_issue_id");