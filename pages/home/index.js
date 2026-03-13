Page({
  data: {
    items: [],
    loading: true,
    hasMore: true,
    page: 0,
    pageSize: 10,
    error: false,
    errorMsg: ''
  },

  onLoad() {
    this.loadItems();
  },

  onShow() {
    this.refreshItems();
  },

  async refreshItems() {
    this.setData({
      items: [],
      page: 0,
      hasMore: true,
      error: false
    });
    await this.loadItems();
  },

  async loadItems() {
    if (!this.data.hasMore) {
      return;
    }

    if (this.data.loading && this.data.items.length > 0) {
      return;
    }

    this.setData({ loading: true, error: false });

    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getList',
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      });

      if (res.errMsg === 'cloud.callFunction:ok' && res.result) {
        const newItems = res.result.data || [];
        
        const formattedItems = [];
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          formattedItems.push({
            _id: item._id,
            _openid: item._openid,
            title: item.title,
            desc: item.desc,
            contact: item.contact,
            images: item.images,
            status: item.status,
            createdAt: this.formatDate(item.createdAt)
          });
        }
        
        this.setData({
          items: this.data.items.concat(formattedItems),
          loading: false,
          hasMore: newItems.length === this.data.pageSize,
          page: this.data.page + 1
        });
      } else {
        throw new Error('云函数调用失败');
      }
    } catch (err) {
      console.error('加载失败', err);
      
      let errorMsg = '加载失败';
      if (err.errMsg && err.errMsg.indexOf('env not exists') >= 0) {
        errorMsg = '请先配置云开发环境';
      } else if (err.errMsg && err.errMsg.indexOf('FunctionName') >= 0) {
        errorMsg = '请先部署云函数';
      }
      
      this.setData({ 
        loading: false,
        error: true,
        errorMsg: errorMsg
      });
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
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

  onReachBottom() {
    this.loadItems();
  },

  onPullDownRefresh() {
    const that = this;
    this.refreshItems().then(function() {
      wx.stopPullDownRefresh();
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/detail/index?id=' + id
    });
  },

  onSearch() {
    wx.navigateTo({
      url: '/pages/home/search'
    });
  },

  onRetry() {
    this.refreshItems();
  }
});
