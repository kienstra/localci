import { injectable } from 'inversify';

/** Stub class for the editor. */
@injectable()
export default class FakeEditorGateway {
  editor = {
    EventEmitter: class {},
    ThemeIcon: class {},
    TreeItem: class {
      constructor(public label: string) {}
    },
    TreeItemCollapsibleState: {
      Expanded: 'expanded',
      None: 'none',
    },
    window: {
      showInformationMessage: () => null,
      terminals: [{}],
    },
    workspace: {
      asRelativePath: (path: string) => path,
      findFiles: () => Promise.resolve([{ fsPath: 'one/two/' }]),
      workspaceFolders: [{}],
    },
    Uri: {
      file: (path: string) => path,
    },
  };
}