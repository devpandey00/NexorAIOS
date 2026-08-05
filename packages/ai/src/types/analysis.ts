export interface BusinessAnalysis {
  industry: string;
  summary: string;
  painPoints: string[];
  recommendedServices: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}
