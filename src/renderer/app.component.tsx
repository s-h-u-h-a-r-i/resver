import { type Component } from 'solid-js';

import { db } from '@/shared/db';
import { BooksProvider } from './features/books';
import { ProjectsProvider } from './features/projects';
import { ScenesProvider } from './features/scenes';

const App: Component = () => {
  return (
    <ProjectsProvider db={db}>
      <BooksProvider db={db}>
        <ScenesProvider db={db} />
      </BooksProvider>
    </ProjectsProvider>
  );
};

export default App;
