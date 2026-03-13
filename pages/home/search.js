Page({
  data: {
    keyword: '',
    items: [],
    loading: false,
    searched: false
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  async onSearch() {
    if (!this.data.keyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true, searched: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getList',
          keyword: this.data.keyword,
          page: 0,
          pageSize: 100
        }
      });

      this.setData({
        items: res.result.data || [],
        loading: false
      });
    } catch (err) {
      console.error('搜索失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    });
  },

  clearKeyword() {
    this.setData({
      keyword: '',
      items: [],
      searched: false
    });
  }
});
