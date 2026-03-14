const tracker = {
  pageView: function(page) {
    wx.cloud.callFunction({
      name: 'analytics',
      data: {
        action: 'pageView',
        data: { page: page }
      },
      success: function() {},
      fail: function() {}
    });
  },

  click: function(page, button) {
    wx.cloud.callFunction({
      name: 'analytics',
      data: {
        action: 'click',
        data: { page: page, button: button }
      },
      success: function() {},
      fail: function() {}
    });
  }
};

module.exports = tracker;
