import { Accessor, createContext, ParentComponent, useContext } from 'solid-js';

import {
  createLiveQuery,
  projectRepository,
  type CreateProjectInput,
  type LocalProject,
  type UpdateProjectInput,
} from '@/shared/db';

interface ProjectsContextValue {
  projects: Accessor<LocalProject[]>;
  createProject(input: CreateProjectInput): Promise<void>;
  updateProject(id: string, input: UpdateProjectInput): Promise<void>;
  deleteProject(id: string): Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue>();

export const ProjectsProvider: ParentComponent = (props) => {
  const projects = createLiveQuery(projectRepository.list, {
    initial: [],
  });

  const value: ProjectsContextValue = {
    projects,

    async createProject(input) {
      await projectRepository.create(input);
    },

    async updateProject(id, input) {
      await projectRepository.update(id, input);
    },

    async deleteProject(id) {
      await projectRepository.softDelete(id);
    },
  };

  return (
    <ProjectsContext.Provider value={value}>
      {props.children}
    </ProjectsContext.Provider>
  );
};

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error(
      `${useProjects.name} must be used within ${ProjectsProvider.name}`,
    );
  }
  return ctx;
}
