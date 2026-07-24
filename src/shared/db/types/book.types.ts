export interface LocalBook {
  id: string;
  project_id: string;
  title: string;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
