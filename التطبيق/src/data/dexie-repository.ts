import Dexie, { type Table } from 'dexie';
import type { ProgressRepository, ProgressSnapshot } from '@domain/storage/repository';
import type {
  Evidence,
  LocalReport,
  Profile,
  SessionRecord,
  SkillState,
} from '@domain/types';
import { stateFromEvidence } from '@domain/mastery/state-machine';
import { parseEnvelope, serializeEnvelope } from './export-import';

export class TakkaDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  evidence!: Table<Evidence, string>;
  sessions!: Table<SessionRecord, string>;
  reports!: Table<LocalReport, string>;
  placements!: Table<{ profileId: string; value: unknown; updatedAt: number }, string>;
  island!: Table<{ profileId: string; value: unknown; updatedAt: number }, string>;
  economy!: Table<{ profileId: string; value: unknown; updatedAt: number }, string>;

  constructor(name = 'takka-db') {
    super(name);
    this.version(1).stores({
      profiles: 'id, grade, createdAt',
      evidence: 'id, profileId, skillId, at, [profileId+skillId]',
      sessions: 'id, profileId, startedAt',
      reports: 'id, profileId, createdAt',
    });
    this.version(2).stores({
      profiles: 'id, grade, createdAt',
      evidence: 'id, profileId, skillId, at, [profileId+skillId]',
      sessions: 'id, profileId, startedAt',
      reports: 'id, profileId, createdAt',
      placements: 'profileId, updatedAt',
    });
    this.version(3).stores({
      profiles: 'id, grade, createdAt',
      evidence: 'id, profileId, skillId, at, [profileId+skillId]',
      sessions: 'id, profileId, startedAt',
      reports: 'id, profileId, createdAt',
      placements: 'profileId, updatedAt',
      island: 'profileId, updatedAt',
      economy: 'profileId, updatedAt',
    });
  }
}

/**
 * تنفيذ Dexie خلف نفس الواجهة. كل تغيير حالة في معاملة واحدة،
 * ولا ننتظر «نهاية الجلسة» للحفظ.
 */
export class DexieProgressRepository implements ProgressRepository {
  private db: TakkaDatabase;

  constructor(db = new TakkaDatabase()) {
    this.db = db;
  }

  async loadProfile(profileId: string): Promise<Profile | null> {
    return (await this.db.profiles.get(profileId)) ?? null;
  }

  async listProfiles(): Promise<Profile[]> {
    return this.db.profiles.orderBy('createdAt').toArray();
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.db.profiles.put(profile);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.profiles,
        this.db.evidence,
        this.db.sessions,
        this.db.reports,
        this.db.placements,
        this.db.island,
        this.db.economy,
      ],
      async () => {
        await this.db.profiles.delete(profileId);
        await this.db.evidence.where('profileId').equals(profileId).delete();
        await this.db.sessions.where('profileId').equals(profileId).delete();
        await this.db.reports.where('profileId').equals(profileId).delete();
        await this.db.placements.delete(profileId);
        await this.db.island.delete(profileId);
        await this.db.economy.delete(profileId);
      },
    );
  }

  async saveEvidence(evidence: Evidence): Promise<void> {
    await this.db.transaction('rw', this.db.evidence, async () => {
      await this.db.evidence.put(evidence);
    });
  }

  async saveEvidenceBatch(evidences: readonly Evidence[]): Promise<void> {
    await this.db.transaction('rw', this.db.evidence, async () => {
      await this.db.evidence.bulkPut(evidences as Evidence[]);
    });
  }

  async saveSession(session: SessionRecord): Promise<void> {
    await this.db.transaction('rw', this.db.sessions, async () => {
      await this.db.sessions.put(session);
    });
  }

  async getEvidence(profileId: string): Promise<Evidence[]> {
    return this.db.evidence.where('profileId').equals(profileId).sortBy('at');
  }

  async getSessions(profileId: string): Promise<SessionRecord[]> {
    return this.db.sessions.where('profileId').equals(profileId).sortBy('startedAt');
  }

  async getSkillStates(profileId: string): Promise<Record<string, SkillState>> {
    const evidence = await this.getEvidence(profileId);
    const bySkill = new Map<string, Evidence[]>();
    for (const e of evidence) {
      const list = bySkill.get(e.skillId);
      if (list) list.push(e);
      else bySkill.set(e.skillId, [e]);
    }
    const out: Record<string, SkillState> = {};
    for (const [skillId, list] of bySkill) out[skillId] = stateFromEvidence(list);
    return out;
  }

  async saveReport(report: LocalReport): Promise<void> {
    await this.db.reports.put(report);
  }

  async listReports(profileId: string): Promise<LocalReport[]> {
    return this.db.reports.where('profileId').equals(profileId).reverse().sortBy('createdAt');
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
    await this.db.transaction(
      'rw',
      this.db.profiles,
      this.db.evidence,
      this.db.sessions,
      async () => {
        await this.db.profiles.put(profile);
        await this.db.evidence.bulkPut(evidence);
        await this.db.sessions.bulkPut(sessions);
      },
    );
    return profile;
  }
}

/** يطلب تخزيناً دائماً عند أول إقلاع — لا يُحذف عند نقص المساحة. */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
