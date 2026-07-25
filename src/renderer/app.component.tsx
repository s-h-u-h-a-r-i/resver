import { type Component } from 'solid-js';

import { BooksProvider } from './features/books';
import { ProjectsProvider } from './features/projects';

const App: Component = () => {
  return (
    <ProjectsProvider>
      <BooksProvider />
    </ProjectsProvider>
  );
};

export default App;
