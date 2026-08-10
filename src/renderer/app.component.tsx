import { type Component } from 'solid-js';

import { db } from '@/renderer/core/database';
import { BooksProvider } from './features/books';
import { ProjectsProvider } from './features/projects';
import { ScenesProvider } from './features/scenes';
import { WorkspaceProvider } from './features/workspace';

const App: Component = () => {
  return (
    <ProjectsProvider db={db}>
      <BooksProvider db={db}>
        <ScenesProvider db={db}>
          <WorkspaceProvider db={db} />
        </ScenesProvider>
      </BooksProvider>
    </ProjectsProvider>
  );
};

export default App;
