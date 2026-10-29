import type {
  Evidence,
  EvidenceKind,
  LocalReport,
  Profile,
  SessionRecord,
  SkillState,
} from '../types';

/**
 * المستودع المجرّد — الحدّ الذي يفصل منطق التعلّم عن Dexie/SQLite.
 * `domain` لا يعرف تنفيذه؛ `data` يقدّمه.
 */
export interface ProgressRepository {
  loadProfile(profileId: string): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;
  saveProfile(profile: Profile): Promise<void>;
  deleteProfile(profileId: string): Promise<void>;

  /** كتابة ذرية: كل تغيير حالة في معاملة واحدة. */
  saveEvidence(evidence: Evidence): Promise<void>;
  saveEvidenceBatch(evidences: readonly Evidence[]): Promise<void>;
  saveSession(session: SessionRecord): Promise<void>;
  getEvidence(profileId: string): Promise<Evidence[]>;
  getSessions(profileId: string): Promise<SessionRecord[]>;
  getSkillStates(profileId: string): Promise<Record<string, SkillState>>;

  saveReport(report: LocalReport): Promise<void>;
  listReports(profileId: string): Promise<LocalReport[]>;

  exportProfile(profileId: string): Promise<Blob>;
  importProfile(file: Blob): Promise<Profile>;
}

export interface ProgressSnapshot {
  format: 'takka-progress';
  version: 1;
  exportedAt: number;
  profile: Profile;
  evidence: Evidence[];
  sessions: SessionRecord[];
}

export interface ExportEnvelope {
  format: 'takka-progress-export';
  version: 1;
  checksum: string;
  payload: ProgressSnapshot;
}

export type { EvidenceKind };
