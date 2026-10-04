# Local policy artifacts and registry

The experimental RL package exports `createPolicyArtifact`, `parsePolicyArtifact`,
`loadPolicyArtifact`, `comparePolicyBaseline`, and `LocalPolicyRegistry`.

Artifacts use schema version 1 and identify tabular or linear Q-learning, learned
parameters, encoder id/version/parameters, complete action registry, training
hyperparameters, seeds, data provenance, reward configuration and evaluation
report reference. Their identity is the SHA-256 of canonical finite JSON. Unknown
fields, schema versions, duplicate table states/actions, non-finite values and
inconsistent linear dimensions are refused. The checksum detects corruption;
it does not authenticate data provenance or report authorship.

Loading requires an explicitly registered runtime encoder with an exactly matching
descriptor and action registry. Pure encoder and action binder functions are
application code, never executable content embedded in an artifact. Include the
binder version in encoder parameters when argument binding is used. For linear
policies, include fitted normalization/category definitions in those parameters
and construct the compatible encoder from that public descriptor. No calibration
observations or private task content are needed. Callers own the truth of this
function-to-descriptor association; an artifact cannot validate arbitrary code.
The loaded policy is detached and greedy, with lexical tie-breaking and current
available-action masks, just as the original frozen policy.

`register` writes an immutable content-addressed version. `initialize` explicitly
pins a baseline once; registration alone never changes active policy. `promote`
accepts observed aggregate metrics on a named independent corpus and an explicit
candidate evaluation report reference. It revalidates both artifacts, pins the
baseline to the current active identity, and requires compatible algorithm/encoder/actions,
reward configuration and evidence mode. Success, reward and tool thresholds are
mandatory; a cost threshold may be null when cost is not available. Requiring a
cost threshold with incomplete costs blocks promotion. Both failed and passed
gates preserve all thresholds and reasons in content-addressed local reports.
Metrics supplied by callers are not automatically authenticated; use the real
trajectory evidence protocol before considering a real deployment.

An exclusive `.writer.lock` refuses concurrent pointer mutations. Promotion and
rollback write and fsync a temporary pointer, then atomically rename it within the
registry directory and fsync that directory. Before commit an interrupted writer
leaves the old pointer; after commit it leaves the new pointer. Rollback restores
the preceding active artifact and its baseline identity, then clears the one-step
rollback slot. A later promotion establishes another rollback slot. Immutability
means registering an existing damaged file fails rather than silently repairing
it. Readers validate active artifact checksums. This requires a local filesystem
with atomic same-directory rename and fsync support, not a cloud object store.

After a killed process, a stale writer lock may remain. Readers still work; further
mutations fail closed. An operator must confirm no writer is alive before moving
the stale lock to Trash. Incomplete staging files are never read as active.
Initial registry creation must complete successfully before it is exposed to
readers. This provides a local recovery workflow, not a production rollout system.

Run the executable lifecycle on a new directory:

```sh
bun examples/react-policy-optimization/src/registry.ts /tmp/policy-lifecycle-new
```

It trains on six synthetic order tasks, reloads on 24 independent tasks, compares
against a pinned untrained baseline with explicit tool allowance, promotes
explicitly and rolls back. The report includes seeds, task ids, artifact ids,
thresholds and decision-preservation checks. It labels all evidence synthetic;
this demonstrates local lifecycle behavior and does not prove an IgnitionRAG gain.
