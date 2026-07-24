export interface LocalCharacter {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
