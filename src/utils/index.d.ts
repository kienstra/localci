type Jobs = Record<string, Job>;

interface CiConfigWithJobs {
  jobs: Jobs;
  workflows: {
    [key: string]: {
      jobs: (Record<string, unknown>|string)[];
    }
  }
}

type CiConfig = CiConfigWithJobs | undefined;

interface ConfigFileQuickPick {
  label: string;
  description: string;
  fsPath: string;
}

interface SpawnOptions {
  cwd: string;
  env: {
    PATH: string;
    [key: string]: any;
  };
}

interface ErrorWithMessage {
  message: string;
}
