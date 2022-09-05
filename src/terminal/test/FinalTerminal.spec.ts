import ChildProcessGateway from 'common/ChildProcessGateway';
import EditorGateway from 'common/EditorGateway';
import AppTestHarness from 'test/helpers/AppTestHarness';
import FinalTerminal from '../FinalTerminal';

let testHarness: AppTestHarness;
let childProcessGateway: ChildProcessGateway;
let editorGateway: EditorGateway;
let finalTerminal: FinalTerminal;

describe('showFinalTerminalHelperMessages', () => {
  beforeEach(() => {
    testHarness = new AppTestHarness();
    testHarness.init();
    finalTerminal = testHarness.container.get(FinalTerminal);
    childProcessGateway = testHarness.childProcessGateway;
    editorGateway = testHarness.editorGateway;
  });

  test('no helper message', async () => {
    const showInformationMessageSpy = jest.fn();
    editorGateway.editor.window.showInformationMessage =
      showInformationMessageSpy;

    const spawnSpy = jest.fn();
    spawnSpy.mockImplementationOnce(() => {
      return {
        stdout: {
          on: (event: unknown, callback: CallableFunction) =>
            callback({ toString: () => 'Here is a message' }),
        },
      };
    });
    childProcessGateway.cp.spawn = spawnSpy;

    finalTerminal.showHelperMessages('9234323');
    expect(showInformationMessageSpy.mock.lastCall).toBeFalsy();
  });

  test('with helper message', async () => {
    const showInformationMessageSpy = jest.fn();
    editorGateway.editor.window.showInformationMessage =
      showInformationMessageSpy;

    const spawnSpy = jest.fn();
    spawnSpy.mockImplementationOnce(() => {
      return {
        stdout: {
          on: (event: unknown, callback: CallableFunction) =>
            callback({
              toString: () =>
                '_XSERVTransmkdir: Owner of /tmp/.X11-unix should be set to root',
            }),
        },
      };
    });
    childProcessGateway.cp.spawn = spawnSpy;

    finalTerminal.showHelperMessages('9234323');
    expect(showInformationMessageSpy.mock.lastCall[0]).toEqual(
      `👈 If you click return in the terminal, you should be able to debug this. This error is for the X11 (graphical) server.`
    );
  });
});
