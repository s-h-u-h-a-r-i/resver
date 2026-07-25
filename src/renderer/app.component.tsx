import { type Component } from 'solid-js';

import { BooksProvider } from './features/books';
import { ProjectsProvider } from './features/projects';
import { ScenesProvider } from './features/scenes';

const App: Component = () => {
  return (
    <ProjectsProvider>
      <BooksProvider>
        <ScenesProvider />
      </BooksProvider>
    </ProjectsProvider>
  );
};

export default App;
