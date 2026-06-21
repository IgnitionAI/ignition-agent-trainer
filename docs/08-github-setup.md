# GitHub setup

The connected GitHub tool available in this environment can read/search repositories but cannot create a new repository or push commits.

To create the repo manually:

```bash
cd ignition-agent-trainer
git init
git add .
git commit -m "chore: initial ignition agent trainer scaffold"
```

Create a GitHub repo with the GitHub CLI:

```bash
gh repo create salim4n/ignition-agent-trainer \
  --private \
  --source=. \
  --remote=origin \
  --push
```

Or create it in the GitHub UI, then:

```bash
git remote add origin git@github.com:salim4n/ignition-agent-trainer.git
git branch -M main
git push -u origin main
```

Recommended repo settings:

- default branch: `main`,
- squash merge enabled,
- branch protection after first CI pass,
- required check: `CI / test`,
- private while API stabilizes,
- public once the first example and README are solid.
