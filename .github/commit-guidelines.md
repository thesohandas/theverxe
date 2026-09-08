# Commit Format

```txt
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

---

## Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting/style (no logic)
- `refactor` - Code refactor (no feature/fix)
- `perf` - Performance improvement
- `test` - Add/update tests
- `build` - Build system/dependencies
- `ci` - CI/config changes
- `chore` - Maintenance/misc
- `revert` - Revert commit

---

## Tone & Language

- Write like a changelog, not a code review.
- Use ASD-STE100 Simplified Technical English. Prefer "Rename X to Y" over "Rename `X` → `Y`".
- Avoid backticks, inline code, and code snippets unless the change is non-trivial and cannot be described any other way (e.g. a subtle API contract change, a non-obvious flag, a breaking interface).
- Bullets should describe _what changed and why_, not enumerate every touched file or function.
- If several bullets belong to clearly different concerns, consider whether this should be multiple commits.

---

## Subject line

- Imperative mood: "Add", "Fix", "Remove" — not "Added", "Fixes", "Removing"
- ≤50 chars, no trailing period
- Scope: lowercase noun reflecting the domain, not a filename (e.g. auth, accounts, convex, ui)

---

## Body (optional)

- Include when the _why_ is non-obvious or when listing multiple distinct changes.
- Wrap at 72 chars.
- Omit entirely for single-concern commits where the subject says it all.

---

## Footer

- `BREAKING CHANGE:` — describe the old vs new contract in plain language. Use code only if the interface itself (e.g. a parameter value, function name) cannot be conveyed without it.

---

## What to avoid

| Avoid                                     | Prefer                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Backtick-wrapped identifiers in bullets   | Plain prose: "Rename X to Y"                                              |
| Bullets that are just file/function lists | Bullets that describe behavior change                                     |
| Mixing unrelated changes without grouping | Group by concern, or split commits                                        |
| Arrow notation `X → Y` for renames        | "Rename X to Y"                                                           |
| "Update UI to use X from Y query"         | "Default account badge now reflects the user doc, not the accounts table" |

---

## Workflow

1. Wait for the user to give the diff. Do not generate a diff on your own.
2. Identify the primary concern — if there are multiple unrelated concerns, flag it.
3. Infer the scope from the affected domain, not from filenames.
4. Draft the commit message using changelog tone.
5. Output the commit message only. Do not modify, stage, or commit anything.

---

## Git command rules

- The user must supply the diff. Do not run `git diff`, `git show`, or any command that generates a diff on your own.
- Never run `git commit`, `git add`, `git stage`, or `git push`.
- Other read-only git commands (e.g. `git log`, `git status`, `git blame`) are allowed for extra context on the given diff.
