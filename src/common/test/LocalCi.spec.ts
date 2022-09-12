import * as vscode from 'vscode';
import AppTestHarness from 'test-tools/helpers/AppTestHarness';
import LocalCi from 'common/LocalCi';
import { Substitute } from '@fluffy-spoon/substitute';
import FakeEditorGateway from 'common/FakeEditorGateway';
const getContext = () => Substitute.for<vscode.ExtensionContext>();

let testHarness: AppTestHarness;
let localCi: LocalCi;
let editorGateway: FakeEditorGateway;

describe('LocalCi', () => {
  beforeEach(() => {
    testHarness = new AppTestHarness();
    testHarness.init();
    localCi = testHarness.container.get(LocalCi);
    editorGateway = testHarness.editorGateway;
  });

  describe('activate', () => {
    test('registersCommands', () => {
      const expectedCommands = [
        'local-ci.create.config',
        'local-ci.debug.repo',
        'local-ci.license.enter',
        'localCiJobs.enterToken',
        'localCiJobs.exitAllJobs',
        'local-ci.job.exit',
        'local-ci.license.get',
        'localCiJobs.help',
        'localCiJobs.refresh',
        'localCiLicense.refresh',
        'local-ci.job.rerun',
        'local-ci.job.run',
        'local-ci.runWalkthroughJob',
        'localCiJobs.selectRepo',
        'local-ci.show.log-file',
        'local-ci.process-error.try-again',
      ];

      const spy = jest.fn();
      editorGateway.editor.commands.registerCommand = spy;
      localCi.activate(getContext());

      const registeredCommands = spy.mock.calls.map((call) => {
        return call[0];
      });

      expect(
        expectedCommands.every((command) => {
          if (registeredCommands.includes(command)) {
            return true;
          }

          throw new Error(`Did not register the command ${command}`);
        })
      ).toBe(true);
    });
  });
});