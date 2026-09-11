# Repository rulesets

This directory holds the ruleset definition for the main branch.

The JSON file follows the GitHub repository rulesets API schema.
Apply the ruleset with the GitHub UI or with `gh api`.

## Scope

Enforcement is active.
The ruleset applies to `refs/heads/main`.
No bypass actors are set.

## Rules

The ruleset prevents deletion of the branch.
The ruleset prevents non-fast-forward updates.
The ruleset requires a linear history.
The ruleset requires a pull request before merge.

### Pull request parameters

- The ruleset requires one approving review.
- The ruleset requires a code owner review.
- The ruleset requires an extra approval for unattributed changes.
- The ruleset does not dismiss stale reviews after a push.
- The ruleset does not require last-push approval.
- The ruleset does not require review-thread resolution.
- Allowed merge methods are merge, squash, and rebase.

## Apply with GitHub CLI

Replace `OWNER`, `REPO`, `RULESET_ID`, and the JSON path as needed.

Before you send the request, remove GitHub-managed fields from the JSON file.
Remove these fields: `id`, `source`, and `source_type`.

### Create a ruleset

```sh
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/OWNER/REPO/rulesets \
  --input .github/rulesets/<ruleset>.json
```

### Update a ruleset

```sh
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/OWNER/REPO/rulesets/RULESET_ID \
  --input .github/rulesets/<ruleset>.json
```
