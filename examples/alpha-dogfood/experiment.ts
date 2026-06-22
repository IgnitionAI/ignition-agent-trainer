import type {
  AgentAdapter,
  AgentInput,
  DatasetItem,
  MetricResult,
  RewardFunction,
  RunContext,
  RunResult,
} from "@ignitionai/core";
import { createDataset } from "@ignitionai/core";
import { compositeReward, containsAll, costPenalty, latencyPenalty } from "@ignitionai/evals";
import { defineExperiment } from "@ignitionai/experiments";

export type AlphaStrategyName =
  | "direct-answer"
  | "rag-basic"
  | "rag-rerank"
  | "rag-with-verification"
  | "agentic-rag";

interface AlphaCase {
  id: string;
  input: string;
  contains: string[];
  citations: string[];
  taskType: "policy" | "support" | "contract" | "security" | "operations";
  riskLevel: "low" | "medium" | "high";
}

interface StrategyProfile {
  name: AlphaStrategyName;
  latencyMs: number;
  costUsd: number;
  tools: string[];
}

export const alphaCases: AlphaCase[] = [
  {
    id: "refund-window",
    input: "What is the refund window for annual subscriptions?",
    contains: ["30 days", "annual subscription", "billing support"],
    citations: ["billing-handbook.md#refund-window"],
    taskType: "support",
    riskLevel: "medium",
  },
  {
    id: "enterprise-sla",
    input: "Which SLA applies to enterprise customers during a regional outage?",
    contains: ["99.9%", "regional outage", "service credit"],
    citations: ["enterprise-sla.md#availability", "enterprise-sla.md#credits"],
    taskType: "contract",
    riskLevel: "high",
  },
  {
    id: "data-retention",
    input: "How long are workspace audit events retained?",
    contains: ["180 days", "audit events", "workspace"],
    citations: ["security-controls.md#audit-retention"],
    taskType: "security",
    riskLevel: "high",
  },
  {
    id: "billing-export",
    input: "Who can export monthly billing data?",
    contains: ["billing admin", "CSV export", "monthly invoice"],
    citations: ["billing-handbook.md#exports"],
    taskType: "operations",
    riskLevel: "medium",
  },
  {
    id: "user-roles",
    input: "What can an editor do compared with an admin?",
    contains: ["editor", "admin", "cannot manage billing"],
    citations: ["access-control.md#roles"],
    taskType: "support",
    riskLevel: "medium",
  },
  {
    id: "incident-severity",
    input: "When should an incident be classified as SEV-1?",
    contains: ["SEV-1", "customer-facing outage", "incident commander"],
    citations: ["incident-runbook.md#severity"],
    taskType: "operations",
    riskLevel: "high",
  },
  {
    id: "uptime-report",
    input: "Where should uptime reports be published?",
    contains: ["status page", "monthly uptime", "customer portal"],
    citations: ["enterprise-sla.md#reporting"],
    taskType: "operations",
    riskLevel: "low",
  },
  {
    id: "api-rate-limit",
    input: "What is the default API rate limit for standard workspaces?",
    contains: ["600 requests", "per minute", "standard workspace"],
    citations: ["product-docs.md#rate-limits"],
    taskType: "support",
    riskLevel: "medium",
  },
  {
    id: "onboarding-sso",
    input: "What are the SSO prerequisites for onboarding an enterprise tenant?",
    contains: ["SAML metadata", "identity provider", "admin approval"],
    citations: ["onboarding.md#sso"],
    taskType: "operations",
    riskLevel: "medium",
  },
  {
    id: "deletion-request",
    input: "What happens after a customer requests workspace deletion?",
    contains: ["14 day grace period", "workspace deletion", "billing owner"],
    citations: ["security-controls.md#deletion"],
    taskType: "security",
    riskLevel: "high",
  },
  {
    id: "audit-log",
    input: "Which plan includes audit log export?",
    contains: ["enterprise plan", "audit log export", "security admin"],
    citations: ["access-control.md#audit-export"],
    taskType: "security",
    riskLevel: "medium",
  },
  {
    id: "region-hosting",
    input: "Can a customer choose EU data hosting?",
    contains: ["EU region", "tenant creation", "data residency"],
    citations: ["security-controls.md#region-hosting"],
    taskType: "contract",
    riskLevel: "high",
  },
  {
    id: "support-escalation",
    input: "When should support escalate a ticket to engineering?",
    contains: ["reproducible defect", "customer impact", "engineering escalation"],
    citations: ["support-policy.md#engineering-escalation"],
    taskType: "support",
    riskLevel: "medium",
  },
  {
    id: "contract-notice",
    input: "What notice period is required before terminating an enterprise contract?",
    contains: ["60 days", "written notice", "enterprise contract"],
    citations: ["contract-terms.md#termination"],
    taskType: "contract",
    riskLevel: "high",
  },
  {
    id: "renewal-window",
    input: "When does procurement need renewal pricing?",
    contains: ["45 days", "renewal date", "procurement"],
    citations: ["contract-terms.md#renewal"],
    taskType: "contract",
    riskLevel: "medium",
  },
  {
    id: "security-review",
    input: "What evidence is required for a customer security review?",
    contains: ["SOC 2 report", "penetration test summary", "security questionnaire"],
    citations: ["security-controls.md#customer-review"],
    taskType: "security",
    riskLevel: "high",
  },
  {
    id: "integration-webhook",
    input: "How should a customer authenticate webhooks?",
    contains: ["HMAC signature", "webhook secret", "timestamp header"],
    citations: ["product-docs.md#webhooks"],
    taskType: "support",
    riskLevel: "medium",
  },
  {
    id: "knowledge-refresh",
    input: "How often should the help center knowledge base be refreshed?",
    contains: ["weekly refresh", "source documents", "content owner"],
    citations: ["support-policy.md#knowledge-refresh"],
    taskType: "operations",
    riskLevel: "low",
  },
  {
    id: "pii-redaction",
    input: "What should support do before sharing logs externally?",
    contains: ["PII redaction", "customer approval", "external sharing"],
    citations: ["security-controls.md#log-sharing"],
    taskType: "security",
    riskLevel: "high",
  },
  {
    id: "admin-approval",
    input: "Who must approve production workspace changes?",
    contains: ["workspace admin", "change request", "approval"],
    citations: ["access-control.md#admin-approval"],
    taskType: "operations",
    riskLevel: "medium",
  },
  {
    id: "fallback-answer",
    input: "What should the assistant do when a policy citation is missing?",
    contains: ["ask for clarification", "missing citation", "do not guess"],
    citations: ["support-policy.md#missing-citation"],
    taskType: "support",
    riskLevel: "high",
  },
  {
    id: "citation-required",
    input: "Which answers must include citations?",
    contains: ["contract", "security", "billing policy"],
    citations: ["support-policy.md#citation-required"],
    taskType: "policy",
    riskLevel: "high",
  },
  {
    id: "latency-policy",
    input: "What is the target response time for internal assistants?",
    contains: ["two seconds", "internal assistant", "standard question"],
    citations: ["product-docs.md#assistant-latency"],
    taskType: "operations",
    riskLevel: "low",
  },
  {
    id: "cost-guardrail",
    input: "When should an expensive multi-step workflow be avoided?",
    contains: ["low risk", "simple lookup", "cost guardrail"],
    citations: ["product-docs.md#cost-guardrails"],
    taskType: "policy",
    riskLevel: "medium",
  },
];

