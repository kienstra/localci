import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import getAttachWorkspaceCommand from './getAttachWorkspaceCommand';
import getConfig from './getConfig';
import getRestoreCacheCommand from './getRestoreCacheCommand';
import getSaveCacheCommand from './getSaveCacheCommand';
import getSaveCacheSteps from './getSaveCacheSteps';
import {
  CONTAINER_STORAGE_DIRECTORY,
  CONTINUE_PIPELINE_STEP_NAME,
} from '../constants';

function getPersistToWorkspaceCommand(step: FullStep): string | undefined {
  if (typeof step?.persist_to_workspace?.paths === 'string') {
    const pathToPersist = path.join(
      step?.persist_to_workspace?.root ?? '.',
      step?.persist_to_workspace?.paths
    );

    // BusyBox doesn't have the -n option.
    return `cp -rn ${pathToPersist} ${CONTAINER_STORAGE_DIRECTORY} || cp -ru ${pathToPersist} ${CONTAINER_STORAGE_DIRECTORY}`;
  }

  return step?.persist_to_workspace?.paths.reduce(
    (accumulator, workspacePath) => {
      const pathToPersist = path.join(
        step?.persist_to_workspace?.root ?? '.',
        workspacePath
      );

      // BusyBox doesn't have the -n option.
      return `${accumulator} cp -rn ${pathToPersist} ${CONTAINER_STORAGE_DIRECTORY} || cp -ru ${pathToPersist} ${CONTAINER_STORAGE_DIRECTORY} \n`;
    },
    ''
  );
}

function getEnvVarStep() {
  return {
    run: {
      name: 'Set $CIRCLE_SHA1 environment variable',
      command: `echo 'export CIRCLE_SHA1=$(git rev-parse HEAD)' >> $BASH_ENV
        echo 'export CIRCLE_BRANCH=$(git rev-parse --abbrev-ref HEAD)' >> $BASH_ENV`,
    },
  };
}

// Overwrites parts of the process.yml file.
// When there's a persist_to_workspace value in a checkout job, this copies
// the files inside the container to the volume shared with the local machine.
// This way, they can persist between jobs.
// Likewise, on attach_workspace, it copies from the volume.
// The processedConfig was already compiled by the CircleCI® CLI binary.
export default function writeProcessFile(
  processedConfig: string,
  processFilePath: string
): void {
  const config = getConfig(processedConfig);

  if (!config) {
    return;
  }

  const configJobs = config?.jobs ?? {};

  const newConfig = {
    ...config,
    jobs: Object.keys(configJobs).reduce(
      (accumulator: Jobs | Record<string, unknown>, jobName: string) => {
        if (!config || !configJobs[jobName]?.steps) {
          return {
            ...accumulator,
            [jobName]: configJobs[jobName],
          };
        }

        const newSteps = configJobs[jobName].steps?.map((step: Step) => {
          if (typeof step === 'string') {
            return step;
          }

          if (step?.attach_workspace) {
            return {
              run: {
                name: 'Attach workspace',
                command: getAttachWorkspaceCommand(step),
              },
            };
          }

          if (step?.persist_to_workspace) {
            return {
              run: {
                name: 'Persist to workspace',
                command: getPersistToWorkspaceCommand(step),
              },
            };
          }

          if (step?.restore_cache) {
            return {
              run: {
                name: 'Restore cache',
                command: getRestoreCacheCommand(
                  step,
                  getSaveCacheSteps(config)
                ),
              },
            };
          }

          if (step?.save_cache) {
            return {
              run: {
                name: 'Save cache',
                command: getSaveCacheCommand(step),
              },
            };
          }

          if (
            typeof step?.run !== 'string' &&
            step?.run?.command?.includes('$CIRCLE_CONTINUATION_KEY') &&
            step?.run?.environment &&
            step?.run?.environment['CONFIG_PATH']
          ) {
            const dynamicConfigPath = path.join(
              CONTAINER_STORAGE_DIRECTORY,
              'config.yml'
            );
            return {
              run: {
                name: CONTINUE_PIPELINE_STEP_NAME,
                command: `if [ -f ${dynamicConfigPath} ]; then rm ${dynamicConfigPath}; fi; cp ${step?.run?.environment['CONFIG_PATH']} ${dynamicConfigPath};`,
              },
            };
          }

          return step;
        });

        // If a 'checkout' step exists, insert an env var right after it.
        if (newSteps?.includes('checkout')) {
          newSteps?.splice(
            newSteps?.indexOf('checkout') + 1,
            0,
            getEnvVarStep()
          );
        }

        // Simulate attach_workspace and persist_to_workspace.
        return {
          ...accumulator,
          [jobName]: {
            ...configJobs[jobName],
            steps: newSteps,
          },
        };
      },
      {}
    ),
  };

  if (!fs.existsSync(path.dirname(processFilePath))) {
    fs.mkdirSync(path.dirname(processFilePath), { recursive: true });
  }
  fs.writeFileSync(processFilePath, yaml.dump(newConfig));
}
