export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type GuardianProfile = { id: string; locale: string; audio_enabled: boolean; created_at: string; updated_at: string };
type ChildProfile = { id: string; guardian_id: string; nickname: string; avatar_key: string; grade: number; audio_enabled: boolean; created_at: string; updated_at: string; archived_at: string | null };
type ContentPack = { id: string; grade: number; subject: string; term: string; version: number; locale: string; coverage_note: string; status: string; published_at: string | null; created_at: string };
type Unit = { id: string; pack_id: string; order_index: number; title: string; status: string };
type Skill = { id: string; unit_id: string; goal: string; prerequisite_ids: string[]; source_id: string | null; review_state: string; created_at: string };
type Activity = { id: string; skill_id: string; activity_type: string; instruction: string; model_payload: Json; interaction_payload: Json; hints: Json; feedback: Json; audio_asset_id: string | null; version: number; status: string; building_key: string; reward_stars: number; reward_planks: number; item_id: string; created_at: string };
type SkillProgress = { id: string; child_id: string; skill_id: string; state: string; helped_count: number; independent_count: number; last_attempt_at: string | null; updated_at: string };
type ActivityAttempt = { id: string; child_id: string; activity_id: string; outcome: string; help_used: boolean; started_at: string; completed_at: string; sync_state: string; stars_earned: number; planks_earned: number };
type IslandBuilding = { id: string; building_key: string; subject: string; purpose: string; fixed_milestone_key: string | null; asset_key: string; starting_level: number; published: boolean };
type ChildBuildingState = { id: string; child_id: string; building_key: string; level: number; planks_spent: number; placement: Json | null; unlocked_at: string | null; upgraded_at: string | null };
type IslandItem = { id: string; item_key: string; fixed_milestone_key: string | null; display_name: string; asset_key: string; published: boolean };
type ChildIslandState = { id: string; child_id: string; item_id: string; placement: Json | null; unlocked_at: string; placed_at: string | null };
type LearningMission = { id: string; mission_key: string; skill_ids: string[]; objective_type: string; fixed_reward_key: string | null; content_version: number; status: string };
type MissionProgress = { id: string; child_id: string; mission_key: string; state: string; completed_at: string | null; reward_unlock_id: string | null };
type RewardUnlock = { id: string; child_id: string; milestone_key: string; item_id: string | null; unlocked_at: string; claimed_at: string | null };
type SourceRecord = { id: string; filename: string; grade: number | null; subject: string | null; edition: string | null; page_pdf: number | null; page_printed: string | null; unit: string | null; evidence_note: string | null; created_at: string };

export type Database = {
  public: {
    Tables: {
      guardian_profiles: Table<GuardianProfile, { id: string; locale?: string; audio_enabled?: boolean; created_at?: string; updated_at?: string }>;
      child_profiles: Table<ChildProfile, { id?: string; guardian_id: string; nickname: string; avatar_key?: string; grade?: number; audio_enabled?: boolean; created_at?: string; updated_at?: string; archived_at?: string | null }>;
      content_packs: Table<ContentPack>;
      units: Table<Unit>;
      skills: Table<Skill>;
      activities: Table<Activity>;
      skill_progress: Table<SkillProgress>;
      activity_attempts: Table<ActivityAttempt>;
      island_buildings: Table<IslandBuilding>;
      child_building_state: Table<ChildBuildingState>;
      island_items: Table<IslandItem>;
      child_island_state: Table<ChildIslandState>;
      learning_missions: Table<LearningMission>;
      mission_progress: Table<MissionProgress>;
      reward_unlocks: Table<RewardUnlock>;
      source_records: Table<SourceRecord>;
    };
    Views: Record<string, never>;
    Functions: {
      complete_activity_attempt: {
        Args: { p_attempt_id: string; p_child_id: string; p_activity_id: string; p_responses: Json; p_help_used: boolean; p_started_at: string; p_completed_at: string };
        Returns: Json;
      };
      upgrade_child_building: {
        Args: { p_child_id: string; p_building_key: string; p_expected_level: number };
        Returns: Json;
      };
      place_island_item: {
        Args: { p_child_id: string; p_item_id: string; p_position: string };
        Returns: Json;
      };
      is_guardian_of_child: { Args: { p_child_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
