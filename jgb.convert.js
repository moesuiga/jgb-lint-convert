module.exports = {
  'wx.myPage': {
    replacedKey: 'JPage',
    import: 'jgb-weapp',
  },
  'wx.apis': {
    replacedKey: 'apis',
    isDefault: true,
    import: 'localModules/apis',
  },
  'wx.Util.rpx2px': {
    replacedKey: 'rpx2px',
    import: 'localModules/tuhu/utils',
  },
  'wx.tuhu.getPageUrl': {
    replacedKey: 'getPageUrl',
    import: 'localModules/tuhu',
  },
  'wx.fetch': {
    replacedKey: 'request',
    import: 'localModules/init/request',
  },
  'wx.pageToken': {
    replacedKey: 'payService.getToken',
    import: '@tuhu/mp-lib/lib/pay',
  }
}