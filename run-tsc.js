const { execSync } = require('child_process');
const fs = require('fs');

try {
    const result = execSync('npx tsc', { encoding: 'utf-8' });
    fs.writeFileSync('tsc-output.txt', result);
} catch (e) {
    fs.writeFileSync('tsc-output.txt', e.stdout || e.message);
}
