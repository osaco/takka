/**
 * مخزن تكة — الحدّ الوحيد الذي يربط النطاق النقي بالواجهة.
 * القواعد البيداغوجية تُنفَّذ هنا من `domain`، ولا يُعاد كتابتها داخل الشاشات.
 */
import { create } from 'zustand';
import type { Activity } from '@domain/content/schema';
import type { ProgressRepository } from '@domain/storage/repository';
import type {
  Evidence,
  EvidenceKind,
  Grade,
  LocalReport,
  Profile,
  SessionPlan,
  SessionRecord,
  SkillMastery,
  TemplateId,
} from '@domain/types';
import { PROFILE_SCHEMA_VERSION } from '@domain/types';
import { computeMasteryMap, emptyMastery } from '@domain/mastery';
import {
  createScaffold,
  hintAllowed,
  markHintRequested,
  submitAttempt,
  type ScaffoldState,
} from '@domain/scaffolding';
import { warmSessionSkillIds } from '@domain/review';
import { isLastPhase, planSession } from '@domain/session';
import { endSession } from '@domain/session/end';
import { makeId } from '@domain/random';
import { buildContentIndex, assertContentIndex, type ContentIndex } from '@content/registry';
import { DexieProgressRepository, ensurePersistentStorage } from '@data/dexie-repository';
import { DexiePlacementStore, loadPlacement } from '@data/placement-store';
import {
  DexieIslandStore,
  loadIslandSnapshot,
  saveIslandSnapshot,
  type IslandSnapshot,
} from '@data/island-store';
import {
  applyHqUpgrade,
  createInitialEconomyState,
  createInitialIslandState,
  grantFirstMastery,
  type EconomyState,
  type HqUpgradeOutcome,
  type IslandState,
  type PlacementState,
} from '@domain/island';
import { unlockedLandFor } from './world/stage-view';
import { playRetry, playSuccess } from './sound';

export type ScreenId = 'splash' | 'profile' | 'map' | 'island' | 'session' | 'end' | 'parent';

/** ألقاب رمزية جاهزة — لا أسماء حقيقية، ولا حقل حرّ إلزامي. */
export const SUGGESTED_NICKNAMES = [
  'سنونو',
  'نورس',
  'زيتونة',
  'سنبلة',
  'ياسمين',
  'نجمة',
  'غيمة',
  'فراشة',
] as const;

const LAST_PROFILE_KEY = 'takka.lastProfileId';

/** عدّاد محلي يضمن تفرد معرّفات الأدلة داخل الميلي ثانية نفسها. */
let evidenceSeq = 0;

export interface PhaseRuntime {
  index: number;
  interactionsDone: number;
  /** مؤشر يتقدّم في كل تفاعل لتنويع النشاط داخل المرحلة. */
  cursor: number;
}

export interface RuntimeState {
  screen: ScreenId;
  index: ContentIndex;
  repo: ProgressRepository;
  booted: boolean;
  bootError: string | null;
  profile: Profile | null;
  evidence: Evidence[];
  sessions: SessionRecord[];
  mastery: Record<string, SkillMastery>;
  plan: SessionPlan | null;
  phase: PhaseRuntime;
  scaffold: ScaffoldState;
  hintRequested: boolean;
  attempts: number;
  correct: number;
  hints: number;
  sessionActivityIds: string[];
  sessionStartedAt: number;
  lastFeedback: { kind: 'success' | 'retry'; text: string } | null;
  /** هل أُكمل نشاط المرحلة الحالي؟ (يبقى ظاهراً حتى «متابعة»). */
  activityDone: boolean;
  masteredThisSession: number;
  activeIslandId: string | null;
  reports: LocalReport[];
  notice: string | null;
  /** حالة الجزيرة — تُقرأ وتُرقّى، وتُحفظ مع الاقتصاد في معاملة واحدة. */
  island: IslandState;
  /** اقتصاد الطفل: النجوم والمواد والمهارات التي مُنحت مكافأتها. */
  economy: EconomyState;
  /** مواضع المباني المحمّلة من التخزين، أو null قبل التحميل. */
  placement: PlacementState | null;
}

