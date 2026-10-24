"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Compass, Download, Home, LogIn,
  LogOut, Plus, Settings, ShieldCheck, Sparkles, Star, Trees, X,
} from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { FatinMark, IslandIllustration } from "@/components/island-illustration";
import { LessonPlayer } from "@/components/lesson-player";
import { BUILDINGS, createInitialProgress, INITIAL_BUILDING_LEVELS, LESSONS } from "@/lib/demo-content";
import { addPendingAttempt, clearAllTakkaLocalData, clearChildLocalData, readPendingAttempts, readProgress, removePendingAttempt, writeProgress } from "@/lib/progress-store";
import { isCloudAccountsEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import type { AuthPanelMode, AuthUser, BuildingKey, ChildProfile, LocalProgress, PendingAttempt } from "@/lib/types";

type Screen = "loading" | "landing" | "setup" | "island" | "missions" | "parent" | "settings";
type RewardMoment = { title: string; description: string; tokens: string[]; chest: boolean };
type GuestSession = { id: string; audio_enabled: boolean };
type IslandPosition = "shore" | "garden" | "near-homes";

const GUEST_KEY = "takka.preview-session.v1";
const ACTIVE_CHILD_KEY = "takka.active-child.v1";
const AVATARS = ["🐢", "🦊", "🐈", "🦉", "🐙", "🦋"];
const ITEM_LABELS: Record<string, { name: string; icon: string }> = {
  "flower-patch": { name: "رقعة زهور", icon: "🌼" },
  "stone-path": { name: "ممر حجري", icon: "🪨" },
  "tiny-lantern": { name: "فانوس الحكاية", icon: "🏮" },
  "sea-lantern": { name: "فانوس البحر", icon: "🪸" },
};
const MILESTONE_KEY = "three-stations";
const POSITIONS: Array<{ key: IslandPosition; label: string }> = [
  { key: "shore", label: "قرب الشاطئ" },
  { key: "garden", label: "وسط الجزيرة" },
  { key: "near-homes", label: "قرب البيوت" },
];

function parseGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(window.localStorage.getItem(GUEST_KEY) ?? "null") as GuestSession | null;
    return session && session.id ? session : null;
  } catch {
    return null;
  }
}

function previewChild(session: GuestSession): ChildProfile {
  return { id: session.id, nickname: "زائر", avatar_key: "🐢", grade: 1, audio_enabled: session.audio_enabled };
}

function profileFromRow(row: Record<string, unknown>): ChildProfile {
  return {
    id: String(row.id),
    guardian_id: String(row.guardian_id),
    nickname: String(row.nickname ?? "صغير تكة"),
    avatar_key: String(row.avatar_key ?? "🐢"),
    grade: Number(row.grade ?? 1),
    audio_enabled: Boolean(row.audio_enabled ?? true),
  };
}

async function fetchCloudProgress(client: NonNullable<ReturnType<typeof createClient>>, child: ChildProfile): Promise<LocalProgress> {
  const [attemptResult, buildingResult, itemResult, rewardResult] = await Promise.all([
    client.from("activity_attempts").select("activity_id,stars_earned,planks_earned,help_used").eq("child_id", child.id).eq("outcome", "completed"),
    client.from("child_building_state").select("building_key,level,planks_spent").eq("child_id", child.id),
    client.from("child_island_state").select("item_id,placement").eq("child_id", child.id),
    client.from("reward_unlocks").select("milestone_key").eq("child_id", child.id),
  ]);
  const failure = attemptResult.error ?? buildingResult.error ?? itemResult.error ?? rewardResult.error;
  if (failure) throw failure;

  const attempts = attemptResult.data ?? [];
  const completedLessonIds = LESSONS.filter((lesson) => attempts.some((attempt) => attempt.activity_id === lesson.activityId)).map((lesson) => lesson.id);
  const assistedLessonIds = LESSONS.filter((lesson) => attempts.some((attempt) => attempt.activity_id === lesson.activityId && attempt.help_used)).map((lesson) => lesson.id);
  const buildingLevels = { ...INITIAL_BUILDING_LEVELS };
  for (const row of buildingResult.data ?? []) {
    if (row.building_key in buildingLevels) buildingLevels[row.building_key as BuildingKey] = Number(row.level);
  }
  const claimed = (rewardResult.data ?? []).map((reward) => reward.milestone_key);
  const itemIds = new Set((itemResult.data ?? []).map((item) => item.item_id));
  const placedItems = LESSONS.filter((lesson) => itemIds.has(lesson.reward.itemId)).map((lesson) => lesson.reward.itemKey);
  if (itemIds.has("70000000-0000-4000-8000-000000000004")) placedItems.push("sea-lantern");
  const itemPlacements: LocalProgress["itemPlacements"] = {};
  for (const key of placedItems) {
    const itemId = LESSONS.find((lesson) => lesson.reward.itemKey === key)?.reward.itemId ?? (key === "sea-lantern" ? "70000000-0000-4000-8000-000000000004" : "");
    const row = (itemResult.data ?? []).find((item) => item.item_id === itemId);
    const value = row?.placement;
    const position = value && typeof value === "object" && !Array.isArray(value) ? value.position : null;
    itemPlacements[key] = POSITIONS.some((option) => option.key === position) ? position as IslandPosition : "shore";
  }

  const levelSpent = (buildingResult.data ?? []).reduce((sum, row) => sum + Number(row.planks_spent ?? 0), 0);
  return {
    ...createInitialProgress(child.id, child.nickname, child.audio_enabled),
    completedLessonIds,
    masteredSkillIds: [],
    assistedLessonIds,
    buildingLevels,
    stars: attempts.reduce((sum, attempt) => sum + Number(attempt.stars_earned ?? 0), 0),
    planks: attempts.reduce((sum, attempt) => sum + Number(attempt.planks_earned ?? 0), 0) + (claimed.includes(MILESTONE_KEY) ? 3 : 0) - levelSpent,
    placedItems,
    itemPlacements,
    milestonesClaimed: claimed,
    audioEnabled: child.audio_enabled,
  };
}

function textForLevel(level: number) {
  if (level >= 3) return "مزدهر";
  if (level === 2) return "ينمو";
  return level === 1 ? "بدأ يكبر" : "ينتظرك";
}

