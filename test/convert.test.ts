import { convertJS } from '../src/convertJS';
import { GeneratorResult } from '@babel/generator';

function convertResult(result: { result: GeneratorResult; changed: boolean }) {
  return result.result;
}

describe(`convert`, () => {
  it(`wx.myPage`, async () => {
    const result = convertResult(await convertJS(`wx.myPage()`));

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`JPage()`);
    expect(result.code).toContain(`jgb-weapp`);
  });

  it(`wx.Util`, async () => {
    const result = convertResult(
      await convertJS(`const px:number = wx.Util.rpx2px(12)`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`rpx2px(12)`);
    expect(result.code).toContain(`localModules/tuhu/utils`);
  });

  it(`wx.apis`, async () => {
    const result = convertResult(await convertJS(`wx.apis.xxx`));

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`apis.xxx`);
    expect(result.code).toContain(`localModules/apis`);
  });

  it(`wx.fetch`, async () => {
    const result = convertResult(
      await convertJS(`wx.fetch({url: 'asdfasdf'})`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`request(`);
    expect(result.code).toContain(`localModules/init/request`);
  });

  it(`wx.tuhu.getPageUrl`, async () => {
    const result = convertResult(
      await convertJS(`const url = wx.tuhu.getPageUrl()`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`getPageUrl()`);
    expect(result.code).toContain(`localModules/tuhu`);
  });

  it(`wx.pageToken`, async () => {
    const result = convertResult(await convertJS(`wx.pageToken(123123)`));

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`payService.getToken(`);
    expect(result.code).toContain(`@tuhu/mp-lib/lib/pay`);
  });
});

describe(`ta`, () => {
  it(`wx.Ta()`, async () => {
    const result = convertResult(
      await convertJS(`
    wx.Ta({
      event_action: 'action',
      'event_type': 'event',
      metadata: JSON.stringify({
        data: 'xxxx'
      })
    })`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`tuhuTA.track(`);
    expect(result.code).toContain(`localModules/init/ta`);
  });
  it(`wx.Ta.ta()`, async () => {
    const result = convertResult(
      await convertJS(`
        wx.Ta.ta({
          event_action: 'action',
          'event_type': 'event',
          metadata: {
            data: 'xxxx'
          }
        })`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`tuhuTA.track(`);
    expect(result.code).toContain(`localModules/init/ta`);
  });
  it(`wx.Ta.ta().track()`, async () => {
    const result = convertResult(
      await convertJS(`
        wx.Ta.ta({
          event_action: 'action',
          'event_type': 'event',
          metadata: {
            data: 'xxxx'
          }
        }).track()`)
    );

    expect(result.code).not.toContain('wx');
    expect(result.code).toContain(`taSensors(`);
    expect(result.code).toContain(`localModules/init/ta`);
  });
});
