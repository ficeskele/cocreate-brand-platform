# Project rules

## Language: English only
Everything committed to this repository must be in English: code comments, identifiers, UI strings, route paths and slugs, mock data, docs (README, PLAN, TESTING), commit messages, test scripts and SVG text. No Chinese, Spanish, Italian or any other language, anywhere in the repo. Conversation with the user may be in whatever language they use.

Before committing, run:

```bash
git ls-files | grep -vE 'node_modules|/dist/|\.png$|pnpm-lock' | xargs perl -ne 'print "$ARGV:$.: $_" if /\p{Han}|[áéíóúñ¿¡àèìòù]/'
```

It must print nothing.

## Arcade means arcade.ai
This project builds on arcade.ai (AI physical products: pattern → product → checkout, API at platform.arcade.ai). It has nothing to do with arcade.dev. See PLAN.md.

## Working in parallel
Several Claude Code sessions share this working tree. Before editing a file, re-read it; before committing, run `git status` and only stage the files you changed. Keep commits small and push promptly.
