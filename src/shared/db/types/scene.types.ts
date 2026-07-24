export interface LocalScene {
  id: string;
  book_id: string;
  title: string;
  position: number;
  status: 'draft' | 'revised' | 'final';
  word_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
