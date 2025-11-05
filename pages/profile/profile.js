//pages/profile/profile.js
Page({
  data: {
    userInfo: {
      nickname: '图片拼接用户',
      avatar: '👤'
    },
    features: [
      {
        id: 'history',
        title: '历史记录',
        subtitle: '查看我的拼图作品',
        icon: '📚',
        description: '管理已保存的拼图，支持预览、下载和删除',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        path: '/pages/history/history'
      },
      {
        id: 'settings',
        title: '设置',
        subtitle: '个性化配置',
        icon: '⚙️',
        description: '调整应用设置，个性化你的使用体验',
        color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        path: '', // 待开发
        comingSoon: true
      },
      {
        id: 'about',
        title: '关于我们',
        subtitle: '了解应用信息',
        icon: 'ℹ️',
        description: '版本信息、使用帮助和意见反馈',
        color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        path: '', // 待开发
        comingSoon: true
      }
    ],
    stats: {
      totalWorks: 0,
      totalImages: 0,
      lastCreateTime: null
    }
  },

  onLoad: function (options) {
    this.loadUserStats();
  },

  onShow: function () {
    this.loadUserStats();
  },

  // 加载用户统计数据
  loadUserStats () {
    try {
      const history = wx.getStorageSync('imageHistory') || [];
      const totalImages = history.reduce((sum, item) => sum + (item.imageCount || 0), 0);
      const lastCreateTime = history.length > 0 ? Math.max(...history.map(item => item.timestamp)) : null;

      this.setData({
        'stats.totalWorks': history.length,
        'stats.totalImages': totalImages,
        'stats.lastCreateTime': lastCreateTime
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 处理功能卡片点击
  onFeatureClick (e) {
    const feature = e.currentTarget.dataset.feature;

    if (feature.comingSoon) {
      wx.showToast({
        title: '功能开发中',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (feature.path) {
      wx.navigateTo({
        url: feature.path
      });
    }
  },

  // 跳转到历史记录
  goToHistory () {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 清除所有数据
  clearAllData () {
    wx.showModal({
      title: '清除数据',
      content: '确定要清除所有应用数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            this.loadUserStats();
            wx.showToast({
              title: '数据已清除',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: '清除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 格式化时间
  formatLastTime (timestamp) {
    if (!timestamp) return '暂无记录';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) { // 今天
      return '今天 ' + date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diff < 172800000) { // 昨天
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }
});
