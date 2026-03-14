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

      const items = res.result.data || [];
      const formattedItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.title.indexOf(this.data.keyword) >= 0 || 
            (item.desc && item.desc.indexOf(this.data.keyword) >= 0)) {
          formattedItems.push({
            _id: item._id,
            title: item.title,
            desc: item.desc,
            images: item.images,
            createdAt: this.formatDate(item.createdAt)
          });
        }
      }

      this.setData({
        items: formattedItems,
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

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/detail/index?id=' + id
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
