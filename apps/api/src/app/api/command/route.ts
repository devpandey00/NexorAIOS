import { NextRequest, NextResponse } from 'next/server';
import { leadSearchService } from '@nexor/search';
import { leadService } from '@nexor/core';
import { researchService } from '@nexor/research';
import { businessReportService } from '@nexor/ai';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();

    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required',
        },
        { status: 400 },
      );
    }

    console.log(`[NEXOR] Campaign started: ${query}`);

    // 1. Search
    const searchResult = await leadSearchService.search(query);

    const leads = searchResult.leads.slice(0, 5);

    console.log(`[NEXOR] Found ${searchResult.count} leads. Processing ${leads.length}.`);

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        found: 0,
        processed: 0,
        results: [],
        status: 'completed',
        durationMs: Date.now() - startedAt,
      });
    }

    const results = [];

    // 2. Process each lead safely
    for (const lead of leads) {
      try {
        console.log(`[NEXOR] Processing: ${lead.name}`);

        let analysis = null;

        // 3. Research website
        if (lead.website) {
          try {
            const research = await researchService.analyze(lead.website);

            if (research.success) {
              analysis = await businessReportService.generate(research);
            }
          } catch (error) {
            console.error(`[NEXOR] AI analysis failed: ${lead.name}`, error);
          }
        }

        // 4. Save lead
        const savedLead = await leadService.create({
          businessName: lead.name,
          niche: query,
          country: 'India',
          website: lead.website || undefined,
        });

        results.push({
          success: true,
          lead: savedLead,
          analysis,
        });

        console.log(`[NEXOR] Completed: ${lead.name}`);
      } catch (error) {
        console.error(`[NEXOR] Failed: ${lead.name}`, error);

        results.push({
          success: false,
          businessName: lead.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successful = results.filter((item) => item.success).length;

    const failed = results.length - successful;

    console.log(`[NEXOR] Campaign completed: ${successful} successful, ${failed} failed.`);

    return NextResponse.json({
      success: true,
      query,
      found: searchResult.count,
      processed: results.length,
      successful,
      failed,
      results,
      status: 'completed',
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('[NEXOR CAMPAIGN ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
      },
      { status: 500 },
    );
  }
}
