import type { ProgressRepository, ProgressSnapshot } from '@domain/storage/repository';
import type {
  Evidence,
  LocalReport,
  Profile,
  SessionRecord,
  SkillState,
} from '@domain/types';
import { stateFromEvidence } from '@domain/mastery/state-machine';
import { serializeEnvelope, parseEnvelope } from './export-import';

/**
 * تنفيذ في الذاكرة — للاختبارات وللمعاينة داخل المتصفح عند غياب IndexedDB.
 * نفس العقد تماماً، فلا يتغيّر منطق التعلّم.
 */
export class MemoryProgressRepository implements ProgressRepository {
  private profiles = new Map<string, Profile>();
  private evidence = new Map<string, Evidence[]>();
  private sessions = new Map<string, SessionRecord[]>();
  private reports = new Map<string, LocalReport[]>();

  async loadProfile(profileId: string): Promise<Profile | null> {
    return this.profiles.get(profileId) ?? null;
  }

  async listProfiles(): Promise<Profile[]> {
    return [...this.profiles.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  async saveProfile(profile: Profile): Promise<void> {
    this.profiles.set(profile.id, { ...profile });
  }

  async deleteProfile(profileId: string): Promise<void> {
    this.profiles.delete(profileId);
    this.evidence.delete(profileId);
    this.sessions.delete(profileId);
    this.reports.delete(profileId);
  }

  async saveEvidence(evidence: Evidence): Promise<void> {
    const list = this.evidence.get(evidence.profileId) ?? [];
    list.push({ ...evidence });
    this.evidence.set(evidence.profileId, list);
  }

  async saveEvidenceBatch(evidences: readonly Evidence[]): Promise<void> {
    for (const e of evidences) await this.saveEvidence(e);
  }

  async saveSession(session: SessionRecord): Promise<void> {
    const list = this.sessions.get(session.profileId) ?? [];
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = { ...session };
    else list.push({ ...session });
    this.sessions.set(session.profileId, list);
  }

  async getEvidence(profileId: string): Promise<Evidence[]> {
    return [...(this.evidence.get(profileId) ?? [])].sort((a, b) => a.at - b.at);
  }

  async getSessions(profileId: string): Promise<SessionRecord[]> {
    return [...(this.sessions.get(profileId) ?? [])].sort((a, b) => a.startedAt - b.startedAt);
  }

  async getSkillStates(profileId: string): Promise<Record<string, SkillState>> {
    const bySkill = new Map<string, Evidence[]>();
    for (const e of await this.getEvidence(profileId)) {
      const list = bySkill.get(e.skillId);
      if (list) list.push(e);
      else bySkill.set(e.skillId, [e]);
    }
    const out: Record<string, SkillState> = {};
    for (const [skillId, list] of bySkill) out[skillId] = stateFromEvidence(list);
    return out;
  }

  async saveReport(report: LocalReport): Promise<void> {
    const list = this.reports.get(report.profileId) ?? [];
    list.push({ ...report });
    this.reports.set(report.profileId, list);
  }

  async listReports(profileId: string): Promise<LocalReport[]> {
    return [...(this.reports.get(profileId) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  }

  async snapshot(profileId: string): Promise<ProgressSnapshot> {
    const profile = await this.loadProfile(profileId);
    if (!profile) throw new Error(`لا يوجد ملف: ${profileId}`);
    return {
      format: 'takka-progress',
      version: 1,
      exportedAt: Date.now(),
      profile,
      evidence: await this.getEvidence(profileId),
      sessions: await this.getSessions(profileId),
    };
  }

  async exportProfile(profileId: string): Promise<Blob> {
    const snapshot = await this.snapshot(profileId);
    return new Blob([serializeEnvelope(snapshot, Date.now())], {
      type: 'application/json',
    });
  }

  async importProfile(file: Blob): Promise<Profile> {
    const parsed = parseEnvelope(await file.text());
    if (!parsed.ok || !parsed.snapshot) {
      throw new Error(parsed.error ?? 'ملف غير صالح.');
    }
    const { profile, evidence, sessions } = parsed.snapshot;
    await this.saveProfile(profile);
    this.evidence.set(profile.id, evidence.map((e) => ({ ...e })));
    this.sessions.set(profile.id, sessions.map((s) => ({ ...s })));
    return profile;
  }
}
