import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getBinaryPath } from '../../node/binary.js';
import areTerminalsClosed from './areTerminalsClosed';
import cleanUpCommittedImage from './cleanUpCommittedImage';
import commitContainer from './commitContainer';
import getConfigFile from './getConfigFile';
import getProjectDirectory from './getProjectDirectory';
import getCheckoutDirectoryBasename from './getCheckoutDirectoryBasename';
import getCheckoutJobs from './getCheckoutJobs';
import getDebuggingTerminalName from './getDebuggingTerminalName';
import getStorageDirectory from './getStorageDirectory';
import getImageFromJob from './getImageFromJob';
import getRootPath from './getRootPath';
import {
  GET_RUNNING_CONTAINER_FUNCTION,
  PROCESS_FILE_PATH,
  HOST_TMP_PATH,
} from '../constants';
import getFinalDebuggingTerminalName from './getFinalTerminalName';
import getTerminalName from './getTerminalName';

export default async function runJob(
  jobName: string,
  extensionUri: vscode.Uri
): Promise<RunningTerminal[]> {
  const terminal = vscode.window.createTerminal({
    name: getTerminalName(jobName),
    message: `About to run the CircleCI® job ${jobName}…`,
    iconPath: {
      light: vscode.Uri.joinPath(
        extensionUri,
        'resources',
        'light',
        'logo.svg'
      ),
      dark: vscode.Uri.joinPath(extensionUri, 'resources', 'dark', 'logo.svg'),
    },
  });
  terminal.show();

  const checkoutJobs = getCheckoutJobs(PROCESS_FILE_PATH);
  const localVolume = `${HOST_TMP_PATH}/${path.basename(getRootPath())}`;

  // If this is the only checkout job, rm the entire local volume directory.
  // This job will checkout to that volume, and there could be an error
  // if it attempts to cp to it and the files exist.
  // @todo: fix ocasional permission denied error for deleting this file.
  if (checkoutJobs.includes(jobName) && 1 === checkoutJobs.length) {
    fs.rmSync(localVolume, { recursive: true, force: true });
  }

  const configFile = getConfigFile(PROCESS_FILE_PATH);
  const attachWorkspaceSteps = configFile?.jobs[jobName]?.steps?.length
    ? (configFile?.jobs[jobName]?.steps as Array<Step>).filter((step) =>
        Boolean(step.attach_workspace)
      )
    : [];

  const dockerImage = getImageFromJob(configFile?.jobs[jobName]);
  const initialAttachWorkspace =
    attachWorkspaceSteps.length && attachWorkspaceSteps[0]?.attach_workspace?.at
      ? attachWorkspaceSteps[0].attach_workspace.at
      : '';

  const projectDirectory = await getProjectDirectory(dockerImage, terminal);
  const attachWorkspace =
    '.' === initialAttachWorkspace || !initialAttachWorkspace
      ? projectDirectory
      : initialAttachWorkspace;

  const volume = checkoutJobs.includes(jobName)
    ? `${localVolume}:${getStorageDirectory()}`
    : `${localVolume}/${await getCheckoutDirectoryBasename(
        PROCESS_FILE_PATH,
        terminal
      )}:${attachWorkspace}`;

  if (!fs.existsSync(localVolume)) {
    fs.mkdirSync(localVolume);
  }

  terminal.sendText(
    `${getBinaryPath()} local execute --job ${jobName} --config ${PROCESS_FILE_PATH} --debug -v ${volume}`
  );

  const committedImageName = `local-ci/${jobName}`;
  commitContainer(dockerImage, committedImageName);

  const interval = setInterval(
    () => commitContainer(dockerImage, committedImageName),
    1000
  );

  const debuggingTerminal = vscode.window.createTerminal({
    name: getDebuggingTerminalName(jobName),
    message: 'This is inside the running container',
    iconPath: new vscode.ThemeIcon('testing-debug-icon'),
  });

  // Once the container is available, start an interactive bash session within the container.
  debuggingTerminal.sendText(`
    ${GET_RUNNING_CONTAINER_FUNCTION}
    echo "Waiting for bash access to the running container…"
    until [[ -n $(get_running_container ${dockerImage}) ]]
    do
      sleep 1
    done
    echo "Inside the job's container:"
    docker exec -it ${
      projectDirectory !== 'project' ? '--workdir ' + projectDirectory : ''
    } $(get_running_container ${dockerImage}) /bin/sh || exit 1
  `);

  let finalTerminal: vscode.Terminal | undefined;
  vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (
      closedTerminal.name !== debuggingTerminal.name ||
      !closedTerminal?.exitStatus?.code
    ) {
      return;
    }

    clearTimeout(interval);
    if (finalTerminal || areTerminalsClosed(terminal, debuggingTerminal)) {
      return;
    }

    finalTerminal = vscode.window.createTerminal({
      name: getFinalDebuggingTerminalName(jobName),
      message: 'Debug the final state of the container',
      iconPath: new vscode.ThemeIcon('testing-debug-icon'),
    });
    finalTerminal.sendText(
      `echo "Inside a similar container after the job's container exited:"`
    );

    // @todo: handle if debuggingTerminal exits because terminal hasn't started the container.
    finalTerminal.sendText(
      `docker run -it --rm ${
        projectDirectory !== 'project' ? '--workdir ' + projectDirectory : ''
      } $(docker images --filter reference=${committedImageName} -q | head -1)`
    );
    finalTerminal.show();
  });

  vscode.window.onDidCloseTerminal(() => {
    if (areTerminalsClosed(terminal, debuggingTerminal, finalTerminal)) {
      clearTimeout(interval);
      cleanUpCommittedImage(committedImageName);
    }
  });

  return [
    await terminal.processId,
    await debuggingTerminal.processId,
    finalTerminal ? await finalTerminal?.processId : finalTerminal,
  ];
}
