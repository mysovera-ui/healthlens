-- Report feedback follow-up: track when the AI interpretation was generated,
-- a simple report version counter (bumped each time the draft is
-- regenerated), and who (which staff member) actually reviewed/approved a
-- report, so the PDF can credit a real human reviewer instead of a bare
-- "review status" word.
alter table report_submissions add column if not exists ai_draft_generated_at timestamptz;
alter table report_submissions add column if not exists report_version integer not null default 1;
alter table report_submissions add column if not exists reviewed_by text;
alter table report_submissions add column if not exists reviewed_at timestamptz;
