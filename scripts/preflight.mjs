import { execSync } from 'node:child_process';
const checks=[['node','node --version'],['npm','npm --version'],['docker','docker --version'],['compact','compact --version']];
for(const [name,cmd] of checks){try{console.log(`✓ ${name}: ${execSync(cmd,{encoding:'utf8'}).trim()}`)}catch{console.log(`! ${name}: not found (required for ${name==='compact'?'contract compilation':'optional local infrastructure'})`)}}
console.log('\nNexora preflight: browser wallet and a deployed contract address are runtime requirements.');
