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

  const createProject = async (input: CreateProjectInput) => {
    await projectRepository.create(input);
  };

  const updateProject = async (id: string, input: UpdateProjectInput) => {
    await projectRepository.update(id, input);
  };

  const deleteProject = async (id: string) => {
    await projectRepository.softDelete(id);
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        createProject,
        updateProject,
        deleteProject,
      }}>
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
