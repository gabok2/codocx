class ProjectContext {
    private static instance: ProjectContext;
    private projectPath: string;

    private constructor() {
        this.projectPath = process.cwd();
    }

    public static getInstance(): ProjectContext {
        if (!ProjectContext.instance) {
            ProjectContext.instance = new ProjectContext();
        }
        return ProjectContext.instance;
    }

    public setProjectPath(path: string): void {
        this.projectPath = path;
    }

    public getProjectPath(): string {
        return this.projectPath;
    }
}

export const projectContext = ProjectContext.getInstance();
