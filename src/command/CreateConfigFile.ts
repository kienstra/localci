import { inject, injectable } from 'inversify';
import * as path from 'path';
import type vscode from 'vscode';
import type { Command } from './index';
import { CREATE_CONFIG_FILE_COMMAND } from 'constants/';
import Types from 'common/Types';
import JobProvider from 'job/JobProvider';
import ReporterGateway from 'common/ReporterGateway';
import EditorGateway from 'common/EditorGateway';
import getStarterConfig from 'config/getStarterConfig';

@injectable()
export default class CreateConfigFile implements Command {
  @inject(Types.IEditorGateway)
  editorGateway!: EditorGateway;

  @inject(Types.IReporterGateway)
  reporterGateway!: ReporterGateway;

  commandName: string;

  constructor() {
    this.commandName = CREATE_CONFIG_FILE_COMMAND;
  }

  getCallback(context: vscode.ExtensionContext, jobProvider: JobProvider) {
    return async () => {
      this.reporterGateway.reporter.sendTelemetryEvent('createConfigFile');
      const folderUri = this.editorGateway.editor.workspace.workspaceFolders
        ?.length
        ? this.editorGateway.editor.workspace.workspaceFolders[0].uri
        : null;

      if (!folderUri) {
        return;
      }

      const configUri = folderUri.with({
        path: path.posix.join(folderUri.path, '.circleci', 'config.yml'),
      });
      await this.editorGateway.editor.workspace.fs.writeFile(
        configUri,
        Buffer.from(getStarterConfig(), 'utf8')
      );
      this.editorGateway.editor.window.showTextDocument(configUri);

      this.editorGateway.editor.window.showInformationMessage(
        `👆 Here's a starter config file that you can edit`,
        { detail: 'Starter config file' }
      );
      jobProvider.hardRefresh();
    };
  }
}