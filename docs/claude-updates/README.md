# Claude Skill & Agent Güncellemeleri — Staging

Bu klasör, seçilen iyileştirmeler için hazırlanmış skill ve agent güncellemelerini içerir. `.claude/` doğrudan yazıma kapalı olduğu için içerikler burada stage edilmiştir.

## Taşıma

```powershell
# PowerShell — repo kökünden
# Yeni skill'ler
Copy-Item docs/claude-updates/skills/pagination       .claude/skills/ -Recurse
Copy-Item docs/claude-updates/skills/full-text-search .claude/skills/ -Recurse
Copy-Item docs/claude-updates/skills/accessibility    .claude/skills/ -Recurse

# Mevcut skill replace
Copy-Item docs/claude-updates/skills/prisma-schema/SKILL.md   .claude/skills/prisma-schema/SKILL.md   -Force
Copy-Item docs/claude-updates/skills/react-component/SKILL.md .claude/skills/react-component/SKILL.md -Force

# Agent replace
Copy-Item docs/claude-updates/agents/backend-architect.md .claude/agents/backend-architect.md -Force
Copy-Item docs/claude-updates/agents/ui-builder.md        .claude/agents/ui-builder.md        -Force
Copy-Item docs/claude-updates/agents/e2e-writer.md        .claude/agents/e2e-writer.md        -Force
Copy-Item docs/claude-updates/agents/code-reviewer.md     .claude/agents/code-reviewer.md     -Force

# CLAUDE.md replace
Copy-Item docs/claude-updates/CLAUDE.md CLAUDE.md -Force

# CI workflow — .github/workflows/ protect-paths.sh ile korumalı; manuel uygula
# docs/claude-updates/ci/backend-migrate-and-test.yml.patch'a bak
```

## İçerik

| Dosya | Tür | Hedef |
|-------|-----|-------|
| `skills/pagination/SKILL.md` | YENİ | `.claude/skills/pagination/SKILL.md` |
| `skills/full-text-search/SKILL.md` | YENİ | `.claude/skills/full-text-search/SKILL.md` |
| `skills/accessibility/SKILL.md` | YENİ | `.claude/skills/accessibility/SKILL.md` |
| `skills/prisma-schema/SKILL.md` | GÜNCEL | `.claude/skills/prisma-schema/SKILL.md` |
| `skills/react-component/SKILL.md` | GÜNCEL | `.claude/skills/react-component/SKILL.md` |
| `agents/backend-architect.md` | GÜNCEL | `.claude/agents/backend-architect.md` |
| `agents/ui-builder.md` | GÜNCEL | `.claude/agents/ui-builder.md` |
| `agents/e2e-writer.md` | GÜNCEL | `.claude/agents/e2e-writer.md` |
| `agents/code-reviewer.md` | GÜNCEL | `.claude/agents/code-reviewer.md` |
| `CLAUDE.md` | GÜNCEL | `CLAUDE.md` (repo root) |
| `ci/backend-migrate-and-test.yml.patch` | PATCH | `.github/workflows/backend-migrate-and-test.yml` |

## Hangi Öneri Hangi Dosyaya

| Öneri | Skill/Agent |
|-------|-------------|
| Zod + class-validator disiplin | `agents/backend-architect.md`, `agents/code-reviewer.md` |
| Prisma select disiplin | `skills/prisma-schema/SKILL.md`, `agents/code-reviewer.md` |
| Frontend code splitting | `skills/react-component/SKILL.md`, `agents/ui-builder.md` |
| Cursor pagination | `skills/pagination/SKILL.md` (yeni) |
| Dark mode + theme persist | `skills/react-component/SKILL.md`, `agents/ui-builder.md` |
| Accessibility (axe-core) | `skills/accessibility/SKILL.md` (yeni), `agents/e2e-writer.md` |
| Composite index disiplin | `skills/prisma-schema/SKILL.md` |
| Full-text search (tsvector) | `skills/full-text-search/SKILL.md` (yeni) |
| npm audit CI | `ci/backend-migrate-and-test.yml.patch` |
