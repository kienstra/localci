interface SaveCache {
  key: string;
  paths: Array<string>;
}

// See https://circleci.com/docs/2.0/configuration-reference/
interface FullStep {
  checkout?: Record<string, unknown> | string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  attach_workspace?: {
    at: string;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  persist_to_workspace?: {
    root: string;
    paths: Array<string>;
  };
  save_cache?: SaveCache;
  restore_cache?: {
    key?: string;
    keys?: Array<string>;
  };
  run?: {
    command: string;
    name?: string;
    environment?: {
      [key: string]: string;
    };
  } | string;
  'continuation/continue'?: {
    configuration_path: string;
    parameters?: string;
  };
  [key: string]: unknown;
}

type Step = FullStep | string | 'checkout';

interface Job {
  docker?: Array<Record<string, string>>;
  steps?: Step[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  working_directory?: string;
  machine?: { image?: string };
}

type RunningTerminal = number | undefined;
interface RunningTerminals {
  [key: string]: RunningTerminal[]
}
