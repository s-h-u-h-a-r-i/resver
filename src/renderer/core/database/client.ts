import { Dexie } from 'dexie';

import type * as DbTypes from './types';

export interface AppDatabase extends Dexie {
  projects: DbTypes.ProjectsTable;
  books: DbTypes.BooksTable;
  scenes: DbTypes.ScenesTable;
  paragraphs: DbTypes.ParagraphsTable;
  characters: DbTypes.CharactersTable;
  sceneCharacters: DbTypes.SceneCharactersTable;
  continuityNotes: DbTypes.ContinuityNotesTable;
  styleNotes: DbTypes.StyleNotesTable;
  futureBeats: DbTypes.FutureBeatsTable;
}

export const db = new Dexie('resver') as AppDatabase;

db.version(1).stores({
  projects: 'id, deleted_at, updated_at',
  books: 'id, project_id, deleted_at, updated_at',
  scenes: 'id, book_id, deleted_at, updated_at',
  paragraphs: 'id, scene_id, deleted_at, updated_at',
  characters: 'id, project_id, deleted_at, updated_at',
  sceneCharacters: '[scene_id+character_id], scene_id, character_id',
  continuityNotes: 'id, paragraph_id, deleted_at, updated_at',
  styleNotes: 'id, project_id, deleted_at, updated_at',
  futureBeats: 'id, project_id, deleted_at, updated_at',
});
