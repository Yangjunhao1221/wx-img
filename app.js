App({
  onLaunch: function () {
    // 小程序启动时的初始化
    console.log('图片拼接工具启动')

    // 忽略已知的系统错误
    const originalError = console.error;
    console.error = function (...args) {
      const errorMsg = args.join(' ');
      if (errorMsg.includes('webapi_getwxaasyncsecinfo:fail')) {
        // 忽略这个已知的微信开发者工具错误
        return;
      }
      originalError.apply(console, args);
    };
  },

  onError: function (err) {
    // 过滤掉已知的系统错误
    if (err.includes && err.includes('webapi_getwxaasyncsecinfo:fail')) {
      return;
    }
    console.error('小程序错误:', err);
  },

  globalData: {
    userInfo: null
  }
})
