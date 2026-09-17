export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          school_id: string;
          actor_id: string | null;
          action: Database["public"]["Enums"]["audit_action"];
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          actor_id?: string | null;
          action: Database["public"]["Enums"]["audit_action"];
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          actor_id?: string | null;
          action?: Database["public"]["Enums"]["audit_action"];
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      candidates: {
        Row: {
          id: string;
          election_id: string;
          ballot_number: number;
          name: string;
          class_name: string | null;
          photo_url: string | null;
          vision: string | null;
          mission: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          ballot_number: number;
          name: string;
          class_name?: string | null;
          photo_url?: string | null;
          vision?: string | null;
          mission?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          ballot_number?: number;
          name?: string;
          class_name?: string | null;
          photo_url?: string | null;
          vision?: string | null;
          mission?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      elections: {
        Row: {
          id: string;
          school_id: string;
          title: string;
          description: string | null;
          term_label: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status: Database["public"]["Enums"]["election_status"];
          results_visibility: Database["public"]["Enums"]["results_visibility"];
          published_at: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          announcement_started_at: string | null;
          results_revealed_at: string | null;
          archived_at: string | null;
          is_test: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          title: string;
          description?: string | null;
          term_label?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: Database["public"]["Enums"]["election_status"];
          results_visibility?: Database["public"]["Enums"]["results_visibility"];
          published_at?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          announcement_started_at?: string | null;
          results_revealed_at?: string | null;
          archived_at?: string | null;
          is_test?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          title?: string;
          description?: string | null;
          term_label?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: Database["public"]["Enums"]["election_status"];
          results_visibility?: Database["public"]["Enums"]["results_visibility"];
          published_at?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          announcement_started_at?: string | null;
          results_revealed_at?: string | null;
          archived_at?: string | null;
          is_test?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          school_id: string;
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          school_id: string;
          full_name: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          name: string;
          slug: string;
          npsn: string | null;
          logo_url: string | null;
          address: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          npsn?: string | null;
          logo_url?: string | null;
          address?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          npsn?: string | null;
          logo_url?: string | null;
          address?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      voters: {
        Row: {
          id: string;
          election_id: string;
          external_id: string | null;
          full_name: string;
          gender: string | null;
          class_name: string | null;
          token_hash: string | null;
          token_issued_at: string | null;
          token_revoked_at: string | null;
          has_voted: boolean;
          voted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          external_id?: string | null;
          full_name: string;
          gender?: string | null;
          class_name?: string | null;
          token_hash?: string | null;
          token_issued_at?: string | null;
          token_revoked_at?: string | null;
          has_voted?: boolean;
          voted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          external_id?: string | null;
          full_name?: string;
          gender?: string | null;
          class_name?: string | null;
          token_hash?: string | null;
          token_issued_at?: string | null;
          token_revoked_at?: string | null;
          has_voted?: boolean;
          voted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      voter_sessions: {
        Row: {
          id: string;
          election_id: string;
          voter_id: string;
          session_hash: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          voter_id: string;
          session_hash: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          voter_id?: string;
          session_hash?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          election_id: string;
          candidate_id: string;
          ballot_fingerprint: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          candidate_id: string;
          ballot_fingerprint: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          candidate_id?: string;
          ballot_fingerprint?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_archived_test_election: {
        Args: {
          p_election_id: string;
        };
        Returns: {
          candidate_photo_paths: string[];
          status: string;
        }[];
      };
      cast_vote: {
        Args: {
          p_candidate_id: string;
          p_session_hash: string;
        };
        Returns: {
          status: string;
        }[];
      };
      create_voter_session: {
        Args: {
          p_expires_at: string;
          p_session_hash: string;
          p_token_hash: string;
        };
        Returns: {
          status: string;
        }[];
      };
      get_voting_context: {
        Args: {
          p_session_hash: string;
        };
        Returns: {
          ballot_number: number | null;
          candidate_class_name: string | null;
          candidate_id: string | null;
          candidate_mission: string | null;
          candidate_name: string | null;
          candidate_photo_url: string | null;
          candidate_vision: string | null;
          election_term_label: string | null;
          election_title: string | null;
          status: string;
        }[];
      };
      get_public_announcement_state: {
        Args: Record<string, never>;
        Returns: {
          announcement_started_at: string | null;
          election_term_label: string | null;
          election_title: string | null;
          results_revealed_at: string | null;
          school_logo_url: string | null;
          school_name: string | null;
          server_now: string;
          status: string;
        }[];
      };
      get_public_final_results: {
        Args: Record<string, never>;
        Returns: {
          ballot_number: number | null;
          candidate_id: string | null;
          candidate_name: string | null;
          candidate_photo_url: string | null;
          election_term_label: string | null;
          election_title: string | null;
          is_tied_top: boolean;
          is_top: boolean;
          percentage: number;
          school_logo_url: string | null;
          school_name: string | null;
          status: string;
          total_valid_votes: number;
          vote_count: number;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "committee" | "observer";
      audit_action:
        | "school.created"
        | "school.updated"
        | "election.created"
        | "election.updated"
        | "election.archived"
        | "election.test_deleted"
        | "election.status_changed"
        | "candidate.created"
        | "candidate.updated"
        | "voter.created"
        | "voter.updated"
        | "voter_tokens.generated"
        | "voter_token.regenerated"
        | "voter_tokens.regenerated"
        | "vote.cast"
        | "results.finalized"
        | "results.published"
        | "results.unpublished"
        | "results.announcement_started";
      election_status:
        | "draft"
        | "scheduled"
        | "open"
        | "paused"
        | "closed"
        | "archived";
      results_visibility: "private" | "committee" | "public";
    };
    CompositeTypes: Record<string, never>;
  };
};
