Component({
  data: {
    showPrivacy: false
  },

  lifetimes: {
    attached: function() {
      const that = this;
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: function(res) {
            if (res.needAuthorization) {
              that.setData({ showPrivacy: true });
            }
          },
          fail: function() {
            console.log('获取隐私设置失败');
          }
        });
      }
    }
  },

  methods: {
    handleDisagree: function() {
      this.setData({ showPrivacy: false });
      wx.showToast({
        title: '您拒绝了授权',
        icon: 'none'
      });
    },

    handleAgree: function() {
      this.setData({ showPrivacy: false });
      this.triggerEvent('agree');
    }
  }
});
