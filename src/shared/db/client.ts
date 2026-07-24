import { Dexie, EntityTable } from 'dexie';

import type * as DbTypes from './types';

export interface AppDatabase extends Dexie {
  projects: EntityTable<DbTypes.LocalProject, 'id'>;
  books: EntityTable<DbTypes.LocalBook, 'id'>;
  scenes: EntityTable<DbTypes.LocalScene, 'id'>;
  paragraphs: EntityTable<DbTypes.LocalParagraph, 'id'>;
  characters: EntityTable<DbTypes.LocalCharacter, 'id'>;
  sceneCharacters: EntityTable<DbTypes.LocalSceneCharacter, 'scene_id'>;
  continuityNotes: EntityTable<DbTypes.LocalContinuityNote, 'id'>;
  styleNotes: EntityTable<DbTypes.LocalStyleNote, 'id'>;
  futureBeats: EntityTable<DbTypes.LocalFutureBeat, 'id'>;
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
