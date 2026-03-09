import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createBranchExperimentSchema,
  createEvaluationSuiteSchema,
  createExperimentCampaignSchema,
  createExperimentVariantSchema,
  createPolicyPackSchema,
  createPolicyVersionSchema,
  requestPolicyRolloutSchema,
  routeVariantAssignmentSchema,
  runEvaluationSuiteSchema,
  updateBranchExperimentSchema,
  updateEvaluationRunSchema,
  updateExperimentCampaignSchema,
  updateExperimentVariantSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { experimentService, logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

export function experimentRoutes(db: Db) {
  const router = Router();
  const svc = experimentService(db);

  router.get("/companies/:companyId/experiment-campaigns", async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const phase = typeof req.query.phase === "string" ? req.query.phase : undefined;
      const campaigns = await svc.listCampaigns(companyId, phase as any);
      res.json({ campaigns });
    } catch (err) {
      next(err);
    }
  });

  router.post("/companies/:companyId/experiment-campaigns", validate(createExperimentCampaignSchema), async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const campaign = await svc.createCampaign(companyId, {
        ...req.body,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        createdByAgentId: actor.actorType === "agent" ? actor.actorId : null,
      });
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_campaign.created",
        entityType: "experiment_campaign",
        entityId: campaign.id,
        details: { phase: campaign.phase, subjectType: campaign.subjectType, subjectId: campaign.subjectId },
      });
      res.status(201).json(campaign);
    } catch (err) {
      next(err);
    }
  });

  router.get("/experiment-campaigns/:campaignId", async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      res.json(campaign);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/experiment-campaigns/:campaignId", validate(updateExperimentCampaignSchema), async (req, res, next) => {
    try {
      const existing = await svc.getCampaign(req.params.campaignId as string);
      if (!existing) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, existing.companyId);
      const updated = await svc.updateCampaign(existing.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_campaign.updated",
        entityType: "experiment_campaign",
        entityId: existing.id,
        details: req.body,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.get("/experiment-campaigns/:campaignId/variants", async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const variants = await svc.listVariants(campaign.id);
      res.json({ variants });
    } catch (err) {
      next(err);
    }
  });

  router.post("/experiment-campaigns/:campaignId/variants", validate(createExperimentVariantSchema), async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const variant = await svc.createVariant(campaign.companyId, campaign.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: campaign.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_variant.created",
        entityType: "experiment_variant",
        entityId: variant.id,
        details: { campaignId: campaign.id, role: variant.role, trafficPercent: variant.trafficPercent },
      });
      res.status(201).json(variant);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/experiment-variants/:variantId", validate(updateExperimentVariantSchema), async (req, res, next) => {
    try {
      const existing = await svc.getVariant(req.params.variantId as string);
      if (!existing) return res.status(404).json({ error: "Experiment variant not found" });
      assertCompanyAccess(req, existing.companyId);
      const variant = await svc.updateVariant(existing.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_variant.updated",
        entityType: "experiment_variant",
        entityId: existing.id,
        details: req.body,
      });
      res.json(variant);
    } catch (err) {
      next(err);
    }
  });

  router.post("/experiment-variants/:variantId/request-promotion", async (req, res, next) => {
    try {
      const existing = await svc.getVariant(req.params.variantId as string);
      if (!existing) return res.status(404).json({ error: "Experiment variant not found" });
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      const result = await svc.requestVariantPromotion(existing.id, {
        actorId: actor.actorId,
        actorType: actor.actorType,
      });
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_variant.promotion_requested",
        entityType: "experiment_variant",
        entityId: existing.id,
        details: { campaignId: existing.campaignId, approvalId: result?.approvalId ?? null },
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/experiment-variants/:variantId/promote", async (req, res, next) => {
    try {
      const existing = await svc.getVariant(req.params.variantId as string);
      if (!existing) return res.status(404).json({ error: "Experiment variant not found" });
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      const variant = await svc.promoteVariant(existing.id, {
        allowWithoutApproval: req.actor.type === "board",
      });
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "experiment_variant.promoted",
        entityType: "experiment_variant",
        entityId: existing.id,
        details: { campaignId: existing.campaignId },
      });
      res.json(variant);
    } catch (err) {
      next(err);
    }
  });

  router.get("/experiment-campaigns/:campaignId/evaluation-suites", async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const suites = await svc.listEvaluationSuites(campaign.id);
      res.json({ suites });
    } catch (err) {
      next(err);
    }
  });

  router.post("/experiment-campaigns/:campaignId/evaluation-suites", validate(createEvaluationSuiteSchema), async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const suite = await svc.createEvaluationSuite(campaign.companyId, campaign.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: campaign.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "evaluation_suite.created",
        entityType: "evaluation_suite",
        entityId: suite.id,
        details: { campaignId: campaign.id, sourceType: suite.sourceType, mode: suite.mode },
      });
      res.status(201).json(suite);
    } catch (err) {
      next(err);
    }
  });

  router.post("/evaluation-suites/:suiteId/run", validate(runEvaluationSuiteSchema), async (req, res, next) => {
    try {
      const suite = await svc.getEvaluationSuite(req.params.suiteId as string);
      if (!suite) return res.status(404).json({ error: "Evaluation suite not found" });
      assertCompanyAccess(req, suite.companyId);
      const runs = await svc.runEvaluationSuite(suite.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: suite.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "evaluation_suite.executed",
        entityType: "evaluation_suite",
        entityId: suite.id,
        details: { createdRunCount: runs.length },
      });
      res.status(202).json({ runs });
    } catch (err) {
      next(err);
    }
  });

  router.get("/evaluation-suites/:suiteId/runs", async (req, res, next) => {
    try {
      const suite = await svc.getEvaluationSuite(req.params.suiteId as string);
      if (!suite) return res.status(404).json({ error: "Evaluation suite not found" });
      assertCompanyAccess(req, suite.companyId);
      const runs = await svc.listEvaluationRunsForSuite(suite.id);
      res.json({ runs });
    } catch (err) {
      next(err);
    }
  });

  router.get("/evaluation-runs/:runId", async (req, res, next) => {
    try {
      const run = await svc.getEvaluationRun(req.params.runId as string);
      if (!run) return res.status(404).json({ error: "Evaluation run not found" });
      assertCompanyAccess(req, run.companyId);
      res.json(run);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/evaluation-runs/:runId", validate(updateEvaluationRunSchema), async (req, res, next) => {
    try {
      const existing = await svc.getEvaluationRun(req.params.runId as string);
      if (!existing) return res.status(404).json({ error: "Evaluation run not found" });
      assertCompanyAccess(req, existing.companyId);
      const run = await svc.updateEvaluationRun(existing.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "evaluation_run.updated",
        entityType: "evaluation_run",
        entityId: existing.id,
        details: req.body,
      });
      res.json(run);
    } catch (err) {
      next(err);
    }
  });

  router.get("/experiment-campaigns/:campaignId/assignments", async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const assignments = await svc.listAssignments(campaign.id);
      res.json({ assignments });
    } catch (err) {
      next(err);
    }
  });

  router.post("/experiment-campaigns/:campaignId/route", validate(routeVariantAssignmentSchema), async (req, res, next) => {
    try {
      const campaign = await svc.getCampaign(req.params.campaignId as string);
      if (!campaign) return res.status(404).json({ error: "Experiment campaign not found" });
      assertCompanyAccess(req, campaign.companyId);
      const result = await svc.routeVariant(campaign.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: campaign.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "variant_assignment.created",
        entityType: "variant_assignment",
        entityId: result.assignment.id,
        details: { campaignId: campaign.id, variantId: result.variant.id, assignmentType: result.assignment.assignmentType },
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get("/companies/:companyId/policy-packs", async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const policyPacks = await svc.listPolicyPacks(companyId);
      res.json({ policyPacks });
    } catch (err) {
      next(err);
    }
  });

  router.post("/companies/:companyId/policy-packs", validate(createPolicyPackSchema), async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const policyPack = await svc.createPolicyPack(companyId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "policy_pack.created",
        entityType: "policy_pack",
        entityId: policyPack.id,
        details: { targetType: policyPack.targetType, targetId: policyPack.targetId },
      });
      res.status(201).json(policyPack);
    } catch (err) {
      next(err);
    }
  });

  router.get("/policy-packs/:policyPackId", async (req, res, next) => {
    try {
      const policyPack = await svc.getPolicyPack(req.params.policyPackId as string);
      if (!policyPack) return res.status(404).json({ error: "Policy pack not found" });
      assertCompanyAccess(req, policyPack.companyId);
      const versions = await svc.listPolicyVersions(policyPack.id);
      const rollouts = await svc.listPolicyRollouts(policyPack.id);
      res.json({ ...policyPack, versions, rollouts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/policy-packs/:policyPackId/versions", validate(createPolicyVersionSchema), async (req, res, next) => {
    try {
      const policyPack = await svc.getPolicyPack(req.params.policyPackId as string);
      if (!policyPack) return res.status(404).json({ error: "Policy pack not found" });
      assertCompanyAccess(req, policyPack.companyId);
      const actor = getActorInfo(req);
      const version = await svc.createPolicyVersion(policyPack.id, {
        ...req.body,
        companyId: policyPack.companyId,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        createdByAgentId: actor.actorType === "agent" ? actor.actorId : null,
      });
      await logActivity(db, {
        companyId: policyPack.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "policy_version.created",
        entityType: "policy_version",
        entityId: version.id,
        details: { policyPackId: policyPack.id, sequence: version.sequence },
      });
      res.status(201).json(version);
    } catch (err) {
      next(err);
    }
  });

  router.post("/policy-versions/:policyVersionId/request-rollout", validate(requestPolicyRolloutSchema), async (req, res, next) => {
    try {
      const version = await svc.getPolicyVersion(req.params.policyVersionId as string);
      if (!version) return res.status(404).json({ error: "Policy version not found" });
      assertCompanyAccess(req, version.companyId);
      const actor = getActorInfo(req);
      const result = await svc.requestPolicyRollout(version.id, req.body, {
        actorId: actor.actorId,
        actorType: actor.actorType,
        agentId: actor.agentId,
      });
      await logActivity(db, {
        companyId: version.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "policy_rollout.requested",
        entityType: "policy_rollout",
        entityId: result.rollout.id,
        details: { policyVersionId: version.id, approvalId: result.approvalId },
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get("/policy-rollouts/:rolloutId", async (req, res, next) => {
    try {
      const rollout = await svc.getPolicyRollout(req.params.rolloutId as string);
      if (!rollout) return res.status(404).json({ error: "Policy rollout not found" });
      assertCompanyAccess(req, rollout.companyId);
      res.json(rollout);
    } catch (err) {
      next(err);
    }
  });

  router.post("/policy-rollouts/:rolloutId/activate", async (req, res, next) => {
    try {
      const rollout = await svc.getPolicyRollout(req.params.rolloutId as string);
      if (!rollout) return res.status(404).json({ error: "Policy rollout not found" });
      assertCompanyAccess(req, rollout.companyId);
      const actor = getActorInfo(req);
      const activated = await svc.activatePolicyRollout(rollout.id, {
        allowWithoutApproval: req.actor.type === "board",
      });
      await logActivity(db, {
        companyId: rollout.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "policy_rollout.activated",
        entityType: "policy_rollout",
        entityId: rollout.id,
        details: { policyVersionId: rollout.policyVersionId },
      });
      res.json(activated);
    } catch (err) {
      next(err);
    }
  });

  router.get("/companies/:companyId/branch-experiments", async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const branchExperiments = await svc.listBranchExperiments(companyId);
      res.json({ branchExperiments });
    } catch (err) {
      next(err);
    }
  });

  router.post("/companies/:companyId/branch-experiments", validate(createBranchExperimentSchema), async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const branchExperiment = await svc.createBranchExperiment(companyId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "branch_experiment.created",
        entityType: "branch_experiment",
        entityId: branchExperiment.id,
        details: { projectId: branchExperiment.projectId, workspaceId: branchExperiment.workspaceId, branchName: branchExperiment.branchName },
      });
      res.status(201).json(branchExperiment);
    } catch (err) {
      next(err);
    }
  });

  router.get("/branch-experiments/:branchExperimentId", async (req, res, next) => {
    try {
      const branchExperiment = await svc.getBranchExperiment(req.params.branchExperimentId as string);
      if (!branchExperiment) return res.status(404).json({ error: "Branch experiment not found" });
      assertCompanyAccess(req, branchExperiment.companyId);
      res.json(branchExperiment);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/branch-experiments/:branchExperimentId", validate(updateBranchExperimentSchema), async (req, res, next) => {
    try {
      const existing = await svc.getBranchExperiment(req.params.branchExperimentId as string);
      if (!existing) return res.status(404).json({ error: "Branch experiment not found" });
      assertCompanyAccess(req, existing.companyId);
      const branchExperiment = await svc.updateBranchExperiment(existing.id, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "branch_experiment.updated",
        entityType: "branch_experiment",
        entityId: existing.id,
        details: req.body,
      });
      res.json(branchExperiment);
    } catch (err) {
      next(err);
    }
  });

  router.post("/branch-experiments/:branchExperimentId/request-promotion", async (req, res, next) => {
    try {
      const existing = await svc.getBranchExperiment(req.params.branchExperimentId as string);
      if (!existing) return res.status(404).json({ error: "Branch experiment not found" });
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      const branchExperiment = await svc.requestBranchPromotion(existing.id, {
        actorId: actor.actorId,
        actorType: actor.actorType,
      });
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "branch_experiment.promotion_requested",
        entityType: "branch_experiment",
        entityId: existing.id,
        details: { approvalId: branchExperiment?.approvalId ?? null },
      });
      res.status(201).json(branchExperiment);
    } catch (err) {
      next(err);
    }
  });

  router.post("/branch-experiments/:branchExperimentId/promote", async (req, res, next) => {
    try {
      const existing = await svc.getBranchExperiment(req.params.branchExperimentId as string);
      if (!existing) return res.status(404).json({ error: "Branch experiment not found" });
      assertCompanyAccess(req, existing.companyId);
      const actor = getActorInfo(req);
      const branchExperiment = await svc.promoteBranchExperiment(existing.id, {
        allowWithoutApproval: req.actor.type === "board",
      });
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "branch_experiment.promoted",
        entityType: "branch_experiment",
        entityId: existing.id,
        details: { approvalId: existing.approvalId },
      });
      res.json(branchExperiment);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
