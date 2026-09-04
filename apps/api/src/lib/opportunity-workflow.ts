import { getDatabaseClients } from '@nexor/database';

let ready: Promise<void> | null = null;
async function ensure() {
  if (!ready) ready = (async () => {
    const db = getDatabaseClients().write;
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS public.aios_opportunity_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE, title varchar(500) NOT NULL, company varchar(255), url varchar(1000), location varchar(255), budget varchar(255), requirements text, deadline timestamptz, match_score int NOT NULL DEFAULT 0, status varchar(40) NOT NULL DEFAULT 'SAVED', application text, cover_letter text, follow_up_at timestamptz, notes text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_aios_job_apps_status_deadline ON public.aios_opportunity_applications(status,deadline);`);
  })().catch(error => { ready = null; throw error; });
  await ready;
}

export async function listJobApplications() { await ensure(); return getDatabaseClients().read.$queryRawUnsafe(`SELECT * FROM public.aios_opportunity_applications ORDER BY deadline ASC NULLS LAST, match_score DESC, created_at DESC LIMIT 200`); }

export async function saveJobApplication(input: { title: string; company?: string; url?: string; location?: string; budget?: string; requirements?: string; deadline?: string; matchScore?: number; application?: string; coverLetter?: string; createdBy?: string }) {
  await ensure();
  const db = getDatabaseClients().write;
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO public.aios_opportunity_applications (title,company,url,location,budget,requirements,deadline,match_score,application,cover_letter,status,created_by) SELECT $1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9,$10,'SAVED',$11::uuid WHERE NOT EXISTS (SELECT 1 FROM public.aios_opportunity_applications WHERE url IS NOT NULL AND url=$3) RETURNING id`, input.title, input.company ?? null, input.url ?? null, input.location ?? null, input.budget ?? null, input.requirements ?? null, input.deadline ?? null, Math.max(0, Math.min(100, Number(input.matchScore ?? 0))), input.application ?? null, input.coverLetter ?? null, input.createdBy ?? null);
  return rows[0]?.id ?? null;
}

export async function updateJobApplication(id: string, status: string, userId?: string) { await ensure(); const allowed = new Set(['SAVED','PREPARED','APPROVAL_REQUIRED','APPLIED','FOLLOW_UP','INTERVIEW','WON','LOST']); if (!allowed.has(status)) throw new Error('Invalid application status'); await getDatabaseClients().write.$executeRawUnsafe(`UPDATE public.aios_opportunity_applications SET status=$1,updated_at=now(),follow_up_at=CASE WHEN $1='FOLLOW_UP' THEN now()+interval '3 days' ELSE follow_up_at END,created_by=COALESCE(created_by,$3::uuid) WHERE id=$2::uuid`, status, id, userId ?? null); }
