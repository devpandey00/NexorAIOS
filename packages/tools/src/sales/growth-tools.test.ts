import { describe, expect, it } from 'vitest';
import { offerRoiTool, pipelineForecastTool, salesFunnelTool } from './growth-tools.js';

describe('growth tools', () => {
  it('calculates funnel conversion and revenue', async () => { const r=await salesFunnelTool.execute({leads:100,qualified:40,meetings:20,proposals:10,won:4,avgDealValue:1000}); expect(r.success).toBe(true); expect((r.data as any).revenue).toBe(4000); expect((r.data as any).conversion.overall).toBe(0.04); });
  it('forecasts weighted pipeline', async () => { const r=await pipelineForecastTool.execute({targetRevenue:10000,pipelineValue:30000,winRate:0.4}); expect((r.data as any).weightedPipeline).toBe(12000); expect((r.data as any).gapToTarget).toBe(0); });
  it('calculates offer ROI', async () => { const r=await offerRoiTool.execute({leads:100,closeRate:0.1,dealValue:2000,grossMargin:0.5,adSpend:2000,serviceFee:1000}); expect((r.data as any).revenue).toBe(20000); expect((r.data as any).grossProfit).toBe(7000); });
});
