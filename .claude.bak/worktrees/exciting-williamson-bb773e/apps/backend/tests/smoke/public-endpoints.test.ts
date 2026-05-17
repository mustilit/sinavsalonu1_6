import * as fs from 'fs';
import * as path from 'path';

describe('Public endpoints presence', () => {
  it('health.controller.ts must have @Public()', () => {
    const p = path.join(__dirname, '..', '..', 'src', 'nest', 'controllers', 'health.controller.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toMatch(/@Public\(\)/);
  });

  it('auth.controller.ts must have @Public() on register/login', () => {
    const p = path.join(__dirname, '..', '..', 'src', 'nest', 'controllers', 'auth.controller.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toMatch(/@Public\(\)[\s\S]*@Post\('register'\)/);
    expect(src).toMatch(/@Public\(\)[\s\S]*@Post\('login'\)/);
  });
});

