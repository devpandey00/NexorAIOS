import { researchService } from './services/research.service.js';

async function main() {
  const result = await researchService.analyze('https://openai.com');

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
