import type {
  BranchExperiment,
  EvaluationRun,
  EvaluationSuite,
  ExperimentCampaign,
  ExperimentVariant,
  PolicyPack,
  PolicyRollout,
  PolicyVersion,
  VariantAssignment,
} from "@paperclipai/shared";
import { api } from "./client";

export type PolicyPackDetail = PolicyPack & {
  versions: PolicyVersion[];
  rollouts: PolicyRollout[];
};

export const experimentsApi = {
  listCampaigns: (companyId: string, phase?: string) =>
    api
      .get<{ campaigns: ExperimentCampaign[] }>(`/companies/${companyId}/experiment-campaigns${phase ? `?phase=${encodeURIComponent(phase)}` : ""}`)
      .then((r) => r.campaigns),
  createCampaign: (companyId: string, data: Record<string, unknown>) =>
    api.post<ExperimentCampaign>(`/companies/${companyId}/experiment-campaigns`, data),
  updateCampaign: (campaignId: string, data: Record<string, unknown>) =>
    api.patch<ExperimentCampaign>(`/experiment-campaigns/${campaignId}`, data),

  listVariants: (campaignId: string) =>
    api.get<{ variants: ExperimentVariant[] }>(`/experiment-campaigns/${campaignId}/variants`).then((r) => r.variants),
  createVariant: (campaignId: string, data: Record<string, unknown>) =>
    api.post<ExperimentVariant>(`/experiment-campaigns/${campaignId}/variants`, data),
  updateVariant: (variantId: string, data: Record<string, unknown>) =>
    api.patch<ExperimentVariant>(`/experiment-variants/${variantId}`, data),
  requestVariantPromotion: (variantId: string) =>
    api.post<{ approvalId: string | null }>(`/experiment-variants/${variantId}/request-promotion`, {}),
  promoteVariant: (variantId: string) =>
    api.post<ExperimentVariant>(`/experiment-variants/${variantId}/promote`, {}),

  listEvaluationSuites: (campaignId: string) =>
    api.get<{ suites: EvaluationSuite[] }>(`/experiment-campaigns/${campaignId}/evaluation-suites`).then((r) => r.suites),
  createEvaluationSuite: (campaignId: string, data: Record<string, unknown>) =>
    api.post<EvaluationSuite>(`/experiment-campaigns/${campaignId}/evaluation-suites`, data),
  runEvaluationSuite: (suiteId: string, data: Record<string, unknown> = {}) =>
    api.post<{ runs: EvaluationRun[] }>(`/evaluation-suites/${suiteId}/run`, data),
  listEvaluationRuns: (suiteId: string) =>
    api.get<{ runs: EvaluationRun[] }>(`/evaluation-suites/${suiteId}/runs`).then((r) => r.runs),
  updateEvaluationRun: (runId: string, data: Record<string, unknown>) =>
    api.patch<EvaluationRun>(`/evaluation-runs/${runId}`, data),

  listAssignments: (campaignId: string) =>
    api.get<{ assignments: VariantAssignment[] }>(`/experiment-campaigns/${campaignId}/assignments`).then((r) => r.assignments),

  listPolicyPacks: (companyId: string) =>
    api.get<{ policyPacks: PolicyPack[] }>(`/companies/${companyId}/policy-packs`).then((r) => r.policyPacks),
  getPolicyPack: (policyPackId: string) => api.get<PolicyPackDetail>(`/policy-packs/${policyPackId}`),
  createPolicyPack: (companyId: string, data: Record<string, unknown>) =>
    api.post<PolicyPack>(`/companies/${companyId}/policy-packs`, data),
  createPolicyVersion: (policyPackId: string, data: Record<string, unknown>) =>
    api.post<PolicyVersion>(`/policy-packs/${policyPackId}/versions`, data),
  requestPolicyRollout: (policyVersionId: string, data: Record<string, unknown>) =>
    api.post<{ rollout: PolicyRollout; approvalId: string | null }>(`/policy-versions/${policyVersionId}/request-rollout`, data),
  activatePolicyRollout: (rolloutId: string) =>
    api.post<PolicyRollout>(`/policy-rollouts/${rolloutId}/activate`, {}),

  listBranchExperiments: (companyId: string) =>
    api.get<{ branchExperiments: BranchExperiment[] }>(`/companies/${companyId}/branch-experiments`).then((r) => r.branchExperiments),
  createBranchExperiment: (companyId: string, data: Record<string, unknown>) =>
    api.post<BranchExperiment>(`/companies/${companyId}/branch-experiments`, data),
  updateBranchExperiment: (branchExperimentId: string, data: Record<string, unknown>) =>
    api.patch<BranchExperiment>(`/branch-experiments/${branchExperimentId}`, data),
  requestBranchPromotion: (branchExperimentId: string) =>
    api.post<BranchExperiment>(`/branch-experiments/${branchExperimentId}/request-promotion`, {}),
  promoteBranchExperiment: (branchExperimentId: string) =>
    api.post<BranchExperiment>(`/branch-experiments/${branchExperimentId}/promote`, {}),
};
