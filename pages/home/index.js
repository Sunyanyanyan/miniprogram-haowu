const tags = ['全部', '口粮', '穿搭', '洗护', '玩趣', '妈咪'];

Page({
  data: {
    items: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    error: false,
    errorMsg: '',
    tags: tags,
    currentTag: '全部',
    keyword: '',
    initialized: false,
    isLoadingMore: false
  },

  onLoad() {
    this.loadItems();
  },

  onShow() {
    if (this.data.initialized) {
      const app = getApp();
      if (app.globalData.needRefreshHome) {
        this.setData({
          currentTag: '全部',
          keyword: ''
        });
        this.refreshItems();
        app.globalData.needRefreshHome = false;
      }
    }
    this.setData({ initialized: true });
  },

  async refreshItems() {
    this.setData({
      items: [],
      page: 0,
      hasMore: true,
      error: false,
      isLoadingMore: false
    });
    await this.loadItems();
  },

  async loadItems() {
    if (!this.data.hasMore) {
      return;
    }

    if (this.data.isLoadingMore) {
      return;
    }

    this.setData({ loading: true, error: false, isLoadingMore: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'item',
        data: {
          action: 'getList',
          page: this.data.page,
          pageSize: this.data.pageSize,
          tag: this.data.currentTag,
          keyword: this.data.keyword
        }
      });

      if (res.errMsg === 'cloud.callFunction:ok' && res.result) {
        const newItems = res.result.data || [];
        const hasMore = res.result.hasMore || false;
        const now = Date.now();
        
        const formattedItems = newItems.map(item => {
          const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : now;
          const expireAt = item.expireAt ? (typeof item.expireAt === 'number' ? item.expireAt : new Date(item.expireAt).getTime()) : null;
          const isExpired = expireAt && expireAt < now;
          const isUrgent = !isExpired && expireAt && (expireAt - now) < 30 * 60 * 1000;
          
          return {
            _id: item._id,
            _openid: item._openid,
            title: item.title,
            desc: item.desc,
            contact: item.contact,
            images: item.images,
            tag: item.tag,
            status: item.status,
            value: item.value,
            createdAt: this.formatTime(item.createdAt),
            createdAtTime: createdAt,
            isUrgent: isUrgent,
            isExpired: isExpired
          };
        });
        
        const existingIds = new Set(this.data.items.map(item => item._id));
        const uniqueNewItems = formattedItems.filter(item => !existingIds.has(item._id));
        
        this.setData({
          items: this.data.items.concat(uniqueNewItems),
          loading: false,
          hasMore: hasMore,
          page: this.data.page + 1,
          isLoadingMore: false
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
        errorMsg: errorMsg,
        isLoadingMore: false
      });
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    }
  },

  formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    } else {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return month + '-' + day;
    }
  },

  formatExpireTime(expireAt) {
    if (!expireAt) return '';

    try {
      const d = new Date(expireAt);
      if (isNaN(d.getTime())) return '';

      const pad = value => String(value).padStart(2, '0');

      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hour = pad(d.getHours());
      const minute = pad(d.getMinutes());
      const second = pad(d.getSeconds());

      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (e) {
      console.error('格式化过期时间失败:', e);
      return '';
    }
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

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm() {
    this.setData({ currentTag: '全部' });
    this.refreshItems();
  },

  clearSearch() {
    this.setData({ 
      keyword: '',
      currentTag: '全部'
    });
    this.refreshItems();
  },

  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    if (tag === this.data.currentTag) return;
    
    this.setData({
      currentTag: tag,
      keyword: '',
      items: [],
      page: 0,
      hasMore: true
    });
    this.loadItems();
  },

  onRetry() {
    this.refreshItems();
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.items;
    if (items[index]) {
      items[index].imageError = true;
      this.setData({ items: items });
    }
  }
});
