-- One-time data seed: real course progress (sprints, parts).
-- Idempotent — safe to re-run. Each insert skips rows that already exist
-- (matched by sprint name and (sprint, part name)).

-- Sprints
insert into sprints (name, planned_start, planned_end)
select v.name, v.planned_start::date, v.planned_end::date
from (values
  ('Sprint 1 — Claude Code Foundations & Simple Applications', '2026-07-22', '2026-08-05'),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', '2026-08-06', '2026-09-18'),
  ('Sprint 3 — Security, Testing & AI Apps', '2026-09-19', '2026-10-14'),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', '2026-10-15', '2026-11-16'),
  ('Career Module — Building with AI Agents', '2026-11-17', '2026-11-18'),
  ('Capstone — Building with AI Agents', '2026-11-19', '2026-11-20')
) as v(name, planned_start, planned_end)
where not exists (select 1 from sprints s where s.name = v.name);

-- Parts
insert into parts (sprint_id, name, status, actual_completion_date)
select s.id, v.name, v.status, v.actual_completion_date::date
from (values
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Why use Claude Code?', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Setup and Getting Started', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Agent Mode Memory and Follow-Up Prompting', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Git, GitHub and Deploying a Static App', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Practice Project: Build Your Own Web App and Deploy It', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Intro to Web Applications and Next.js', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Context Engineering and Web Search', 'completed', '2026-08-05'),
  ('Sprint 1 — Claude Code Foundations & Simple Applications', 'Sprint Project: Build a Simple Next.js App', 'completed', '2026-08-05'),

  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Claude Code Slash Commands', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Agent Skills and Plugins', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Intro to Databases and Supabase', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Next.js with Supabase', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Mid-Sprint Project: Notes App with Collections and Search', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Authentication with Supabase', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Fixing errors and debugging with Claude Code', 'completed', null),
  ('Sprint 2 — Databases, Deployment & Full-Stack Apps', 'Sprint Project: Full-Stack App with Database and Authentication', 'open', null),

  ('Sprint 3 — Security, Testing & AI Apps', 'Subagents and Superpowers', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'Intro to Vercel and Deploying Full-Stack Apps', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'Security of web apps', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'MCP, Browser Use, and Automated Tests with Playwright', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'Mid-Sprint Project: Ship a Secured App and Prove It', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'Building AI apps', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'RAG: chat with your own data', 'open', null),
  ('Sprint 3 — Security, Testing & AI Apps', 'Sprint Project: Ship an AI App of Your Own', 'open', null),

  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Automations with Claude Code', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Compliance for AI Builders', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Building Mobile Apps: Expo and React Native', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Mid-Sprint Project: Build a Mobile App with an AI Feature', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Multitasking and loop engineering', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Building a CMS and Integrating Payments', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Building production systems', 'open', null),
  ('Sprint 4 — Advanced Builds: Mobile, Commerce & Production', 'Sprint Project: Ship Your Own Online Shop', 'open', null),

  ('Career Module — Building with AI Agents', 'Career Module', 'open', null),

  ('Capstone — Building with AI Agents', 'Building with AI Agents Capstone', 'open', null)
) as v(sprint_name, name, status, actual_completion_date)
join sprints s on s.name = v.sprint_name
where not exists (
  select 1 from parts p where p.sprint_id = s.id and p.name = v.name
);
