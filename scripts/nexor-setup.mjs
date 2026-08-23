import { execSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';

const run = (command) => {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', shell: true });
};

if (!existsSync('.env')) {
  if (!existsSync('.env.example')) throw new Error('.env.example is missing');
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example. Review provider credentials before using external integrations.');
}

run('pnpm install');
run('pnpm docker:up');
run('pnpm db:generate');
run('pnpm db:migrate:deploy');
console.log('\nNexorAIOS local infrastructure is ready. Start the app with: pnpm dev');
