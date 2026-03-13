App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-env-id',
        traceUser: true,
      });
    }
    
    this.globalData = {
      userInfo: null,
      openid: null
    };
  },

  getUserOpenid: async function() {
    if (this.globalData.openid) {
      return this.globalData.openid;
    }
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpenid'
      });
      this.globalData.openid = res.result.openid;
      return res.result.openid;
    } catch (err) {
      console.error('获取 openid 失败', err);
      return null;
    }
  }
});
