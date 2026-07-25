import type { EntityTable } from 'dexie';

export interface LocalSceneCharacter {
  scene_id: string;
  character_id: string;
  created_at: string;
}

export type SceneCharactersTable = EntityTable<LocalSceneCharacter, 'scene_id'>;
