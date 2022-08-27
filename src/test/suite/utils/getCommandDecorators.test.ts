import * as assert from 'assert';
import * as mocha from 'mocha';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import getCommandDecorators from '../../../utils/getCommandDecorators';

mocha.afterEach(() => {
  sinon.restore();
});

suite('getCommandDecorators', () => {
  test('neither pre nor post command enabled', () => {
    sinon.stub(vscode, 'workspace').value({
      getConfiguration: () => {
        return { get: () => false };
      },
    });

    assert.deepEqual(getCommandDecorators(), {
      getPreCommand: '',
      getPostCommand: '',
      evalPreCommand: '',
      evalPostCommand: '',
    });
  });

  test('both pre and post command enabled', () => {
    sinon.stub(vscode, 'workspace').value({
      getConfiguration: (extension: string) => {
        if (extension === 'local-ci') {
          return {
            get: (configuration: string) => {
              return [
                'command.job.enable-pre-command',
                'command.job.enable-post-command',
              ].includes(configuration);
            },
          };
        }
      },
    });

    assert.deepEqual(getCommandDecorators(), {
      getPreCommand: `echo "Please enter what you want to run before the job command (this will appear in stdout):"; read pre_command;`,
      getPostCommand: `echo "Please enter what you want to run after the job command (this may appear in stdout):"; read -s post_command;`,
      evalPreCommand: `eval $pre_command`,
      evalPostCommand: `eval $post_command`,
    });
  });
});
