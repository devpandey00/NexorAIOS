import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const required = ['RESEND_API_KEY', 'REPORT_FROM_EMAIL', 'REPORT_EMAIL_TO', 'CRON_SECRET'] as const;

export async function GET() {
  const checks = Object.fromEntries(
    required.map((key) => [key, Boolean(process.env[key])]),
  );

  const ready = Object.values(checks).every(Boolean);

  return NextResponse.json({
    success: true,
    ready,
    delivery: 'email',
    scheduler: 'github-actions',
    cadence: 'every 2 hours',
    checks,
    message: ready
      ? 'Automated email reporting is configured.'
      : 'Email reporting is not fully configured. Add the missing environment variables shown by this diagnostic.',
    generatedAt: new Date().toISOString(),
  });
}