export const dataset = createDataset({
  name: "alpha-dogfood-document-assistant",
  description: "IgnitionRAG-style document assistant alpha validation dataset.",
  items: alphaCases.map((item) => ({
    id: item.id,
    input: item.input,
    expected: {
      contains: item.contains,
      citations: item.citations,
    },
    metadata: {
      taskType: item.taskType,
      citationRequired: true,
      riskLevel: item.riskLevel,
    },
  })),
});

const strategies: StrategyProfile[] = [
  { name: "direct-answer", latencyMs: 180, costUsd: 0.0005, tools: [] },
  { name: "rag-basic", latencyMs: 760, costUsd: 0.003, tools: ["retrieve_context"] },
  {
    name: "rag-rerank",
    latencyMs: 1120,
    costUsd: 0.0055,
    tools: ["retrieve_context", "rerank_context"],
  },
  {
    name: "rag-with-verification",
    latencyMs: 1750,
    costUsd: 0.009,
    tools: ["retrieve_context", "rerank_context", "verify_grounding"],
  },
  {
    name: "agentic-rag",
    latencyMs: 3200,
    costUsd: 0.025,
    tools: [
      "rewrite_query",
      "retrieve_context",
      "rerank_context",
      "extract_evidence",
      "verify_grounding",
    ],
  },
];

export const variants = strategies.map((strategy) => ({
  id: strategy.name,
  name: strategy.name,
  adapter: createStrategyAdapter(strategy),
}));

const containsReward = containsAll({ name: "contains_all", weight: 0.3 });
const citationReward = citationPresenceReward({ name: "citation_presence", weight: 0.25 });
const groundednessReward = groundednessLikeReward({ name: "groundedness_like", weight: 0.25 });
const latencyReward = latencyPenalty({ name: "latency", maxLatencyMs: 2500, weight: 0.1 });
const costReward = costPenalty({ name: "cost", maxCostUsd: 0.02, weight: 0.1 });

export const rewards = [
  containsReward,
  citationReward,
  groundednessReward,
  latencyReward,
  costReward,
  compositeReward([containsReward, citationReward, groundednessReward, latencyReward, costReward], {
    name: "alpha_composite",
    weight: 1,
  }),
];

const alphaDogfoodExperiment = defineExperiment({
  name: "alpha-dogfood-document-assistant",
  dataset,
  variants,
  rewards,
  options: {
    concurrency: 5,
  },
  metadata: {
    useCase: "IgnitionRAG-style document assistant",
    requiresApiKey: false,
  },
});