export interface RuntimeActions {
  boot(): Promise<void>;
  createProfile(nickname: string, grade: Grade): Promise<void>;
  updateProfile(
    patch: Partial<Pick<Profile, 'nickname' | 'audioEnabled' | 'reducedMotion'>>,
  ): Promise<void>;
  deleteProfile(): Promise<void>;
  go(screen: ScreenId): void;
  openIsland(islandId: string | null): void;
  startSession(opts?: { preferredSkillId?: string; warmOnly?: boolean }): Promise<void>;
  currentActivity(): Activity | null;
  currentPhaseSkillId(): string | null;
  phaseAllowsHints(): boolean;
  canHint(): boolean;
  requestHint(): void;
  /** محاولة جزئية: تُعلّم وتُغذّي راجعةً ولا تُنهي تفاعل المرحلة. */
  noteAttempt(correct: boolean): void;
  /** تفاعل كامل: يُنهي تفاعلاً، ويسجّل دليلاً عند النجاح. */
  submit(correct: boolean, opts?: { itemId?: string }): void;
  phaseComplete(): boolean;
  /** جولة أخرى داخل المرحلة نفسها (عندما تحتاج المرحلة تفاعلاً إضافياً). */
  nextRound(): void;
  advancePhase(): void;
  finishSession(stoppedByChild: boolean): Promise<void>;
  /** ترقية برج تكّة: تخصم الموارد وترفع المستوى فوراً، أو تعيد سبب الرفض. */
  upgradeHq(): Promise<HqUpgradeOutcome>;
  exportProgress(): Promise<Blob | null>;
  importProgress(file: Blob): Promise<void>;
  saveLocalReport(message: string): Promise<void>;
  dismissNotice(): void;
}

export type RuntimeStore = RuntimeState & RuntimeActions;

const initialPhase: PhaseRuntime = { index: 0, interactionsDone: 0, cursor: 0 };

