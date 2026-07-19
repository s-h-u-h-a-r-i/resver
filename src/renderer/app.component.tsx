import { type Component } from 'solid-js';

import { AuthProvider } from './features/auth';

const App: Component = () => {
  return <AuthProvider />;
};

export default App;
