import { expect } from 'chai';
import packageJson from '../package.json';
import * as u from '../src/util';

describe('getLatestVersion()', function () {
  this.timeout(0);

  it('should return the latest version', () => {
    expect(u.getLatestVersion('escapin')).to.equal(packageJson.version);
  });
});

describe('deasyncPromise()', () => {
  it('should return the resolved value', () => {
    expect(u.deasyncPromise((async (): Promise<boolean> => true)())).to.be.true;
  });
});