function readLastProfileId(): string | null {
  try {
    return globalThis.localStorage?.getItem(LAST_PROFILE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeLastProfileId(id: string | null): void {
  try {
    if (id) globalThis.localStorage?.setItem(LAST_PROFILE_KEY, id);
    else globalThis.localStorage?.removeItem(LAST_PROFILE_KEY);
  } catch {
    /* التخزين المحلي اختياري؛ الملف الرمزي نفسه في Dexie. */
  }
}

function pickActivity(
  index: ContentIndex,
  skillId: string | null,
  seed: number,
  cursor: number,
): Activity | null {
  if (!skillId) return null;
  const list = index.activitiesBySkill.get(skillId);
  if (!list || list.length === 0) return null;
  return list[(seed + cursor) % list.length] ?? list[0] ?? null;
}

function masteredSkillIds(
  mastery: Readonly<Record<string, SkillMastery>>,
): string[] {
  return Object.entries(mastery)
    .filter(([, state]) => state.mastered)
    .map(([skillId]) => skillId);
}

/**
 * يقرأ الجزيرة والاقتصاد معاً، ويصلح ما نقص من سجل الأدلة.
 * الكتابة بعد القراءة تُثبّت المصالحة، فلا تتكرر المكافأة في الإقلاع التالي.
 */
async function readIslandSnapshot(
  profileId: string,
  mastery: Readonly<Record<string, SkillMastery>>,
): Promise<IslandSnapshot> {
  const store = new DexieIslandStore();
  const loaded = await loadIslandSnapshot(store, profileId, masteredSkillIds(mastery));
  const snapshot: IslandSnapshot = { island: loaded.island, economy: loaded.economy };

  if (loaded.islandSource === 'fallback' || loaded.economySource === 'rebuilt') {
    try {
      await saveIslandSnapshot(store, profileId, snapshot);
    } catch {
      /* التخزين قد يكون محجوباً؛ الحالة في الذاكرة تبقى صالحة لهذه الجلسة. */
    }
  }

  return snapshot;
}

async function readPlacementFor(
  profileId: string,
  hqLevel: IslandState['hqLevel'],
): Promise<PlacementState | null> {
  try {
    const loaded = await loadPlacement(
      new DexiePlacementStore(),
      profileId,
      unlockedLandFor(hqLevel),
    );
    return loaded.state;
  } catch {
    return null;
  }
}

export const useRuntime = create<RuntimeStore>((set, get) => {
  /** تسجيل دليل واحد وتحديث الإتقان فوراً — الكتابة أولا، ثم الحالة. */
  const recordEvidence = async (
    skillId: string,
    kind: EvidenceKind,
    templateId: TemplateId,
    itemId: string,
  ): Promise<void> => {
    const { profile, repo, evidence, index, plan, attempts } = get();
    if (!profile) return;
    const at = Date.now();
    const entry: Evidence = {
      id: makeId('ev', (evidenceSeq += 1), at),
      profileId: profile.id,
      skillId,
      sessionId: plan?.id ?? 'session_adhoc',
      at,
      kind,
      templateId,
      itemId,
      attempts: attempts + 1,
      durationMs: Math.max(0, at - (get().sessionStartedAt || at)),
    };
    await repo.saveEvidence(entry);
    const all = [...evidence, entry];
    const next = computeMasteryMap(
      index.skills.map((s) => s.id),
      all,
      at,
    );
    const before = get().mastery[skillId] ?? emptyMastery(skillId);
    const after = next[skillId] ?? emptyMastery(skillId);

    let notice = get().notice;
    if (after.mastered && !before.mastered) {
      const skill = index.bySkillId.get(skillId);
      notice = skill ? `ازدهرت خطوة: ${skill.title}` : 'ازدهرت خطوة جديدة.';
    } else if (after.needsReview && !before.needsReview) {
      notice = 'مهارة قديمة صارت تحتاج مراجعة لطيفة.';
    }

    set({
      evidence: all,
      mastery: next,
      masteredThisSession: get().masteredThisSession + (after.mastered && !before.mastered ? 1 : 0),
      notice,
    });

    // أول إتقان فقط: مكافأة واحدة لكل مهارة، محمية بـ masteredSkills داخل الاقتصاد.
    if (after.mastered && !before.mastered) {
      const current = get().economy;
      const nextEconomy = grantFirstMastery(current, skillId);

      if (nextEconomy !== current) {
        set({ economy: nextEconomy });
        try {
          await saveIslandSnapshot(new DexieIslandStore(), profile.id, {
            island: get().island,
            economy: nextEconomy,
          });
        } catch {
          /* إن فشل الحفظ، تُصلَح المكافأة عند الإقلاع من سجل الأدلة. */
        }
      }
    }
  };

  /** مسار واحد للمحاولة: سقالة + تغذية راجعة + عدّادات، مع أو بلا إنهاء تفاعل. */
  const applyAttempt = (correct: boolean, consumeInteraction: boolean, itemId?: string): void => {
    const {
      plan,
      phase,
      scaffold,
      attempts,
      correct: correctCount,
      sessionActivityIds,
      hintRequested,
    } = get();
    const spec = plan?.phases[phase.index];
    if (!plan || !spec) return;

    const outcome = submitAttempt(scaffold, correct, { requestedHint: hintRequested });
    const activity = get().currentActivity();
    const skillId = spec.skillId;

    // صوت اختياري دائماً، ولا معلومة حصرية بالصوت.
    const audioOn = get().profile?.audioEnabled ?? false;
    if (correct) playSuccess(audioOn);
    else playRetry(audioOn);

    if (consumeInteraction && correct && skillId) {
      void recordEvidence(
        skillId,
        outcome.evidenceKind,
        activity?.template ?? 'listen_identify',
        itemId ?? activity?.id ?? spec.phase,
      );
    }

    set({
      scaffold: outcome.scaffold,
      hintRequested: false,
      attempts: attempts + 1,
      correct: correctCount + (correct ? 1 : 0),
      lastFeedback: activity
        ? correct
          ? { kind: 'success', text: activity.feedback.success }
          : { kind: 'retry', text: activity.feedback.retry }
        : null,
      sessionActivityIds: activity
        ? Array.from(new Set([...sessionActivityIds, activity.id]))
        : sessionActivityIds,
      phase: consumeInteraction
        ? { index: phase.index, interactionsDone: phase.interactionsDone + 1, cursor: phase.cursor }
        : phase,
      activityDone: get().activityDone || (consumeInteraction && correct),
    });
  };

  return {
    screen: 'splash',    index: buildContentIndex(),
    repo: new DexieProgressRepository(),
    booted: false,
    bootError: null,
    profile: null,
    evidence: [],
    sessions: [],
    mastery: {},
    plan: null,
    phase: initialPhase,
    scaffold: createScaffold(false),
    hintRequested: false,
    attempts: 0,
    correct: 0,
    hints: 0,
    sessionActivityIds: [],
    sessionStartedAt: 0,
    lastFeedback: null,
    activityDone: false,
    masteredThisSession: 0,
    activeIslandId: null,
    reports: [],
    notice: null,
    island: createInitialIslandState(),
    economy: createInitialEconomyState(),
    placement: null,

    async boot() {
      const { index, repo } = get();
      try {
        assertContentIndex(index);
      } catch (err) {
        set({
          booted: true,
          bootError: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      void ensurePersistentStorage();

      const profiles = await repo.listProfiles();
      const lastId = readLastProfileId();
      const profile = profiles.find((p) => p.id === lastId) ?? profiles[0] ?? null;
      if (!profile) {
        set({ booted: true, screen: 'profile' });
        return;
      }

      const evidence = await repo.getEvidence(profile.id);
      const mastery = computeMasteryMap(
        index.skills.map((s) => s.id),
        evidence,
        Date.now(),
      );
      const reports = await repo.listReports(profile.id);
      const sessions = await repo.getSessions(profile.id);
      const { island, economy } = await readIslandSnapshot(profile.id, mastery);
      const placement = await readPlacementFor(profile.id, island.hqLevel);

      writeLastProfileId(profile.id);
      set({
        booted: true,
        profile,
        evidence,
        sessions,
        mastery,
        reports,
        island,
        economy,
        placement,
        screen: 'map',
        notice: staleReviewNotice(mastery),
      });
    },

    async createProfile(nickname, grade) {
      const { repo, index } = get();
      const at = Date.now();
      const profile: Profile = {
        id: makeId('profile', nickname.length + grade, at),
        nickname: nickname.trim() || SUGGESTED_NICKNAMES[0],
        grade,
        audioEnabled: true,
        reducedMotion: false,
        createdAt: at,
        schemaVersion: PROFILE_SCHEMA_VERSION,
      };
      await repo.saveProfile(profile);
      writeLastProfileId(profile.id);
      const mastery = computeMasteryMap(
        index.skills.map((s) => s.id),
        [],
        at,
      );
      set({
        profile,
        evidence: [],
        sessions: [],
        mastery,
        reports: [],
        island: createInitialIslandState(),
        economy: createInitialEconomyState(),
        placement: null,
        screen: 'map',
        notice: 'أهلاً بك. كل شيء يبقى على هذا الجهاز، ولا يحتاج إنترنت.',
      });
    },

    async updateProfile(patch) {
      const { repo, profile } = get();
      if (!profile) return;
      const next: Profile = { ...profile, ...patch };
      await repo.saveProfile(next);
      set({ profile: next });
    },

    async deleteProfile() {
      const { repo, profile } = get();
      if (!profile) return;
      await repo.deleteProfile(profile.id);
      writeLastProfileId(null);
      set({
        profile: null,
        evidence: [],
        sessions: [],
        mastery: {},
        reports: [],
        plan: null,
        activeIslandId: null,
        island: createInitialIslandState(),
        economy: createInitialEconomyState(),
        placement: null,
        screen: 'profile',
        notice: null,
      });
    },

    go(screen) {
      set({ screen });
    },

    openIsland(islandId) {
      set(islandId ? { screen: 'island', activeIslandId: islandId } : { screen: 'map', activeIslandId: null });
    },

    async startSession(opts) {
      const { index, profile, mastery, activeIslandId } = get();
      if (!profile) return;

      const scoped = activeIslandId
        ? index.skills.filter((s) => s.islandId === activeIslandId)
        : index.skills;
      const pool = scoped.length > 0 ? scoped : index.skills;

      const now = Date.now();
      const warm = opts?.warmOnly ? warmSessionSkillIds(pool, mastery, now) : [];
      const preferred = warm[0] ?? opts?.preferredSkillId;

      const plan = planSession({
        profileId: profile.id,
        grade: profile.grade,
        skills: pool,
        mastery,
        now,
        seed: now % 1_000_000,
        preferredSkillId: preferred,
      });

      set({
        plan,
        phase: initialPhase,
        scaffold: createScaffold(false),
        hintRequested: false,
        attempts: 0,
        correct: 0,
        hints: 0,
        sessionActivityIds: [],
        sessionStartedAt: now,
        lastFeedback: null,
        activityDone: false,
        masteredThisSession: 0,
        screen: 'session',
        notice: null,
      });

      // أول لقاء بالمهارة الهدف: دليل «وصل إليها» مرة واحدة، ليظهر التقدّم بأمانة.
      const firstSkillId = plan.phases[0]?.skillId;
      if (firstSkillId) {
        await recordEvidence(firstSkillId, 'exposed_only', 'listen_identify', 'session-open');
      }
    },

    currentActivity() {
      const { plan, phase, index } = get();
      const spec = plan?.phases[phase.index];
      if (!plan || !spec) return null;
      return pickActivity(index, spec.skillId, plan.seed, phase.cursor);
    },

    currentPhaseSkillId() {
      const { plan, phase } = get();
      return plan?.phases[phase.index]?.skillId ?? null;
    },

    phaseAllowsHints() {
      const { plan, phase } = get();
      return plan?.phases[phase.index]?.allowHints ?? false;
    },

    canHint() {
      const { scaffold } = get();
      return hintAllowed(get().phaseAllowsHints(), scaffold.level);
    },

    requestHint() {
      const { scaffold, hints } = get();
      set({ scaffold: markHintRequested(scaffold), hintRequested: true, hints: hints + 1 });
    },

    noteAttempt(correct) {
      applyAttempt(correct, false);
    },

    submit(correct, opts) {
      applyAttempt(correct, true, opts?.itemId);
    },

    phaseComplete() {
      const { plan, phase } = get();
      const spec = plan?.phases[phase.index];
      if (!spec) return false;
      return phase.interactionsDone >= spec.interactions;
    },

    nextRound() {
      const { phase } = get();
      set({
        phase: {
          index: phase.index,
          interactionsDone: phase.interactionsDone,
          cursor: phase.cursor + 1,
        },
        hintRequested: false,
        lastFeedback: null,
        activityDone: false,
      });
    },

    advancePhase() {
      const { plan, phase } = get();
      if (!plan) return;
      if (isLastPhase(plan, phase.index)) {
        void get().finishSession(false);
        return;
      }
      set({
        phase: { index: phase.index + 1, interactionsDone: 0, cursor: phase.cursor + 1 },
        scaffold: createScaffold(false),
        hintRequested: false,
        lastFeedback: null,
        activityDone: false,
      });
    },

    async finishSession(stoppedByChild) {
      const {
        plan,
        profile,
        repo,
        phase,
        attempts,
        correct,
        hints,
        sessionActivityIds,
        sessionStartedAt,
      } = get();
      if (!plan || !profile) {
        set({ screen: 'map' });
        return;
      }

      const record = endSession({
        sessionId: plan.id,
        profileId: profile.id,
        grade: profile.grade,
        startedAt: sessionStartedAt || plan.createdAt,
        now: Date.now(),
        targetSkillId: plan.targetSkillId,
        phaseReached: plan.phases[phase.index]?.phase ?? 'close',
        attempts,
        correct,
        hints,
        activityIds: sessionActivityIds,
        stoppedByChild,
      });
      await repo.saveSession(record);
      const sessions = await repo.getSessions(profile.id);
      set({ sessions, screen: 'end' });
    },

    async upgradeHq() {
      const { island, economy, profile } = get();
      if (!profile) {
        return { ok: false, reason: 'NO_PROFILE', quote: null };
      }

      const outcome = applyHqUpgrade(island, economy);
      if (!outcome.ok) return outcome;

      // الكتابة أولاً: لا يرى الطفل برجاً مرفوعاً بلا خصم محفوظ، ولا العكس.
      try {
        const saved = await saveIslandSnapshot(new DexieIslandStore(), profile.id, {
          island: outcome.island,
          economy: outcome.economy,
        });
        if (!saved.ok) {
          return { ok: false, reason: 'SAVE_FAILED', quote: outcome.quote };
        }
      } catch {
        return { ok: false, reason: 'SAVE_FAILED', quote: outcome.quote };
      }

      set({
        island: outcome.island,
        economy: outcome.economy,
        notice: `كبر برج تكّة — صار المستوى ${outcome.island.hqLevel}، وكبرت الجزيرة معه.`,
      });

      return outcome;
    },

    async exportProgress() {
      const { repo, profile } = get();
      if (!profile) return null;
      return repo.exportProfile(profile.id);
    },

    async importProgress(file) {
      const { repo, index } = get();
      const profile = await repo.importProfile(file);
      const evidence = await repo.getEvidence(profile.id);
      const mastery = computeMasteryMap(
        index.skills.map((s) => s.id),
        evidence,
        Date.now(),
      );
      const { island, economy } = await readIslandSnapshot(profile.id, mastery);
      const placement = await readPlacementFor(profile.id, island.hqLevel);
      writeLastProfileId(profile.id);
      set({
        profile,
        evidence,
        mastery,
        island,
        economy,
        placement,
        screen: 'map',
        notice: 'استرجعنا التقدّم من الملف.',
      });
    },

    async saveLocalReport(message) {
      const { repo, profile, plan } = get();
      if (!profile) return;
      const report: LocalReport = {
        id: makeId('report', message.length, Date.now()),
        profileId: profile.id,
        activityId: plan?.targetSkillId ?? 'unknown',
        message,
        createdAt: Date.now(),
        exported: false,
      };
      await repo.saveReport(report);
      set((s) => ({
        reports: [report, ...s.reports],
        notice: 'وصلت الملاحظة وبقيت على هذا الجهاز. شكراً لك.',
      }));
    },

    dismissNotice() {
      set({ notice: null });
    },
  };
});

function staleReviewNotice(mastery: Readonly<Record<string, SkillMastery>>): string | null {
  const stale = Object.values(mastery).filter((m) => m.needsReview).length;
  return stale > 0 ? `${stale} مهارة تنتظر مراجعة هادئة — لا شيء ضائع.` : null;
}
