import { makePasswordHash } from '../functions/_lib/crypto.js';

if (!process.stdin.isTTY) {
  console.error('Execute este comando em um terminal interativo.');
  process.exit(1);
}

process.stdout.write('Digite a nova senha administrativa: ');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
let password = '';

for await (const character of process.stdin) {
  if (character === '\u0003') process.exit(130);
  if (character === '\r' || character === '\n') break;
  if (character === '\u007f' || character === '\b') {
    if (password.length) { password = password.slice(0, -1); process.stdout.write('\b \b'); }
    continue;
  }
  if (character >= ' ') { password += character; process.stdout.write('*'); }
}
process.stdin.setRawMode(false);
process.stdin.pause();
process.stdout.write('\n');

if (password.length < 12) {
  console.error('Use uma senha com pelo menos 12 caracteres.');
  process.exit(1);
}
console.log(await makePasswordHash(password));