export function TakkaApp() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [guardian, setGuardian] = useState<AuthUser | null>(null);
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [authMode, setAuthMode] = useState<AuthPanelMode | null>(null);
  const [activeLesson, setActiveLesson] = useState<(typeof LESSONS)[number] | null>(null);
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupGrade, setSetupGrade] = useState(1);
  const [setupAvatar, setSetupAvatar] = useState(AVATARS[0]);
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState(1);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const syncingAttempts = useRef(new Set<string>());
  const configured = isCloudAccountsEnabled();

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4200);
  }, []);

  const activateChild = useCallback((nextChild: ChildProfile, nextProgress: LocalProgress, nextScreen: Screen = "island") => {
    setChild(nextChild);
    setProgress(nextProgress);
    writeProgress(nextProgress);
    window.localStorage.setItem(ACTIVE_CHILD_KEY, nextChild.id);
    setScreen(nextScreen);
  }, []);

  const loadCloudChild = useCallback(async (nextChild: ChildProfile) => {
    const client = createClient();
    if (!client) throw new Error("خدمة الحسابات غير مربوطة بعد.");
    const nextProgress = await fetchCloudProgress(client, nextChild);
    activateChild(nextChild, nextProgress);
  }, [activateChild]);

  const bootstrapGuardian = useCallback(async (user: AuthUser) => {
    const client = createClient();
    if (!client) return;
    setGuardian(user);
    setAuthMode(null);
    setBusy(true);
    try {
      const { error: profileError } = await client.from("guardian_profiles").upsert({ id: user.id }, { onConflict: "id" });
      if (profileError) throw profileError;
      const { data, error } = await client.from("child_profiles").select("id,guardian_id,nickname,avatar_key,grade,audio_enabled").is("archived_at", null).order("created_at", { ascending: true });
      if (error) throw error;
      const nextChildren = (data ?? []).map((row) => profileFromRow(row as Record<string, unknown>));
      setChildren(nextChildren);
      const activeId = window.localStorage.getItem(ACTIVE_CHILD_KEY);
      const selected = nextChildren.find((item) => item.id === activeId) ?? nextChildren[0];
      if (selected) await loadCloudChild(selected);
      else {
        setChild(null);
        setProgress(null);
        setScreen("setup");
      }

    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تحميل حساب الأسرة.");
    } finally {
      setBusy(false);
    }
  }, [loadCloudChild, showToast]);

  useEffect(() => {
    let live = true;
    const onlineListener = () => setOnline(true);
    const offlineListener = () => setOnline(false);
    const statusTimer = window.setTimeout(() => setOnline(navigator.onLine), 0);
    window.addEventListener("online", onlineListener);
    window.addEventListener("offline", offlineListener);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    async function initialize() {
      const guest = parseGuestSession();
      if (configured) {
        const client = createClient();
        if (client) {
          const { data } = await client.auth.getUser();
          if (live && data.user) {
            await bootstrapGuardian({ id: data.user.id, email: data.user.email ?? "" });
            return;
          }
        }
      }
      if (!live) return;
      if (guest) {
        const profile = previewChild(guest);
        const local = readProgress(profile.id, profile.nickname, profile.audio_enabled);
        activateChild(profile, local);
      } else setScreen("landing");
    }
    void initialize().catch((error: unknown) => {
      if (!live) return;
      setScreen("landing");
      showToast(error instanceof Error ? error.message : "تعذر فتح تكة الآن.");
    });

    return () => {
      live = false;
      window.clearTimeout(statusTimer);
      window.removeEventListener("online", onlineListener);
      window.removeEventListener("offline", offlineListener);
    };
  }, [activateChild, bootstrapGuardian, configured, showToast]);

  useEffect(() => {
    if (!guardian || !online || children.length === 0) return;
    const client = createClient();
    if (!client) return;
    let live = true;
    for (const attempt of readPendingAttempts()) {
      if (!children.some((profile) => profile.id === attempt.child_id) || syncingAttempts.current.has(attempt.id)) continue;
      syncingAttempts.current.add(attempt.id);
      void (async () => {
        try {
          const { error } = await client.rpc("complete_activity_attempt", {
            p_attempt_id: attempt.id,
            p_child_id: attempt.child_id,
            p_activity_id: attempt.activity_id,
            p_responses: attempt.answers,
            p_help_used: attempt.help_used,
            p_started_at: attempt.started_at,
            p_completed_at: attempt.completed_at,
          });
          if (!live || error) return;
          removePendingAttempt(attempt.id);
          if (child?.id === attempt.child_id) await loadCloudChild(child);
        } catch { /* The queue remains available for the next connection attempt. */ }
        finally { syncingAttempts.current.delete(attempt.id); }
      })();
    }
    return () => { live = false; };
  }, [child, children, guardian, loadCloudChild, online]);

  const completedLessons = useMemo(() => progress ? LESSONS.filter((lesson) => progress.completedLessonIds.includes(lesson.id)) : [], [progress]);
  const nextLesson = useMemo(() => progress ? LESSONS.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? null : null, [progress]);

  function enterGuestPreview() {
    const session = parseGuestSession() ?? { id: crypto.randomUUID(), audio_enabled: true };
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(session));
    const profile = previewChild(session);
    activateChild(profile, readProgress(profile.id, profile.nickname, profile.audio_enabled));
  }

  async function saveFirstChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardian) {
      setScreen("landing");
      return;
    }
    const nickname = setupName.trim();
    if (!nickname) return;
    setBusy(true);
    const client = createClient();
    try {
      let profile: ChildProfile;
      if (client) {
        const { data, error } = await client.from("child_profiles").insert({
          guardian_id: guardian.id,
          nickname,
          avatar_key: setupAvatar,
          grade: setupGrade,
          audio_enabled: true,
        }).select("id,guardian_id,nickname,avatar_key,grade,audio_enabled").single();
        if (error) throw error;
        profile = profileFromRow(data as Record<string, unknown>);
        setChildren((current) => [...current, profile]);
      } else throw new Error("خدمة حساب ولي الأمر غير مربوطة.");
      const initial = createInitialProgress(profile.id, profile.nickname, true);
      activateChild(profile, initial);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر إنشاء ملف الطفل.");
    } finally {
      setBusy(false);
    }
  }

  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardian || !newChildName.trim()) return;
    const client = createClient();
    if (!client) return;
    setBusy(true);
    try {
      const { data, error } = await client.from("child_profiles").insert({ guardian_id: guardian.id, nickname: newChildName.trim(), avatar_key: "🐢", grade: newChildGrade, audio_enabled: true }).select("id,guardian_id,nickname,avatar_key,grade,audio_enabled").single();
      if (error) throw error;
      const profile = profileFromRow(data as Record<string, unknown>);
      setChildren((current) => [...current, profile]);
      setNewChildName("");
      setNewChildGrade(1);
      await loadCloudChild(profile);
      setScreen("parent");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر إضافة الملف.");
    } finally {
      setBusy(false);
    }
  }

  async function saveChildEdit(profile: ChildProfile, nickname: string, grade: number) {
    if (!guardian) return;
    const client = createClient();
    if (!client) return;
    setBusy(true);
    try {
      const { error } = await client.from("child_profiles").update({ nickname, grade }).eq("id", profile.id);
      if (error) throw error;
      const updated = { ...profile, nickname, grade };
      setChildren((current) => current.map((item) => item.id === profile.id ? updated : item));
      if (child?.id === profile.id && progress) {
        const nextProgress = { ...progress, childName: nickname };
        setChild(updated);
        setProgress(nextProgress);
        writeProgress(nextProgress);
      }
      setEditingChildId(null);
      showToast("تم تحديث ملف الطفل.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تحديث ملف الطفل.");
    } finally {
      setBusy(false);
    }
  }

  async function selectChild(nextChild: ChildProfile) {
    if (guardian) {
      setBusy(true);
      try {
        await loadCloudChild(nextChild);
        setScreen("parent");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "تعذر فتح ملف الطفل.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const guest = parseGuestSession();
    if (guest?.id === nextChild.id) activateChild(nextChild, readProgress(nextChild.id, nextChild.nickname, nextChild.audio_enabled));
  }

  async function updateAudio(enabled: boolean) {
    if (!child || !progress) return;
    const nextChild = { ...child, audio_enabled: enabled };
    const nextProgress = { ...progress, audioEnabled: enabled };
    setChild(nextChild);
    setProgress(nextProgress);
    writeProgress(nextProgress);
    if (guardian) {
      const client = createClient();
      if (client) {
        const { error } = await client.from("child_profiles").update({ audio_enabled: enabled }).eq("id", child.id);
        if (error) showToast("حفظنا التغيير على هذا الجهاز، وتعذرت مزامنته الآن.");
      }
      setChildren((current) => current.map((item) => item.id === child.id ? nextChild : item));
    } else {
      const guest = parseGuestSession();
      if (guest?.id === child.id) window.localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guest, audio_enabled: enabled }));
    }
  }

  async function upgradeBuilding(key: BuildingKey) {
    if (!child || !progress) return;
    if (progress.planks < 2) {
      showToast("تحتاج إلى لوحين خشبيين. تكسبهما من محطات التعلم.");
      return;
    }
    const current = progress.buildingLevels[key];
    if (current >= 3) {
      showToast("وصل هذا المبنى إلى مرحلته الحالية الأخيرة.");
      return;
    }
    if (guardian) {
      const client = createClient();
      if (!client || !online) {
        showToast("تطوير مبنى محفوظ في حساب الأسرة يحتاج اتصالاً بالإنترنت.");
        return;
      }
      setBusy(true);
      const { data, error } = await client.rpc("upgrade_child_building", { p_child_id: child.id, p_building_key: key, p_expected_level: current });
      setBusy(false);
      if (error) {
        showToast(error.message.includes("not_enough_planks") ? "تحتاج إلى لوحين غير مستخدمين لتطوير هذا البيت." : "تعذر تطوير البيت الآن.");
        return;
      }
      const result = data as { planks_balance?: number };
      const nextProgress = { ...progress, planks: result.planks_balance ?? progress.planks - 2, buildingLevels: { ...progress.buildingLevels, [key]: current + 1 } };
      setProgress(nextProgress);
      writeProgress(nextProgress);
    } else {
      const nextProgress = { ...progress, planks: progress.planks - 2, buildingLevels: { ...progress.buildingLevels, [key]: current + 1 } };
      setProgress(nextProgress);
      writeProgress(nextProgress);
    }
    showToast("كبر المبنى! الجزيرة صارت أقرب لما تخيلته.");
  }

  async function placeIslandItem(itemKey: string, position: IslandPosition) {
    if (!child || !progress || progress.itemPlacements[itemKey] === position) return;
    const itemId = LESSONS.find((lesson) => lesson.reward.itemKey === itemKey)?.reward.itemId
      ?? (itemKey === "sea-lantern" ? "70000000-0000-4000-8000-000000000004" : null);
    if (!itemId) return;
    if (guardian) {
      const client = createClient();
      if (!client || !online) {
        showToast("حرّك الزينة بعد عودة الاتصال حتى نحفظ مكانها على حساب الأسرة.");
        return;
      }
      const { error } = await client.rpc("place_island_item", { p_child_id: child.id, p_item_id: itemId, p_position: position });
      if (error) {
        showToast("تعذر حفظ مكان الزينة الآن.");
        return;
      }
    }
    const nextProgress = { ...progress, itemPlacements: { ...progress.itemPlacements, [itemKey]: position } };
    setProgress(nextProgress);
    writeProgress(nextProgress);
  }

  async function syncAttempt(attempt: PendingAttempt) {
    const client = createClient();
    if (!client) return;
    if (syncingAttempts.current.has(attempt.id)) return;
    syncingAttempts.current.add(attempt.id);
    try {
      const { data, error } = await client.rpc("complete_activity_attempt", {
        p_attempt_id: attempt.id,
        p_child_id: attempt.child_id,
        p_activity_id: attempt.activity_id,
        p_responses: attempt.answers,
        p_help_used: attempt.help_used,
        p_started_at: attempt.started_at,
        p_completed_at: attempt.completed_at,
      });
      if (error) {
        showToast("حفظنا إنجازك على الجهاز، وستتم المزامنة عند عودة الاتصال.");
        return;
      }
      removePendingAttempt(attempt.id);
      const result = data as { first_completion?: boolean } | null;
      if (result?.first_completion === false && child) {
        try {
          await loadCloudChild(child);
          showToast("هذا الإنجاز محفوظ من قبل على حساب الأسرة.");
        } catch { /* The local copy stays usable if refresh fails. */ }
      }
    } finally {
      syncingAttempts.current.delete(attempt.id);
    }
  }

  async function completeLesson(details: { helpUsed: boolean; startedAt: string; answers: string[] }) {
    if (!child || !progress || !activeLesson || progress.completedLessonIds.includes(activeLesson.id)) return;
    const completedLessonIds = [...progress.completedLessonIds, activeLesson.id];
    const completesMilestone = completedLessonIds.length >= 3 && !progress.milestonesClaimed.includes(MILESTONE_KEY);
    const item = ITEM_LABELS[activeLesson.reward.itemKey];
    const nextProgress: LocalProgress = {
      ...progress,
      completedLessonIds,
      assistedLessonIds: details.helpUsed && !progress.assistedLessonIds.includes(activeLesson.id)
        ? [...progress.assistedLessonIds, activeLesson.id]
        : progress.assistedLessonIds,
      buildingLevels: { ...progress.buildingLevels, [activeLesson.building]: Math.max(1, progress.buildingLevels[activeLesson.building]) },
      stars: progress.stars + activeLesson.reward.stars,
      planks: progress.planks + activeLesson.reward.planks + (completesMilestone ? 3 : 0),
      placedItems: [...new Set([...progress.placedItems, activeLesson.reward.itemKey, ...(completesMilestone ? ["sea-lantern"] : [])])],
      itemPlacements: {
        ...progress.itemPlacements,
        [activeLesson.reward.itemKey]: progress.itemPlacements[activeLesson.reward.itemKey] ?? "shore",
        ...(completesMilestone ? { "sea-lantern": "shore" as const } : {}),
      },
      milestonesClaimed: completesMilestone ? [...progress.milestonesClaimed, MILESTONE_KEY] : progress.milestonesClaimed,
    };
    setProgress(nextProgress);
    writeProgress(nextProgress);
    const tokens = [`⭐ ${activeLesson.reward.stars} نجوم`, `🪵 ${activeLesson.reward.planks + (completesMilestone ? 3 : 0)} ألواح`, `${item.icon} ${item.name}`];
    if (completesMilestone) tokens.push("🪸 فانوس البحر");
    setRewardMoment({
      title: completesMilestone ? "وصلت إلى صندوق محطاتك الثلاث!" : "أضفت شيئاً جميلاً لجزيرتك",
      description: completesMilestone ? "مكافأته ثابتة ومعلومة: ثلاثة ألواح وفانوس بحر خاص. شفت كيف كبرت الجزيرة بالمحاولة؟" : "كل محطة تعلم تضيف أثراً صغيراً تقدر تشوفه على جزيرتك.",
      tokens,
      chest: completesMilestone,
    });

    if (guardian) {
      const attempt: PendingAttempt = {
        id: crypto.randomUUID(),
        child_id: child.id,
        activity_id: activeLesson.activityId,
        skill_id: activeLesson.skillId,
        answers: details.answers,
        outcome: "completed",
        help_used: details.helpUsed,
        started_at: details.startedAt,
        completed_at: new Date().toISOString(),
        first_completion: true,
        building_key: activeLesson.building,
        stars_earned: activeLesson.reward.stars,
        planks_earned: activeLesson.reward.planks,
        item_id: activeLesson.reward.itemId,
      };
      addPendingAttempt(attempt);
      void syncAttempt(attempt);
    }
  }

  async function archiveChild(profile: ChildProfile) {
    if (!guardian) return;
    const client = createClient();
    if (!client) return;
    const { error } = await client.from("child_profiles").update({ archived_at: new Date().toISOString() }).eq("id", profile.id);
    if (error) {
      showToast("تعذر أرشفة الملف. جرّب بعد قليل.");
      return;
    }
    clearChildLocalData(profile.id);
    setChildren((current) => current.filter((item) => item.id !== profile.id));
    if (child?.id === profile.id) {
      setChild(null);
      setProgress(null);
      setScreen("setup");
    }
  }

  async function signOut() {
    const client = createClient();
    await client?.auth.signOut();
    setGuardian(null);
    setChildren([]);
    setChild(null);
    setProgress(null);
    setScreen("landing");
    setAuthMode(null);
  }

  async function deleteAccount() {
    const response = await fetch("/api/account/delete", { method: "DELETE" });
    if (!response.ok) {
      showToast("تعذر حذف الحساب. تأكد من إعداد خدمة الحسابات ثم أعد المحاولة.");
      return;
    }
    clearAllTakkaLocalData();
    await createClient()?.auth.signOut();
    setGuardian(null);
    setChildren([]);
    setChild(null);
    setProgress(null);
    setScreen("landing");
  }

  async function exportFamilyData() {
    if (!child || !progress) return;
    setBusy(true);
    try {
      const pendingAttempts = readPendingAttempts();
      let exportData: Record<string, unknown>;

      if (guardian) {
        const client = createClient();
        if (!client) throw new Error("خدمة الحسابات غير مربوطة بعد.");

        const [guardianResult, childrenResult] = await Promise.all([
          client.from("guardian_profiles").select("*").eq("id", guardian.id).maybeSingle(),
          client.from("child_profiles").select("*").eq("guardian_id", guardian.id).order("created_at", { ascending: true }),
        ]);
        if (guardianResult.error) throw guardianResult.error;
        if (childrenResult.error) throw childrenResult.error;

        const familyChildren = childrenResult.data ?? [];
        const childIds = familyChildren.map((profile) => profile.id);
        const familyRecords = childIds.length > 0 ? await Promise.all([
          client.from("skill_progress").select("*").in("child_id", childIds),
          client.from("activity_attempts").select("*").in("child_id", childIds),
          client.from("child_building_state").select("*").in("child_id", childIds),
          client.from("child_island_state").select("*").in("child_id", childIds),
          client.from("mission_progress").select("*").in("child_id", childIds),
          client.from("reward_unlocks").select("*").in("child_id", childIds),
        ]) : [];
        const familyError = familyRecords.find((result) => result.error)?.error;
        if (familyError) throw familyError;

        const [skillProgress, attempts, buildingState, islandState, missionProgress, rewards] = familyRecords.map((result) => result.data ?? []);
        const childIdSet = new Set(childIds);
        exportData = {
          format: "takka-family-export",
          version: 1,
          exported_at: new Date().toISOString(),
          account: { email: guardian.email, profile: guardianResult.data },
          children: familyChildren,
          learning: { skill_progress: skillProgress, activity_attempts: attempts, mission_progress: missionProgress },
          island: { buildings: buildingState, decorations: islandState, rewards },
          this_device: {
            local_progress: familyChildren.map((profile) => ({ child_id: profile.id, ...readProgress(profile.id, profile.nickname, profile.audio_enabled) })),
            pending_attempts: pendingAttempts.filter((attempt) => childIdSet.has(attempt.child_id)),
          },
        };
      } else {
        exportData = {
          format: "takka-family-export",
          version: 1,
          exported_at: new Date().toISOString(),
          account: null,
          children: [],
          this_device: { preview_progress: progress, pending_attempts: [] },
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `takka-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("نزّلنا نسخة JSON على هذا الجهاز. احفظها بمكان آمن.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تجهيز نسخة البيانات الآن.");
    } finally {
      setBusy(false);
    }
  }

  function startLesson(lesson: (typeof LESSONS)[number]) {
    setRewardMoment(null);
    setActiveLesson(lesson);
  }

  if (screen === "loading") {
    return <main className="loading-screen"><span className="loading-seed"><Sparkles size={22} /></span><p>نرتب جزيرتك بهدوء…</p></main>;
  }

  if (screen === "setup") {
    return <main className="app-shell setup-shell">
      <Brand />
      <section className="setup-card" data-testid="child-setup">
        <div className="auth-emblem"><FatinMark small /></div>
        <p className="eyebrow">ملف طفل جديد</p>
        <h1>مين رح يكتشف الجزيرة؟</h1>
        <p className="muted">اختر لقباً ورمزاً فقط. ما بنطلب من الطفل بريداً أو كلمة مرور.</p>
        <form className="auth-form" onSubmit={saveFirstChild}>
          <label className="field-label" htmlFor="child-name">لقب الطفل</label>
          <input className="plain-input" id="child-name" value={setupName} onChange={(event) => setSetupName(event.target.value)} maxLength={28} placeholder="مثلاً: ليان" autoComplete="off" required />
          <label className="field-label" htmlFor="child-grade">الصف الدراسي للتخصيص المبدئي</label>
          <select className="select-input" id="child-grade" value={setupGrade} onChange={(event) => setSetupGrade(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((grade) => <option value={grade} key={grade}>الصف {grade}</option>)}
          </select>
          <span className="field-label">اختار رفيقاً للملف</span>
          <div className="avatar-choices" role="group" aria-label="اختيار رمز الطفل">
            {AVATARS.map((avatar) => <button key={avatar} type="button" className={`avatar-choice${setupAvatar === avatar ? " active" : ""}`} aria-pressed={setupAvatar === avatar} onClick={() => setSetupAvatar(avatar)}>{avatar}</button>)}
          </div>
          <p className="privacy-note">{configured ? "اللقب والصف والرمز يظهرون داخل حساب الأسرة فقط." : "يحفظ هذا الملف على هذا الجهاز فقط، ولا يحتاج إلى حساب أو اتصال بالإنترنت."} الملف تجريبي، ومحتواه لا يدّعي تغطية منهاج معتمد.</p>
          <div className="form-actions">
            <button className="button button-primary" disabled={busy} type="submit">{busy ? "نجهزها…" : "ابنِ جزيرتي"}<ArrowRight size={17} /></button>
          </div>
        </form>
      </section>
    </main>;
  }

  if (screen === "landing") {
    return <main className="app-shell">
      <header className="site-header"><Brand /><div className="header-actions">{configured && <button className="button button-secondary" type="button" onClick={() => setAuthMode("sign-in")}><LogIn size={17} /> دخول ولي الأمر</button>}</div></header>
      <section className="landing">
        <div className="landing-copy">
          <p className="eyebrow">مغامرة هادئة تكبر مع التعلّم</p>
          <h1>أهلاً بك في <span>جزيرة تكة</span></h1>
          <p className="landing-lede">كل فكرة جديدة تزرع أثراً على جزيرتك. تعلّم على راحتك، وابنِ مكاناً يشبهك خطوة خطوة.</p>
          <div className="landing-actions"><button className="button button-primary" type="button" onClick={enterGuestPreview}><Compass size={18} /> جرّب الجزيرة</button>{configured && <button className="button button-secondary" type="button" onClick={() => setAuthMode("sign-up")}><ShieldCheck size={18} /> حساب ولي الأمر</button>}</div>
          <p className="landing-note"><Check size={16} /> معاينة محايدة بلا ملف طفل أو حساب أو كتابة سحابية.</p>
          <div className="landing-promise"><div className="promise-item"><BookOpen size={17} /> تعلم قصير وهادئ</div><div className="promise-item"><Trees size={17} /> بناء له معنى</div><div className="promise-item"><ShieldCheck size={17} /> خصوصية الطفل أولاً</div></div>
        </div>
        <div className="landing-scene-wrap"><IslandIllustration levels={INITIAL_BUILDING_LEVELS} /><span className="scene-caption"><FatinMark small /> فطين ينتظركم على الجزيرة</span></div>
      </section>
      <footer className="app-footer"><span>تكة · نموذج تجريبي محايد</span><span>ما في سلاسل حضور أو مكافآت عشوائية.</span></footer>
      {authMode && configured && <AuthPanel mode={authMode} configured={configured} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} onAuthenticated={(user) => void bootstrapGuardian(user)} />}
    </main>;
  }

  if (!child || !progress) return null;

  const todayLesson = nextLesson;
  const panelTitle = screen === "missions" ? "مهمات الجزيرة" : screen === "parent" ? "مساحة الأسرة" : screen === "settings" ? "إعدادات الرحلة" : "جزيرتك";

  return <main className="app-shell">
    <header className="site-header">
      <Brand />
      <div className="header-actions">
        <span className={`status-badge${online ? "" : " offline"}`}>{online ? "متصل" : "بدون اتصال"}</span>
        {guardian ? <button className="header-account" type="button" onClick={() => setScreen("parent")}><span className="avatar-chip">{child.avatar_key}</span><span>{child.nickname}</span><ChevronDown size={15} /></button> : configured && <button className="button button-secondary" type="button" onClick={() => setAuthMode("sign-in")}>حفظ مع ولي الأمر</button>}
      </div>
    </header>

    {screen === "island" && <section className="island-page" data-testid="island-view">
      <div className="island-heading">
        <div><p className="eyebrow">مساحة {child.nickname} الصغيرة</p><h1>جزيرتك تكبر معك</h1><p>اختر محطة أو تابع خطوتك القريبة. ما في استعجال.</p></div>
        <div className="resource-row"><span className="resource-pill"><Star size={17} color="#d2953f" /><span>{progress.stars}</span> نجوم</span><span className="resource-pill"><span>🪵</span>{progress.planks} ألواح</span><span className="resource-pill"><span>🏡</span>{completedLessons.length} محطات</span></div>
      </div>
      <div className="island-hero">
        <IslandIllustration levels={progress.buildingLevels} items={progress.placedItems.map((key) => ({ key, name: ITEM_LABELS[key]?.name ?? "زينة", icon: ITEM_LABELS[key]?.icon ?? "✨", position: progress.itemPlacements[key] ?? "shore" }))} />
        <div className="island-hero-overlay"><FatinMark /><span><strong>فطين</strong><small>رفيقك وقت ما تحتاجه</small></span></div>
      </div>
      {progress.placedItems.length > 0 && <div className="island-inventory" aria-label="أشياء أضفتها للجزيرة"><strong>أشياء صارت من جزيرتك — اختار موقع كل واحدة:</strong>{progress.placedItems.map((key) => <label className="island-item-chip" key={key}><span title={ITEM_LABELS[key]?.name}>{ITEM_LABELS[key]?.icon ?? "✨"}</span><small>{ITEM_LABELS[key]?.name}</small><select className="island-placement" aria-label={`موقع ${ITEM_LABELS[key]?.name ?? "الزينة"}`} value={progress.itemPlacements[key] ?? "shore"} onChange={(event) => void placeIslandItem(key, event.target.value as IslandPosition)}>{POSITIONS.map((position) => <option key={position.key} value={position.key}>{position.label}</option>)}</select></label>)}</div>}
      <div className="island-bottom">
        <section>
          <div className="section-heading"><h2>بيوت التعلّم</h2><span className="small-count"><BookOpen size={15} /> ثلاث محطات تجريبية</span></div>
          <div className="building-grid">
            {BUILDINGS.map((building) => {
              const lesson = LESSONS.find((item) => item.building === building.key)!;
              const done = progress.completedLessonIds.includes(lesson.id);
              const level = progress.buildingLevels[building.key];
              return <button className="building-card" key={building.key} type="button" data-testid={`building-${building.key}`} onClick={() => done ? showToast("أنهيت هذه المحطة. تقدر تراجعها من قائمة المهمات وقت ما تحب.") : startLesson(lesson)}>
                <span className="building-top"><span className={`building-symbol theme-${building.theme}`}>{building.icon}</span><span className="building-level">{done ? <><Check size={14} /> اكتملت</> : `مرحلة ${level}`}</span></span>
                <span><span className="building-title">{building.title}</span><span className="building-subject">{building.subject} · {building.description}</span></span>
                <span className="building-progress"><span style={{ width: done ? "100%" : "12%" }} /></span>
              </button>;
            })}
          </div>
        </section>
        <aside className="today-card">
          <div className="today-card-top"><span className="today-label"><Sparkles size={14} /> خطوة اختيارية</span><span className="small-count">{completedLessons.length}/3</span></div>
          <h3>{todayLesson ? `تكة اليوم: ${todayLesson.title}` : "جزيرتك مليانة اكتشافات"}</h3>
          <p>{todayLesson ? todayLesson.subtitle : "أنهيت المحطات التجريبية الثلاث. تقدر تتأمل البناء أو تعود لمهمة تحبها."}</p>
          {todayLesson ? <button className="button button-primary" type="button" onClick={() => startLesson(todayLesson)}>ابدأ المحطة <ArrowRight size={17} /></button> : <button className="button button-secondary" type="button" onClick={() => setScreen("missions")}>شوف إنجازاتك</button>}
        </aside>
      </div>
      <section className="island-upgrades">
        <div className="section-heading"><h2>خلّي بيتاً ينمو</h2><span className="small-count">كل تطوير يكلف لوحين</span></div>
        <div className="upgrade-row">{BUILDINGS.map((building) => <div className="upgrade-card" key={building.key}><span className={`building-symbol theme-${building.theme}`}>{building.icon}</span><span className="upgrade-copy"><strong>{building.title}</strong><small>{textForLevel(progress.buildingLevels[building.key])}</small></span><button className="button button-secondary button-small" type="button" onClick={() => void upgradeBuilding(building.key)} disabled={progress.buildingLevels[building.key] >= 3}>طوّر · 🪵2</button></div>)}</div>
      </section>
    </section>}

    {screen === "missions" && <section className="missions-page" data-testid="missions-view">
      <div className="page-title-row"><div><p className="eyebrow">اختيارك، وبالسرعة اللي تناسبك</p><h1>{panelTitle}</h1><p>المهمات هنا محطات تعلّم صغيرة، بلا عدّ تنازلي.</p></div><span className="status-badge"><Star size={14} /> {completedLessons.length} من 3</span></div>
      <div className="mission-list">{LESSONS.map((lesson, index) => {
        const done = progress.completedLessonIds.includes(lesson.id);
        return <article className="mission-card" key={lesson.id}><span className="mission-icon">{done ? <Check size={24} /> : lesson.icon}</span><div><h3>{index === 0 ? "اكتشاف صوت الحرف" : index === 1 ? "عدّ الأشياء" : "رتّب أحداث الحكاية"}</h3><p>{lesson.subtitle}</p></div><span className={`mission-status${done ? "" : " pending"}`}>{done ? "أنجزتها" : "مفتوحة"}</span><span className="mission-reward">⭐ {lesson.reward.stars} · 🪵 {lesson.reward.planks}</span>{!done && <button className="button button-secondary button-small" type="button" onClick={() => startLesson(lesson)}>افتح المهمة</button>}</article>;
      })}
        <article className="mission-card milestone-card"><span className="mission-icon">🎁</span><div><h3>صندوق محطات الجزيرة الثلاث</h3><p>مكافأة معلومة: فانوس بحر وثلاثة ألواح بعد إكمال المحطات الثلاث.</p></div><span className={`mission-status${progress.milestonesClaimed.includes(MILESTONE_KEY) ? "" : " pending"}`}>{progress.milestonesClaimed.includes(MILESTONE_KEY) ? "استلمته" : `${completedLessons.length}/3`}</span><span className="mission-reward">🪸 فانوس + 🪵3</span></article>
      </div>
      <div className="extension-grid">
        <ExtensionCard title="تكة تفكير" label="فكرة جانبية" icon="💡" prompt="أي كلمتين تبدآن بالصوت نفسه؟" choices={["باب وبيت", "بيت وورد", "قمر وورد"]} answer="باب وبيت" success="لاحظت النمط الصوتي بنفسك." />
        <ExtensionCard title="واحة أعمق" label="جرّب فكرة ثانية" icon="🌿" prompt="لو عندنا أربع حبّات وأضفنا واحدة، كم يصبح العدد؟" choices={["٣", "٤", "٥"]} answer="٥" success="جميل! ربطت الإضافة بالعدد الجديد." />
      </div>
      <p className="privacy-note">تكة تفكير وواحة أعمق أسئلة تجريبية قصيرة، بلا درجات أو ادعاء بأنها تغطي المنهاج.</p>
    </section>}

    {screen === "parent" && <section className="parent-page" data-testid="parent-view">
      <div className="page-title-row"><div><p className="eyebrow">خصوصية الأسرة بيد ولي الأمر</p><h1>{panelTitle}</h1><p>{guardian?.email}</p></div><button className="button button-secondary" type="button" onClick={() => setScreen("settings")}><Settings size={17} /> إعدادات</button></div>
      <div className="parent-summary"><div className="summary-card"><strong className="summary-value">{children.length}</strong><span className="summary-caption">ملفات أطفال نشطة</span></div><div className="summary-card"><strong className="summary-value">{completedLessons.length}/3</strong><span className="summary-caption">محطات {child.nickname}</span></div><div className="summary-card"><strong className="summary-value">{progress.stars}</strong><span className="summary-caption">نجوم رحلة {child.nickname}</span></div></div>
      <h2>ملفات الأسرة</h2>
      <div className="child-list">{children.map((profile) => <div className="child-row" key={profile.id}><span className="avatar-chip">{profile.avatar_key}</span>{editingChildId === profile.id ? <ChildProfileEditor profile={profile} busy={busy} onCancel={() => setEditingChildId(null)} onSave={(nickname, grade) => void saveChildEdit(profile, nickname, grade)} /> : <div className="child-row-main"><strong>{profile.nickname}</strong><small>الصف {profile.grade} · {profile.id === child.id ? "الملف المفتوح" : "ملف الأسرة"}</small></div>}<div className="child-row-actions"><button className="button button-secondary button-small" type="button" onClick={() => void selectChild(profile)}>{profile.id === child.id ? "الجزيرة الحالية" : "افتح الجزيرة"}</button>{editingChildId !== profile.id && <button className="button button-quiet button-small" type="button" onClick={() => setEditingChildId(profile.id)}>تعديل الملف</button>}<button className="button button-quiet button-small" type="button" onClick={() => { if (window.confirm(`هل تريد أرشفة ملف ${profile.nickname}؟ سيختفي من قائمة الأسرة.`)) void archiveChild(profile); }}>أرشفة</button></div></div>)}</div>
      <section className="parent-progress"><div className="section-heading"><h2>ماذا جرّب {child.nickname}؟</h2><span className="small-count">ملخص وصفي فقط</span></div>{LESSONS.map((lesson) => { const done = progress.completedLessonIds.includes(lesson.id); const assisted = progress.assistedLessonIds.includes(lesson.id); return <div className="progress-row" key={lesson.id}><span className={`building-symbol theme-${lesson.theme}`}>{lesson.icon}</span><div><strong>{lesson.title}</strong><small>{done ? assisted ? "أنهاها مع تلميح من فطين" : "أنهاها دون طلب تلميح" : "لم تُجرّب بعد"}</small></div><span className={`status-badge${done ? "" : " offline"}`}>{done ? "مكتملة" : "متاحة"}</span></div>; })}</section>
      <form className="form-card" onSubmit={addChild}>
        <h2>أضف ملفاً لطفل آخر</h2><p>لا حاجة لبريد أو كلمة مرور للطفل.</p>
        <div className="form-grid"><label className="field"><span className="field-label">لقب الطفل</span><input className="plain-input" value={newChildName} onChange={(event) => setNewChildName(event.target.value)} maxLength={28} placeholder="لقب داخل الأسرة" required /></label><label className="field"><span className="field-label">الصف</span><select className="select-input" value={newChildGrade} onChange={(event) => setNewChildGrade(Number(event.target.value))}>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>الصف {grade}</option>)}</select></label></div>
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}><Plus size={17} /> أضف ملفاً</button></div>
        <p className="privacy-note">المحتوى الحالي تجريبي ومحايد؛ اختيار الصف لا يعني أن المحطات تغطي منهجاً معتمداً.</p>
      </form>
    </section>}

    {screen === "settings" && <section className="settings-page" data-testid="settings-view">
      <div className="page-title-row"><div><p className="eyebrow">رحلة الطفل والأسرة</p><h1>{panelTitle}</h1><p>تغييرات بسيطة وواضحة، بدون إعدادات مخفية.</p></div><button className="button button-quiet" type="button" onClick={() => setScreen(guardian ? "parent" : "island")}>رجوع</button></div>
      <div className="setting-group">
        <div className="setting-row"><div className="setting-copy"><strong>قراءة الأسئلة بصوت عربي</strong><small>الصوت اختياري، والنص يظل ظاهراً دائماً.</small></div><button className="switch" role="switch" aria-checked={progress.audioEnabled} aria-label="الصوت العربي" onClick={() => void updateAudio(!progress.audioEnabled)} /></div>
        <div className="setting-row"><div className="setting-copy"><strong>حفظ الرحلة</strong><small>{guardian ? "التقدم مرتبط بحساب ولي الأمر ويُحفظ محلياً أيضاً." : "هذه المعاينة محفوظة على هذا الجهاز فقط."}</small></div><span className={`status-badge${online ? "" : " offline"}`}>{online ? "متاح" : "يحتاج اتصالاً للمزامنة"}</span></div>
        <div className="setting-row"><div className="setting-copy"><strong>تنزيل نسخة من بيانات الرحلة</strong><small>{guardian ? "تشمل ملفات الأسرة والتقدم المتاح على هذا الجهاز." : "تنزّل تقدم معاينة الجزيرة المحفوظ على هذا الجهاز."}</small></div><button className="button button-secondary button-small" type="button" disabled={busy} onClick={() => void exportFamilyData()}><Download size={16} /> تنزيل نسخة</button></div>
        {guardian && <div className="setting-row"><div className="setting-copy"><strong>تسجيل الخروج</strong><small>تبقى بيانات الأسرة على الحساب.</small></div><button className="button button-secondary button-small" type="button" onClick={() => void signOut()}><LogOut size={16} /> خروج</button></div>}
        {guardian && <div className="setting-row danger-row"><div className="setting-copy"><strong>حذف حساب الأسرة</strong><small>يحذف الحساب وملفات الأسرة من خدمة تكة.</small></div><button className="button button-secondary button-small" type="button" onClick={() => { if (window.confirm("هل تريد حذف حساب الأسرة وبيانات أطفاله نهائياً؟")) void deleteAccount(); }}><X size={16} /> حذف الحساب</button></div>}
      </div>
      <p className="privacy-note">معلومات الطفل محدودة بلقب وصف ورمز وصفي وتقدم تعليمي ضروري. لا نجمع صوتاً خاماً أو محادثات حرة.</p>
    </section>}

    <nav className="app-tabs" aria-label="التنقل الرئيسي">
      <button className={`app-tab${screen === "island" ? " active" : ""}`} type="button" onClick={() => setScreen("island")}><Home size={18} /> الجزيرة</button>
      <button className={`app-tab${screen === "missions" ? " active" : ""}`} type="button" onClick={() => setScreen("missions")}><Compass size={18} /> المهمات</button>
      {configured && <button className={`app-tab${screen === "parent" ? " active" : ""}`} type="button" onClick={() => guardian ? setScreen("parent") : setAuthMode("sign-in")}><ShieldCheck size={18} /> الأسرة</button>}
      <button className={`app-tab${screen === "settings" ? " active" : ""}`} type="button" onClick={() => setScreen("settings")}><Settings size={18} /> الإعدادات</button>
    </nav>

    {activeLesson && <LessonPlayer lesson={activeLesson} childId={child.id} audioEnabled={progress.audioEnabled} onExit={() => setActiveLesson(null)} onComplete={(details) => { void completeLesson(details); setActiveLesson(null); }} />}
    {rewardMoment && <div className="reward-scrim"><section className="reward-card" role="dialog" aria-modal="true" aria-labelledby="reward-title"><span className="reward-chest" aria-hidden="true">{rewardMoment.chest ? "🎁" : "✨"}</span><p className="eyebrow">{rewardMoment.chest ? "صندوق معلومة مكافأته" : "أثر جديد على الجزيرة"}</p><h2 id="reward-title">{rewardMoment.title}</h2><p>{rewardMoment.description}</p><div className="reward-items">{rewardMoment.tokens.map((token) => <span className="reward-token" key={token}>{token}</span>)}</div><button className="button button-primary" type="button" onClick={() => setRewardMoment(null)}>أرجع إلى جزيرتي <ArrowRight size={17} /></button></section></div>}
    {authMode && configured && <AuthPanel mode={authMode} configured={configured} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} onAuthenticated={(user) => void bootstrapGuardian(user)} />}
    {toast && <div className="offline-notice" role="status"><CircleHelp size={16} />{toast}</div>}
    {busy && <span className="sr-only" role="status">جارٍ حفظ التغييرات</span>}
  </main>;
}

function Brand() {
  return <Link className="brand" href="/" aria-label="العودة إلى تكة"><span className="brand-mark"><FatinMark small /></span><span><strong className="brand-name">تكة</strong><small className="brand-caption">جزيرة صغيرة لاكتشاف كبير</small></span></Link>;
}

function ExtensionCard({ title, label, icon, prompt, choices, answer, success }: {
  title: string;
  label: string;
  icon: string;
  prompt: string;
  choices: string[];
  answer: string;
  success: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return <article className="extension-card">
    <div className="extension-heading"><span className="mission-icon">{icon}</span><div><p className="eyebrow">{label}</p><h2>{title}</h2></div></div>
    <h3>{prompt}</h3>
    <div className="extension-choices">{choices.map((choice) => <button className={`answer-option${selected === choice ? choice === answer ? " answer-correct" : " answer-wrong" : ""}`} key={choice} type="button" disabled={selected === answer} aria-pressed={selected === choice} onClick={() => setSelected(choice)}>{choice}</button>)}</div>
    <p className="extension-feedback" aria-live="polite">{selected === answer ? success : selected ? "قريب، جرّب خياراً آخر على راحتك." : "سؤال صغير إضافي؛ اختيارك لا يغيّر المكافآت."}</p>
  </article>;
}

function ChildProfileEditor({ profile, busy, onCancel, onSave }: {
  profile: ChildProfile;
  busy: boolean;
  onCancel: () => void;
  onSave: (nickname: string, grade: number) => void;
}) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [grade, setGrade] = useState(profile.grade);
  return <form className="child-edit" onSubmit={(event) => { event.preventDefault(); if (nickname.trim()) onSave(nickname.trim(), grade); }}>
    <label><span className="sr-only">لقب {profile.nickname}</span><input className="plain-input" aria-label="تعديل لقب الطفل" maxLength={28} value={nickname} onChange={(event) => setNickname(event.target.value)} required /></label>
    <label><span className="sr-only">الصف</span><select className="select-input" aria-label="تعديل الصف" value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{[1,2,3,4,5,6].map((value) => <option value={value} key={value}>الصف {value}</option>)}</select></label>
    <button className="button button-primary button-small" type="submit" disabled={busy}>حفظ</button>
    <button className="button button-quiet button-small" type="button" onClick={onCancel}>إلغاء</button>
  </form>;
}
