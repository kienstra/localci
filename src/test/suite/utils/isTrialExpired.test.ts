import * as assert from 'assert';
import * as mocha from 'mocha';
import * as sinon from 'sinon';
import {
  EXTENDED_TRIAL_LENGTH_IN_MILLISECONDS,
  TRIAL_LENGTH_IN_MILLISECONDS,
} from '../../../constants';
import isTrialExpired from '../../../utils/isTrialExpired';

mocha.afterEach(() => {
  sinon.restore();
});

const dayInMilliseconds = 86400000;
const extendedTrial =
  TRIAL_LENGTH_IN_MILLISECONDS + EXTENDED_TRIAL_LENGTH_IN_MILLISECONDS;

suite('isTrialExpired', () => {
  test('preview just began', () => {
    assert.strictEqual(
      isTrialExpired(new Date().getTime(), TRIAL_LENGTH_IN_MILLISECONDS),
      false
    );
  });

  test('preview barely expired', () => {
    assert.strictEqual(
      isTrialExpired(
        new Date().getTime() - (15 * dayInMilliseconds + 1),
        TRIAL_LENGTH_IN_MILLISECONDS
      ),
      true
    );
  });

  test('trial expired by 2 days', () => {
    assert.strictEqual(
      isTrialExpired(
        new Date().getTime() - 17 * dayInMilliseconds,
        TRIAL_LENGTH_IN_MILLISECONDS
      ),
      true
    );
  });

  test('preview just began and was extended', () => {
    assert.strictEqual(
      isTrialExpired(new Date().getTime(), TRIAL_LENGTH_IN_MILLISECONDS),
      false
    );
  });

  test('preview began 15 days and 10 milliseconds ago and was extended', () => {
    assert.strictEqual(
      isTrialExpired(
        new Date().getTime() - (15 * dayInMilliseconds + 10),
        extendedTrial
      ),
      false
    );
  });

  test('preview 17 days ago and was extended', () => {
    assert.strictEqual(
      isTrialExpired(
        new Date().getTime() - 17 * dayInMilliseconds,
        extendedTrial
      ),
      false
    );
  });

  test('preview began 30 days and 1 millisecond ago and was extended', () => {
    assert.strictEqual(
      isTrialExpired(
        new Date().getTime() - 30 * dayInMilliseconds,
        extendedTrial
      ),
      true
    );
  });
});