export default alphaDogfoodExperiment;

function createStrategyAdapter(strategy: StrategyProfile): AgentAdapter {
  return {
    name: strategy.name,
    run(input: AgentInput, _context: RunContext) {
      return {
        output: answerFor(input, strategy.name),
        trace: {
          steps: [
            {
              type: "message",
              role: "user",
              content: input.input,
            },
            ...strategy.tools.map((tool) => ({
              type: "tool_call" as const,
              name: tool,
              input: { caseId: input.id, query: input.input },
            })),
            ...(strategy.tools.includes("verify_grounding")
              ? [
                  {
                    type: "decision" as const,
                    action: "verify_grounding",
                    reason: "Check answer claims against retrieved citations before responding.",
                    confidence: strategy.name === "agentic-rag" ? 0.96 : 0.91,
                  },
                ]
              : []),
            {
              type: "message" as const,
              role: "assistant" as const,
              content: `Final answer produced by ${strategy.name}.`,
            },
          ],
        },
        usage: {
          latencyMs: strategy.latencyMs,
          costUsd: strategy.costUsd,
        },
        metadata: {
          strategy: strategy.name,
          apiKeyRequired: false,
        },
      };
    },
  };
}

function answerFor(input: AgentInput, strategy: AlphaStrategyName): string {
  const required = input.expected?.contains ?? [];
  const citations = input.expected?.citations ?? [];
  const firstCitation = citations[0];

  if (strategy === "direct-answer") {
    return `Based on general product knowledge, the answer likely involves ${required[0]}.`;
  }

  if (strategy === "rag-basic") {
    return `${required.slice(0, 2).join(" and ")} are the key policy details. ${
      firstCitation ? `[${firstCitation}]` : ""
    }`;
  }

  if (strategy === "rag-rerank") {
    return `${required.join(", ")}. Reranked evidence supports the answer. ${
      firstCitation ? `[${firstCitation}]` : ""
    }`;
  }

  if (strategy === "rag-with-verification") {
    return `${required.join(", ")}. Verified against retrieved source text. ${citations
      .map((citation) => `[${citation}]`)
      .join(" ")}`;
  }

  return `${required.join(", ")}. The agent rewrote the query, retrieved evidence, reranked passages, extracted facts and verified support before answering. ${citations
    .map((citation) => `[${citation}]`)
    .join(" ")}`;
}

function citationPresenceReward(options: { name: string; weight: number }): RewardFunction {
  return {
    name: options.name,
    weight: options.weight,
    evaluate(run: RunResult, item: DatasetItem) {
      const expectedCitations = item.expected?.citations ?? [];
      if (expectedCitations.length === 0) {
        return metric(options.name, 0, options.weight, "No expected citations were provided.");
      }

      const output = textOutput(run).toLowerCase();
      const hits = expectedCitations.filter((citation) => output.includes(citation.toLowerCase()));
      return metric(
        options.name,
        hits.length / expectedCitations.length,
        options.weight,
        `${hits.length}/${expectedCitations.length} citations found.`,
        {
          hits,
          missing: expectedCitations.filter((citation) => !hits.includes(citation)),
        },
      );
    },
  };
}

function groundednessLikeReward(options: { name: string; weight: number }): RewardFunction {
  return {
    name: options.name,
    weight: options.weight,
    evaluate(run: RunResult, item: DatasetItem) {
      const output = textOutput(run).toLowerCase();
      const required = item.expected?.contains ?? [];
      const expectedCitations = item.expected?.citations ?? [];
      const containsCoverage =
        required.length === 0
          ? 0
          : required.filter((value) => output.includes(value.toLowerCase())).length /
            required.length;
      const citationCoverage =
        expectedCitations.length === 0
          ? 0
          : expectedCitations.filter((citation) => output.includes(citation.toLowerCase())).length /
            expectedCitations.length;
      const toolNames = run.trace.steps
        .filter((step) => step.type === "tool_call")
        .map((step) => step.name);
      const hasRetrieval = toolNames.includes("retrieve_context") ? 1 : 0;
      const hasVerification = toolNames.includes("verify_grounding") ? 1 : 0;
      const score =
        containsCoverage * 0.3 +
        citationCoverage * 0.4 +
        hasRetrieval * 0.2 +
        hasVerification * 0.1;

      return metric(options.name, score, options.weight, "Deterministic groundedness proxy.", {
        containsCoverage,
        citationCoverage,
        hasRetrieval: Boolean(hasRetrieval),
        hasVerification: Boolean(hasVerification),
      });
    },
  };
}

function metric(
  name: string,
  score: number,
  weight: number,
  reason: string,
  metadata?: Record<string, unknown>,
): MetricResult {
  return {
    name,
    score: Math.max(0, Math.min(1, score)),
    weight,
    passed: score >= 0.8,
    reason,
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

function textOutput(run: RunResult): string {
  return typeof run.output === "string" ? run.output : JSON.stringify(run.output);
}
