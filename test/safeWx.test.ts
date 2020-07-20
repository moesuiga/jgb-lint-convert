import { safeWx } from '../src/safe_wx';

describe('safeWx', () => {
  it('function return', async () => {
    const result = await safeWx(`
    function xxx() {
      return wx
    }`);

    expect(result.code).toContain('safeWx');
  });

  it('Object.assign', async () => {
    const result = await safeWx(`
    Object.assign({}, wx)`);
    expect(result.code).toContain('safeWx');
  });

  it('safeWx will not convert', async () => {
    const result = await safeWx(`safeWx(wx)`);
    expect(result.code).toBe('safeWx(wx);');
  });

  it('wx.xxx will not convert', async () => {
    const result = await safeWx(`wx.getXXX()`);
    expect(result.code).toBe('wx.getXXX();');
  });

  it(`condition`, async () => {
    const result = await safeWx(`"undefined" != typeof wx && "function" == typeof wx.getSystemInfo ? wx : "undefined"`);
    
    expect(result.code).toContain('safeWx(wx)');
  });
});
