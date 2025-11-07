// pages/collage/collage.js
const { getLayoutTemplates } = require('../../utils/layoutTemplates.js');
const {
  calculateLayout, getRecommendedLayout, validateLayout,
} = require('../../utils/layoutCalculator.js');

Page({
  // Canvas对象存储为组件属性,不放在data中(真机上canvas/ctx是只读的,不能存入data)
  _canvas: null,
  _ctx: null,
  _updateCanvasTimer: null, // 画布更新节流定时器
  _contentScrollTop: 0, // 内容区域滚动位置
  _contentTouchStartY: 0, // 内容区域触摸起始Y坐标
  _isContentAtTop: true, // 内容区域是否在顶部

  data: {
    // 新流程: 先选布局,再选图片
    workflowStep: 'selectLayout', // selectLayout, addImages, editing

    // Tab 相关（新增）
    currentTab: 'template',  // 'poster' | 'template' | 'splice' | 'free' | 'settings'
    tabs: [
      { id: 'poster', name: '海报' },
      { id: 'template', name: '模版' },
      { id: 'splice', name: '拼接' },
      { id: 'free', name: '自由' },
      { id: 'settings', name: '设置' }
    ],

    // 抽屉状态管理
    drawerState: 'collapsed',  // 'collapsed' | 'half' | 'full'
    drawerHeight: 100,  // 当前抽屉高度（从60改为100）
    windowHeight: 0,   // 屏幕高度
    showCollapseButton: false,  // 是否显示收起按钮

    // 抽屉触摸相关
    drawerTouchStartY: 0,
    drawerTouchStartHeight: 0,

    // 自定义导航栏相关
    statusBarHeight: 0,      // 状态栏高度
    navigationBarHeight: 44, // 导航栏高度(不含状态栏)
    menuButtonInfo: null,    // 胶囊按钮信息

    // Loading 状态（新增）
    isLoading: false,
    loadingText: '加载中...',

    // 图片相关
    imageList: [],
    selectedImages: [],
    maxImages: 16,  // 升级到支持16张图片
    imageSlots: [],  // 图片槽位,每个槽位对应布局中的一个位置

    // 布局相关
    layoutType: 'grid',
    selectedLayout: null,  // 改为null,表示未选择
    currentLayoutTemplate: null,  // 当前选中的布局模板
    availableLayouts: [],
    allLayoutTemplates: [],  // 所有布局模板(1-16张图片)
    layoutGroups: [],  // 按图片数量分组的布局模板
    inlineTemplates: [], // 编辑区下方内联推荐模板（根据已选图片数量）
    selectedImageCount: 0,  // 当前选择的图片数量分类(0表示显示全部)
    direction: 'horizontal', // horizontal, vertical

    // 画布设置
    canvasWidth: 750,
    canvasHeight: 750,
    aspectRatio: '1:1',
    aspectRatios: [
      {
        label: '1:1 正方形', value: '1:1', width: 1,
        height: 1,
      },
      {
        label: '3:4 竖版', value: '3:4', width: 3,
        height: 4,
      },
      {
        label: '4:3 横版', value: '4:3', width: 4,
        height: 3,
      },
      {
        label: '9:16 手机竖屏', value: '9:16', width: 9,
        height: 16,
      },
      {
        label: '16:9 手机横屏', value: '16:9', width: 16,
        height: 9,
      },
      {
        label: '10:16 竖版海报', value: '10:16', width: 10,
        height: 16,
      },
      {
        label: '16:10 横版海报', value: '16:10', width: 16,
        height: 10,
      },
      {
        label: 'A4 纸张', value: 'A4', width: 210,
        height: 297,
      },
      {
        label: 'A4 横向', value: 'A4-H', width: 297,
        height: 210,
      },
    ],
    customWidth: 1,
    customHeight: 1,

    // 样式设置
    borderWidth: 0,
    spacing: 10,
    cornerRadius: 8,
    backgroundColor: '#FFFFFF',
    backgroundImage: '',

    // 图片显示模式
    imageFitMode: 'cover', // 'cover' 填满槽位, 'contain' 完全显示

    // 水印设置
    enableWatermark: false,
    watermarkText: '',
    watermarkSize: 20,
    watermarkOpacity: 0.15,
    watermarkAngle: -30,
    watermarkDensity: 'medium',

    // 导出设置
    exportQuality: 'high',
    exportFormats: [
      { label: '高清JPG', value: 'high' },
      { label: '标准JPG', value: 'standard' },
      { label: '无损PNG', value: 'png' },
    ],

    // 编辑工具
    editMode: false,
    currentTool: '', // text, arrow, rect, circle
    editElements: [], // 绘制元素列表
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 0 },

    // 文字工具
    textInput: '',
    textColor: '#FF0000',
    textSize: 24,

    // 绘图工具
    strokeColor: '#FF0000',
    strokeWidth: 3,
    fillColor: 'transparent',

    // 界面状态
    isLoading: false,

    // 拖拽相关
    isDragging: false,
    dragIndex: -1,
    dragStartPos: { x: 0, y: 0 },
    imagePositions: [], // 存储每个图片的位置和尺寸信息
    baseCanvasData: null, // 缓存基础画布数据

    // 图片操作相关
    selectedImageIndex: -1, // 当前选中的图片索引

    // 图片工具条
    showImageToolbar: false, // 是否显示图片工具条
    toolbarImageIndex: -1, // 工具条对应的图片索引
    toolbarPosition: { x: 0, y: 0 }, // 工具条位置
    imageScale: {}, // 每张图片的缩放比例 {index: scale}
    imageRotation: {}, // 每张图片的旋转角度 {index: angle}
  },

  onLoad: function (options) {
    console.log('布局拼图页面onLoad, options:', options);

    // 获取窗口高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      windowHeight: systemInfo.windowHeight
    });

    // 初始化默认画布尺寸
    this.initDefaultCanvasSize();
    // 加载所有布局模板
    this.loadAllLayoutTemplates();

    // 真机兼容方案：优先从全局数据读取，兜底用eventChannel
    const fromIndex = options && options.fromIndex === '1';
    if (fromIndex) {
      const app = getApp();
      const paths = (app.globalData && app.globalData.pendingCollageImages) || [];
      if (paths && paths.length > 0) {
        console.log('从全局数据读取已选图片:', paths);
        // 清空全局数据，避免重复使用
        if (app.globalData) {
          app.globalData.pendingCollageImages = null;
        }
        this.initWithSelectedImages(paths);
        return; // 已处理，不再监听eventChannel
      }
    }

    // 兜底：通过eventChannel接收（开发者工具可能走这里）
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && eventChannel.on) {
        eventChannel.on('selectedImages', (data) => {
          const paths = (data && data.paths) || [];
          console.log('收到首页传入的已选图片(eventChannel):', paths);
          if (paths && paths.length) {
            this.initWithSelectedImages(paths);
          }
        });
      }
    } catch (err) {
      console.warn('获取事件通道失败:', err);
    }
  },

  onReady: function () {
    // 页面渲染完成后初始化Canvas
    console.log('布局拼图页面onReady,开始初始化Canvas');

    // 初始化自定义导航栏
    this.initCustomNavigationBar();

    this.initCanvas();
  },

  onShow: function () {
    console.log('布局拼图页面onShow');

    // 检查Canvas是否需要重新初始化(从组件属性检查)
    if (!this._ctx || !this._canvas) {
      console.log('onShow: Canvas未初始化,重新初始化');
      this.initCanvas();
    }
  },

  // 加载所有布局模板 - 按图片数量分组
  loadAllLayoutTemplates () {
    console.log('加载所有布局模板');
    const allTemplates = [];
    const groups = [];

    // 加载1-16张图片的所有布局模板
    for (let i = 1; i <= 16; i++) {
      const templates = getLayoutTemplates(i);
      if (templates && templates.length > 0) {
        const templatesWithCount = templates.map(template => ({
          ...template,
          imageCount: i,  // 添加图片数量标识
        }));

        // 添加到总列表
        allTemplates.push(...templatesWithCount);
        // 添加到分组
        groups.push({
          imageCount: i,
          label: `${i}张`,
          templates: templatesWithCount,
          count: templatesWithCount.length,
        });
      }
    }

    console.log(`加载了 ${allTemplates.length} 个布局模板, ${groups.length} 个分组`);

    this.setData({
      allLayoutTemplates: allTemplates,
      layoutGroups: groups,
    });
  },
  // 使用首页传入的图片初始化
  initWithSelectedImages (paths) {
    const count = Math.min((paths || []).length, this.data.maxImages || 16);
    if (count <= 0) return;

    console.log('初始化图片，数量:', count);

    const selectedImages = paths.slice(0, count).map(p => ({ path: p }));

    // 根据数量获取推荐模板，并补充 imageCount 字段
    const templates = this.getAvailableLayouts(count) || [];
    const templatesWithCount = templates.map(t => ({
      ...t, imageCount: count,
    }));
    const inlineTemplates = this.attachInlinePreviews(templatesWithCount);
    let template = null;
    if (templatesWithCount.length > 0) {
      try {
        template = getRecommendedLayout(count, templatesWithCount) || templatesWithCount[0];
      } catch (e) {
        template = templatesWithCount[0];
      }
    }

    // 初始化槽位并填入图片
    const imageSlots = [];
    for (let i = 0; i < (template ? template.imageCount : count); i++) {
      if (i < selectedImages.length) {
        imageSlots.push({
          index: i, image: selectedImages[i],
          isEmpty: false,
        });
      } else {
        imageSlots.push({
          index: i, image: null, isEmpty: true,
        });
      }
    }

    // 设置数据并显示 Loading
    this.setData({
      selectedImages,
      imageSlots,
      currentLayoutTemplate: template,
      inlineTemplates: inlineTemplates,
      selectedImageCount: count,
      workflowStep: 'editing',
      isLoading: true,
      loadingText: '正在加载图片...',
    }, () => {
      console.log('数据已设置，开始等待Canvas就绪');

      // 传入照片时默认打开第一层抽屉（模版Tab）
      this.setData({
        activeTab: 'template'
      }, () => {
        this.expandDrawer('half');
      });

      // 真机兼容：等待Canvas初始化完成
      this.waitForCanvasReady().then(() => {
        console.log('Canvas已就绪，开始加载图片信息');
        return this.loadImagesInfo();
      }).then(() => {
        console.log('图片信息加载完成，开始绘制');
        if (this.data.selectedImages.length > 0) {
          this.updateCanvas();
        } else {
          this.drawPlaceholders();
        }
        // 隐藏 Loading
        this.setData({
          isLoading: false
        });
      }).catch((err) => {
        console.error('加载图片失败:', err);
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '图片加载失败',
          icon: 'none'
        });
      });
    });
  },

  // 等待Canvas就绪（真机兼容）
  waitForCanvasReady () {
    return new Promise((resolve, reject) => {
      // 如果已经就绪，直接返回
      if (this._ctx && this._canvas) {
        console.log('Canvas已经就绪');
        resolve();
        return;
      }

      console.log('等待Canvas初始化...');
      // 最多等待3秒
      let attempts = 0;
      const maxAttempts = 30; // 30次 * 100ms = 3秒

      const checkCanvas = () => {
        attempts++;
        if (this._ctx && this._canvas) {
          console.log(`Canvas就绪 (尝试${attempts}次)`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('Canvas初始化超时');
          reject(new Error('Canvas初始化超时'));
        } else {
          setTimeout(checkCanvas, 100);
        }
      };

      checkCanvas();
    });
  },

  // 绘制画布内容（统一入口）
  drawCanvasContent () {
    if (!this._ctx || !this._canvas) {
      console.warn('Canvas未初始化，无法绘制');
      return;
    }

    if (this.data.selectedImages.length > 0) {
      this.updateCanvas();
    } else {
      this.drawPlaceholders();
    }

    // 清除待绘制标记
    this._pendingDraw = false;

    // 隐藏加载提示
    wx.hideLoading();
  },


  // 初始化自定义导航栏
  initCustomNavigationBar () {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 0;

      // 获取胶囊按钮信息
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

      // 计算导航栏高度 = 胶囊按钮高度 + (胶囊按钮top - 状态栏高度) * 2
      const navigationBarHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;

      this.setData({
        statusBarHeight: statusBarHeight,
        navigationBarHeight: navigationBarHeight,
        menuButtonInfo: menuButtonInfo
      });

      // 设置 CSS 变量,用于页面布局
      const query = wx.createSelectorQuery().in(this);
      query.select('.container').node();
      query.exec((res) => {
        if (res && res[0]) {
          const containerNode = res[0].node;
          if (containerNode && containerNode.style) {
            containerNode.style.setProperty('--status-bar-height', `${statusBarHeight}px`);
            containerNode.style.setProperty('--navigation-bar-height', `${navigationBarHeight}px`);
          }
        }
      });

      console.log('自定义导航栏初始化:', {
        statusBarHeight,
        navigationBarHeight,
        menuButtonInfo
      });
    } catch (error) {
      console.error('初始化自定义导航栏失败:', error);
      // 使用默认值
      this.setData({
        statusBarHeight: 20,
        navigationBarHeight: 44,
        menuButtonInfo: null
      });
    }
  },

  // 返回按钮点击
  onNavBack () {
    wx.navigateBack({
      delta: 1
    });
  },

  // 初始化默认画布尺寸
  initDefaultCanvasSize () {
    try {
      const windowInfo = wx.getWindowInfo();
      const screenWidth = windowInfo.screenWidth || 375;

      // 预留边距
      const margin = 40;
      const maxCanvasWidth = screenWidth - margin;

      // 设置默认正方形画布
      const defaultSize = Math.min(maxCanvasWidth, 600);

      console.log('初始化画布尺寸:', defaultSize);

      this.setData({
        canvasWidth: defaultSize,
        canvasHeight: defaultSize,
      });
    } catch (error) {
      console.error('初始化画布尺寸失败:', error);
      // 使用默认值
      this.setData({
        canvasWidth: 600,
        canvasHeight: 600,
      });
    }
  },

  //
  // 生成模版预览方块（百分比）
  computeTemplatePreview (template) {
    try {
      const PRE_W = 52;
      const PRE_H = 52;
      const spacing = 2;
      const imageCount = template.imageCount || (template.rows && template.cols ? Math.min(template.rows * template.cols, 16) : (template.positions ? template.positions.length : 0));
      const positions = calculateLayout(template, PRE_W, PRE_H, spacing, imageCount) || [];
      return positions.map(pos => ({
        left: +(pos.x / PRE_W * 100).toFixed(1),
        top: +(pos.y / PRE_H * 100).toFixed(1),
        width: +(pos.width / PRE_W * 100).toFixed(1),
        height: +(pos.height / PRE_H * 100).toFixed(1),
      }));
    } catch (e) {
      console.warn('生成模版预览失败', e);
      return [];
    }
  },

  // 为一组模版附加预览方块
  attachInlinePreviews (templates) {
    return (templates || []).map(t => ({
      ...t,
      previewBlocks: this.computeTemplatePreview(t),
    }));
  },

  // 初始化画布
  initCanvas () {
    const that = this;
    console.log('开始初始化Canvas, canvasWidth:', that.data.canvasWidth, 'canvasHeight:', that.data.canvasHeight);

    // 使用 wx.createSelectorQuery 获取 canvas 节点
    wx.createSelectorQuery()
      .select('#canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('Canvas查询结果:', res);

        if (!res || !res[0]) {
          console.error('Canvas节点查询失败,res为空');
          return;
        }

        const canvasNode = res[0].node;
        if (!canvasNode) {
          console.error('Canvas节点不存在');
          return;
        }

        console.log('Canvas节点获取成功');

        // 获取设备像素比
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        console.log('设备像素比:', dpr);

        // 设置canvas实际绘制尺寸(考虑设备像素比)
        canvasNode.width = that.data.canvasWidth * dpr;
        canvasNode.height = that.data.canvasHeight * dpr;

        // 获取绘图上下文
        const ctx = canvasNode.getContext('2d');

        // 缩放绘图上下文以匹配设备像素比
        ctx.scale(dpr, dpr);

        console.log('Canvas设置完成:', {
          canvasWidth: canvasNode.width,
          canvasHeight: canvasNode.height,
          displayWidth: that.data.canvasWidth,
          displayHeight: that.data.canvasHeight,
          dpr: dpr,
        });

        // 保存canvas和ctx到组件属性(不能存入data,真机上会报错)
        that._canvas = canvasNode;
        that._ctx = ctx;
        console.log('Canvas对象已保存到组件属性');

        // 绘制初始背景
        ctx.fillStyle = that.data.backgroundColor;
        ctx.fillRect(0, 0, that.data.canvasWidth, that.data.canvasHeight);

        console.log('Canvas初始化完成');

        // 如果有待绘制的内容（从首页带入图片的情况），立即绘制
        if (that._pendingDraw) {
          console.log('检测到待绘制内容，开始绘制');
          that.drawCanvasContent();
        }
      });
  },

  // 选择图片
  // 一键上传图片 - 新流程
  selectImages () {
    const that = this;

    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    // 检查是否已选择布局
    if (!that.data.currentLayoutTemplate) {
      wx.showToast({
        title: '请先选择布局模板',
        icon: 'none',
      });
      return;
    }

    // 计算还能选择多少张图片
    const maxCount = that.data.currentLayoutTemplate.imageCount;
    const currentCount = that.data.selectedImages.length;
    const remainingCount = maxCount - currentCount;

    if (remainingCount <= 0) {
      wx.showToast({
        title: `当前布局最多${maxCount}张图片`,
        icon: 'none',
      });
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        wx.showLoading({
          title: '处理图片中...',
        });

        const tempFiles = res.tempFiles;
        const newImages = tempFiles.map(file => ({
          path: file.tempFilePath,
        }));

        // 填充到空槽位
        const updatedSlots = [...that.data.imageSlots];
        const updatedImages = [...that.data.selectedImages];

        let addedCount = 0;
        for (let i = 0; i < updatedSlots.length && addedCount < newImages.length; i++) {
          if (updatedSlots[i].isEmpty) {
            updatedSlots[i].image = newImages[addedCount];
            updatedSlots[i].isEmpty = false;
            updatedImages.push(newImages[addedCount]);
            addedCount++;
          }
        }

        console.log('一键上传: 添加了', addedCount, '张图片');

        that.setData({
          imageSlots: updatedSlots,
          selectedImages: updatedImages,
          workflowStep: 'editing',
        }, () => {
          // setData完成后重新绘制Canvas
          console.log('一键上传: setData完成,开始重绘Canvas');
          setTimeout(() => {
            that.updateCanvas();
            that.updateAvailableLayouts();
            wx.hideLoading();
          }, 100);
        });

        wx.showToast({
          title: `已添加${addedCount}张图片`,
          icon: 'success',
        });
      },
      fail: function () {
        wx.showToast({
          title: '选择图片失败',
          icon: 'error',
        });
      },
    });
  },

  // 获取可用布局 - 使用新的布局模板系统
  getAvailableLayouts (imageCount) {
    console.log('获取布局模板,图片数量:', imageCount);

    // 从布局模板文件获取
    const layouts = getLayoutTemplates(imageCount);

    if (layouts && layouts.length > 0) {
      console.log(`找到 ${layouts.length} 个布局模板`);
      return layouts;
    }

    // 如果没有找到,返回默认网格布局
    console.log('未找到布局模板,使用默认网格');
    const defaultRows = Math.ceil(Math.sqrt(imageCount));
    const defaultCols = Math.ceil(imageCount / defaultRows);

    return [{
      name: '自动网格',
      icon: '▦',
      type: 'grid',
      rows: defaultRows,
      cols: defaultCols,
    }];
  },

  // 更新可用布局
  updateAvailableLayouts () {
    const imageCount = this.data.selectedImages.length;
    if (imageCount > 0) {
      const layouts = this.getAvailableLayouts(imageCount);
      const layoutsWithCount = (layouts || []).map(t => ({
        ...t, imageCount,
      }));
      const inlineTemplates = this.attachInlinePreviews(layoutsWithCount);
      this.setData({
        availableLayouts: layouts,
        inlineTemplates: inlineTemplates,
        selectedImageCount: imageCount,
        selectedLayout: 0,
      });
    } else {
      this.setData({
        availableLayouts: [],
        inlineTemplates: [],
        selectedImageCount: 0,
        selectedLayout: 0,
      });
    }
  },
  // 按指定数量刷新内联模板（用于更换布局后，立刻让面板匹配新布局的张数）
  updateInlineTemplatesForCount (count) {
    const layouts = this.getAvailableLayouts(count) || [];
    const layoutsWithCount = layouts.map(t => ({
      ...t, imageCount: count,
    }));
    const inlineTemplates = this.attachInlinePreviews(layoutsWithCount);
    this.setData({
      availableLayouts: layouts,
      inlineTemplates,
      selectedImageCount: count,
      selectedLayout: 0,
    });
  },


  // 加载图片信息
  loadImagesInfo () {
    const that = this;
    const promises = this.data.selectedImages.map((image, index) => {
      return new Promise((resolve) => {
        wx.getImageInfo({
          src: image.path,
          success: (res) => {
            const updatedImages = [...that.data.selectedImages];
            updatedImages[index].width = res.width;
            updatedImages[index].height = res.height;
            that.setData({
              selectedImages: updatedImages,
            });
            resolve();
          },
          fail: () => {
            resolve(); // 即使失败也继续
          },
        });
      });
    });

    return Promise.all(promises);
  },

  // 移除图片
  removeImage (e) {
    const index = e.currentTarget.dataset.index;
    const selectedImages = this.data.selectedImages;
    selectedImages.splice(index, 1);
    this.setData({
      selectedImages: selectedImages,
    });
    this.updateAvailableLayouts();
    this.updateCanvas();
  },

  // 清除所有图片
  clearImages () {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    this.setData({
      selectedImages: [],
      availableLayouts: [],
      inlineTemplates: [],
      currentLayoutTemplate: null,
      selectedImageCount: 0,
      selectedLayout: 0,
    });
    this.clearCanvas();
  },

  // 选择布局
  onLayoutChange (e) {
    this.setData({
      selectedLayout: parseInt(e.detail.value),
    });
    this.updateCanvas();
  },

  // 随机排列图片
  randomLayout () {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    const selectedImages = [...this.data.selectedImages];
    for (let i = selectedImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedImages[i], selectedImages[j]] = [selectedImages[j], selectedImages[i]];
    }
    this.setData({
      selectedImages: selectedImages,
    });
    this.updateCanvas();
  },

  // 改变拼接方向
  onDirectionChange (e) {
    this.setData({
      direction: e.detail.value,
    });
    this.updateCanvas();
  },

  // 改变宽高比
  onAspectRatioChange (e) {
    const that = this;
    const ratioValue = e.currentTarget?.dataset?.ratio || e.detail?.value;

    // 如果是从dataset获取的值(点击事件)
    if (typeof ratioValue === 'string') {
      const ratio = this.data.aspectRatios.find(r => r.value === ratioValue);
      if (ratio) {
        console.log('切换画布比例:', ratio.label);

        // 第一步：设置新比例
        this.setData({
          aspectRatio: ratio.value,
        }, () => {
          // 第二步：计算并设置新的画布尺寸（带回调）
          that.calculateCanvasSizeWithCallback(ratio.width, ratio.height, () => {
            // 第三步：画布尺寸更新完成后，重新绘制
            console.log('画布尺寸已更新，开始重绘');

            if (that.data.currentLayoutTemplate) {
              // 检查是否有图片
              const hasImages = that.data.imageSlots && that.data.imageSlots.some(slot => !slot.isEmpty);

              if (hasImages) {
                // 有图片，重新绘制所有内容
                console.log('切换比例后重新绘制Canvas（有图片）');
                that.updateCanvas();
              } else {
                // 无图片，重新绘制占位框
                console.log('切换比例后重新绘制占位框');
                that.drawPlaceholders();
              }
            }
          });
        });

        wx.showToast({
          title: `已切换到 ${ratio.label}`,
          icon: 'success',
          duration: 1500,
        });
      }
    } else {
      // 如果是从picker获取的索引
      const ratio = this.data.aspectRatios[ratioValue];
      this.setData({
        aspectRatio: ratio.value,
      }, () => {
        that.calculateCanvasSizeWithCallback(ratio.width, ratio.height, () => {
          if (that.data.currentLayoutTemplate) {
            const hasImages = that.data.imageSlots && that.data.imageSlots.some(slot => !slot.isEmpty);
            if (hasImages) {
              that.updateCanvas();
            } else {
              that.drawPlaceholders();
            }
          }
        });
      });
    }
  },

  // 计算画布尺寸
  calculateCanvasSize (width, height) {
    // 获取屏幕信息
    const windowInfo = wx.getWindowInfo();
    const screenWidth = windowInfo.screenWidth;

    // 预留边距，确保画布不超出屏幕
    const margin = 40; // 左右各20px边距
    const maxCanvasWidth = screenWidth - margin;

    // 根据宽高比计算画布尺寸
    const aspectRatio = width / height;
    let canvasWidth, canvasHeight;

    if (aspectRatio >= 1) {
      // 横向或正方形，以宽度为准
      canvasWidth = Math.min(maxCanvasWidth, 750); // 最大不超过750px
      canvasHeight = canvasWidth / aspectRatio;
    } else {
      // 纵向，以高度为准，但要确保宽度不超出屏幕
      canvasHeight = maxCanvasWidth / aspectRatio;
      canvasWidth = maxCanvasWidth;

      // 如果高度过大，重新按高度限制计算
      const maxCanvasHeight = windowInfo.screenHeight * 0.6; // 最大高度为屏幕高度的60%
      if (canvasHeight > maxCanvasHeight) {
        canvasHeight = maxCanvasHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
    }

    const newCanvasWidth = Math.floor(canvasWidth);
    const newCanvasHeight = Math.floor(canvasHeight);

    console.log('计算新画布尺寸:', newCanvasWidth, 'x', newCanvasHeight);

    this.setData({
      canvasWidth: newCanvasWidth,
      canvasHeight: newCanvasHeight,
    });
  },

  // 计算画布尺寸（带回调）
  calculateCanvasSizeWithCallback (width, height, callback) {
    const that = this;

    // 获取屏幕信息
    const windowInfo = wx.getWindowInfo();
    const screenWidth = windowInfo.screenWidth;

    // 预留边距，确保画布不超出屏幕
    const margin = 40; // 左右各20px边距
    const maxCanvasWidth = screenWidth - margin;

    // 根据宽高比计算画布尺寸
    const aspectRatio = width / height;
    let canvasWidth, canvasHeight;

    if (aspectRatio >= 1) {
      // 横向或正方形，以宽度为准
      canvasWidth = Math.min(maxCanvasWidth, 750); // 最大不超过750px
      canvasHeight = canvasWidth / aspectRatio;
    } else {
      // 纵向，以高度为准，但要确保宽度不超出屏幕
      canvasHeight = maxCanvasWidth / aspectRatio;
      canvasWidth = maxCanvasWidth;

      // 如果高度过大，重新按高度限制计算
      const maxCanvasHeight = windowInfo.screenHeight * 0.6; // 最大高度为屏幕高度的60%
      if (canvasHeight > maxCanvasHeight) {
        canvasHeight = maxCanvasHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
    }

    const newCanvasWidth = Math.floor(canvasWidth);
    const newCanvasHeight = Math.floor(canvasHeight);

    console.log('计算新画布尺寸:', newCanvasWidth, 'x', newCanvasHeight);

    // 使用回调确保setData完成后再执行后续操作
    this.setData({
      canvasWidth: newCanvasWidth,
      canvasHeight: newCanvasHeight,
    }, () => {
      console.log('画布尺寸setData完成:', that.data.canvasWidth, 'x', that.data.canvasHeight);

      // 重新设置Canvas节点的实际绘制尺寸
      that.resizeCanvasNode(newCanvasWidth, newCanvasHeight, () => {
        console.log('Canvas节点尺寸已更新');
        if (callback && typeof callback === 'function') {
          callback();
        }
      });
    });
  },

  // 重新设置Canvas节点尺寸
  resizeCanvasNode (width, height, callback) {
    const canvas = this._canvas;

    if (!canvas) {
      console.error('Canvas节点不存在，无法调整尺寸');
      if (callback) callback();
      return;
    }

    // 获取设备像素比
    const dpr = wx.getWindowInfo().pixelRatio || 2;
    console.log('重新设置Canvas节点尺寸, dpr:', dpr, 'width:', width, 'height:', height);

    // 设置canvas实际绘制尺寸(考虑设备像素比)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // 获取绘图上下文并设置缩放
    const ctx = this._ctx;
    if (ctx) {
      ctx.scale(dpr, dpr);
      console.log('Canvas上下文已缩放');
    }

    if (callback) {
      callback();
    }
  },

  // 更新间距
  onSpacingChange (e) {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    this.setData({
      spacing: parseInt(e.detail.value),
    });
    this.updateCanvas();
  },

  // 更新圆角
  onCornerRadiusChange (e) {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    this.setData({
      cornerRadius: parseInt(e.detail.value),
    });
    this.updateCanvas();
  },

  // 更新背景颜色
  onBackgroundColorChange (e) {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    this.setData({
      backgroundColor: e.detail.value,
    });
    this.updateCanvas();
  },

  // 更新画布 - 新流程
  updateCanvas () {
    const ctx = this._ctx;
    const canvas = this._canvas;
    const { currentLayoutTemplate, imageSlots } = this.data;

    console.log('updateCanvas被调用');
    console.log('ctx存在:', !!ctx);
    console.log('canvas存在:', !!canvas);
    console.log('currentLayoutTemplate存在:', !!currentLayoutTemplate);
    console.log('imageSlots:', imageSlots);

    if (!currentLayoutTemplate) {
      console.log('布局未初始化');
      return;
    }

    // 如果canvas也不存在,说明需要重新初始化
    if (!ctx || !canvas) {
      console.error('Canvas未初始化,无法绘制');
      wx.showToast({
        title: 'Canvas未初始化,请重新进入页面',
        icon: 'none',
      });
      return;
    }

    // 检查是否有图片
    const hasImages = imageSlots && imageSlots.some(slot => !slot.isEmpty);
    console.log('hasImages:', hasImages);

    if (!hasImages) {
      // 没有图片,绘制占位框
      console.log('没有图片,绘制占位框');
      this.drawPlaceholders();
      return;
    }

    const {
      canvasWidth, canvasHeight, spacing, cornerRadius,
      backgroundColor,
    } = this.data;

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 设置背景
    ctx.fillStyle = backgroundColor;
    this.roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cornerRadius);
    ctx.fill();

    console.log('绘制图片, 布局:', currentLayoutTemplate.name);

    // 使用新的布局计算系统
    const imagePositions = calculateLayout(
      currentLayoutTemplate,
      canvasWidth,
      canvasHeight,
      spacing,
      currentLayoutTemplate.imageCount,
    );

    // 更新图片位置信息
    this.setData({
      imagePositions: imagePositions,
    });

    // 绘制每个槽位
    const drawPromises = imageSlots.map((slot, index) => {
      if (index >= imagePositions.length) {
        return Promise.resolve();
      }

      const pos = imagePositions[index];

      if (slot.isEmpty) {
        // 绘制占位框
        return new Promise((resolve) => {
          // 绘制边框
          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          ctx.setLineDash([]);

          // 绘制背景
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

          // 绘制+号
          const centerX = pos.x + pos.width / 2;
          const centerY = pos.y + pos.height / 2;
          const plusSize = Math.min(pos.width, pos.height) * 0.15;

          ctx.strokeStyle = '#999999';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(centerX - plusSize, centerY);
          ctx.lineTo(centerX + plusSize, centerY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(centerX, centerY - plusSize);
          ctx.lineTo(centerX, centerY + plusSize);
          ctx.stroke();

          resolve();
        });
      } else {
        // 绘制图片
        console.log(`绘制槽位${index}的图片:`, slot.image.path);
        return this.loadAndDrawImage(slot.image.path, pos.x, pos.y, pos.width, pos.height, index);
      }
    });

    // 等待所有图片绘制完成
    Promise.all(drawPromises).then(() => {
      console.log('所有图片绘制完成');

      // 添加水印
      if (this.data.enableWatermark && this.data.watermarkText) {
        this.addWatermark();
      }
      // 绘制编辑元素
      this.drawEditElements();

      // 强制刷新Canvas显示 - 使用requestAnimationFrame
      if (canvas) {
        // 触发Canvas重绘
        canvas.requestAnimationFrame(() => {
          console.log('Canvas重绘完成');
        });
      }

      // 拖拽优化：绘制完成后不需要额外缓存
    }).catch(err => {
      console.error('绘制图片失败:', err);
    });
  },

  // 重绘整个画布
  redrawCanvas () {
    this.updateCanvas();
  },

  // 绘制占位框 - 新流程
  drawPlaceholders () {
    const ctx = this._ctx;
    const canvas = this._canvas;
    const {
      canvasWidth, canvasHeight, spacing,
      currentLayoutTemplate,
    } = this.data;

    console.log('drawPlaceholders被调用');
    console.log('ctx存在:', !!ctx);
    console.log('canvas存在:', !!canvas);
    console.log('currentLayoutTemplate存在:', !!currentLayoutTemplate);

    if (!ctx || !currentLayoutTemplate) {
      console.error('Canvas或布局模板未初始化,无法绘制占位框');
      return;
    }

    console.log('绘制占位框, 布局:', currentLayoutTemplate.name);

    // 清空画布
    ctx.fillStyle = this.data.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 计算布局位置
    const positions = calculateLayout(
      currentLayoutTemplate,
      canvasWidth,
      canvasHeight,
      spacing,
      currentLayoutTemplate.imageCount,
    );

    // 保存位置信息
    this.setData({
      imagePositions: positions,
    });

    // 绘制每个占位框
    positions.forEach((pos, index) => {
      // 绘制边框
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);  // 虚线
      ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
      ctx.setLineDash([]);  // 恢复实线

      // 绘制背景
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

      // 绘制+号
      const centerX = pos.x + pos.width / 2;
      const centerY = pos.y + pos.height / 2;
      const plusSize = Math.min(pos.width, pos.height) * 0.2;

      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 3;

      // 横线
      ctx.beginPath();
      ctx.moveTo(centerX - plusSize, centerY);
      ctx.lineTo(centerX + plusSize, centerY);
      ctx.stroke();

      // 竖线
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - plusSize);
      ctx.lineTo(centerX, centerY + plusSize);
      ctx.stroke();

      // 绘制索引号
      ctx.fillStyle = '#999999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${index + 1}`, centerX, centerY + plusSize + 10);
    });

    console.log('占位框绘制完成');

    // 强制刷新Canvas显示
    if (canvas) {
      canvas.requestAnimationFrame(() => {
        console.log('占位框Canvas刷新完成');
      });
    }
  },


  // 绘制编辑元素
  drawEditElements () {
    const ctx = this._ctx;
    if (!ctx || this.data.editElements.length === 0) {
      return;
    }

    this.data.editElements.forEach(element => {
      switch (element.type) {
        case 'text':
          this.drawTextElement(ctx, element);
          break;
        case 'arrow':
          this.drawArrowElement(ctx, element);
          break;
        case 'rect':
          this.drawRectElement(ctx, element);
          break;
        case 'circle':
          this.drawCircleElement(ctx, element);
          break;
      }
    });
  },

  // 绘制文字元素
  drawTextElement (ctx, element) {
    ctx.save();
    ctx.font = `${element.size}px sans-serif`;
    ctx.fillStyle = element.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(element.text, element.x, element.y);
    ctx.restore();
  },

  // 绘制箭头元素
  drawArrowElement (ctx, element) {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.width;

    // 绘制箭头线
    ctx.beginPath();
    ctx.moveTo(element.startX, element.startY);
    ctx.lineTo(element.endX, element.endY);
    ctx.stroke();

    // 计算箭头头部
    const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
    const headlen = 15;

    // 绘制箭头头部
    ctx.beginPath();
    ctx.moveTo(element.endX, element.endY);
    ctx.lineTo(
      element.endX - headlen * Math.cos(angle - Math.PI / 6),
      element.endY - headlen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      element.endX - headlen * Math.cos(angle + Math.PI / 6),
      element.endY - headlen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  // 绘制矩形元素
  drawRectElement (ctx, element) {
    ctx.save();
    ctx.lineWidth = element.strokeWidth;
    ctx.strokeStyle = element.strokeColor;

    ctx.beginPath();
    ctx.rect(element.x, element.y, element.width, element.height);

    if (element.fillColor && element.fillColor !== 'transparent') {
      ctx.fillStyle = element.fillColor;
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  },

  // 绘制圆圈元素
  drawCircleElement (ctx, element) {
    ctx.save();
    ctx.lineWidth = element.strokeWidth;
    ctx.strokeStyle = element.strokeColor;

    ctx.beginPath();
    ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);

    if (element.fillColor && element.fillColor !== 'transparent') {
      ctx.fillStyle = element.fillColor;
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  },

  // 清空画布
  clearCanvas () {
    const ctx = this._ctx;
    if (ctx) {
      const {
        canvasWidth, canvasHeight, backgroundColor,
      } = this.data;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  },

  // 添加水印
  addWatermark () {
    const ctx = this._ctx;
    if (!ctx || !this.data.enableWatermark || !this.data.watermarkText) {
      return;
    }

    const {
      canvasWidth, canvasHeight, watermarkText,
      watermarkSize, watermarkOpacity, watermarkAngle,
      watermarkDensity,
    } = this.data;

    const spacing = watermarkDensity === 'dense' ? 100 : watermarkDensity === 'medium' ? 150 : 200;

    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    ctx.font = `${watermarkSize}px sans-serif`;
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let x = 0; x < canvasWidth + spacing; x += spacing) {
      for (let y = 0; y < canvasHeight + spacing; y += spacing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(watermarkAngle * Math.PI / 180);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  },

  // 加载并绘制图片
  loadAndDrawImage (imagePath, x, y, width, height, imageIndex) {
    const that = this;
    const ctx = this._ctx;
    const canvas = this._canvas;
    const {
      cornerRadius, imageScale, imageRotation,
    } = this.data;

    console.log('开始加载图片:', imagePath);

    return new Promise((resolve) => {
      if (!canvas) {
        console.error('Canvas对象不存在,无法加载图片');
        resolve();
        return;
      }

      // 创建图片对象
      const img = canvas.createImage();

      img.onload = () => {
        try {
          console.log('图片加载成功,开始绘制:', imagePath);

          // 保存当前状态
          ctx.save();

          // 获取该图片的缩放和旋转参数
          const scale = (imageIndex !== undefined && imageScale[imageIndex]) ? imageScale[imageIndex] : 1.0;
          const rotation = (imageIndex !== undefined && imageRotation[imageIndex]) ? imageRotation[imageIndex] : 0;

          // 先创建圆角裁剪路径（在变换之前），确保图片不会超出容器
          that.roundRect(ctx, x, y, width, height, cornerRadius);
          ctx.clip();

          // 计算中心点
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          // 应用旋转和缩放变换（在裁剪之后）
          if (rotation !== 0 || scale !== 1.0) {
            ctx.translate(centerX, centerY);
            if (rotation !== 0) {
              ctx.rotate(rotation * Math.PI / 180);
            }
            if (scale !== 1.0) {
              ctx.scale(scale, scale);
            }
            ctx.translate(-centerX, -centerY);
          }

          // 计算图片在容器中的显示尺寸和位置
          const imgRatio = img.width / img.height;
          const containerRatio = width / height;
          const fitMode = that.data.imageFitMode; // 'cover' 或 'contain'

          let drawWidth, drawHeight, drawX, drawY;

          if (fitMode === 'cover') {
            // cover模式: 填满容器,可能裁剪图片
            if (imgRatio > containerRatio) {
              // 图片比容器宽,以容器高度为准
              drawHeight = height;
              drawWidth = height * imgRatio;
              drawX = x + (width - drawWidth) / 2;
              drawY = y;
            } else {
              // 图片比容器窄,以容器宽度为准
              drawWidth = width;
              drawHeight = width / imgRatio;
              drawX = x;
              drawY = y + (height - drawHeight) / 2;
            }
          } else {
            // contain模式: 完全显示图片,可能有留白
            if (imgRatio > containerRatio) {
              // 图片比容器宽,以容器宽度为准
              drawWidth = width;
              drawHeight = width / imgRatio;
              drawX = x;
              drawY = y + (height - drawHeight) / 2;
            } else {
              // 图片比容器窄,以容器高度为准
              drawHeight = height;
              drawWidth = height * imgRatio;
              drawX = x + (width - drawWidth) / 2;
              drawY = y;
            }
          }

          // 绘制图片对象
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

          // 恢复状态
          ctx.restore();

          console.log('图片绘制完成, 模式:', fitMode, '缩放:', scale, '旋转:', rotation);
          resolve();
        } catch (error) {
          console.error('绘制图片失败:', error);
          resolve();
        }
      };

      img.onerror = (err) => {
        console.error('图片加载失败:', imagePath, err);
        resolve();
      };

      // 设置图片源
      img.src = imagePath;
    });
  },

  // 绘制圆角矩形
  roundRect (ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  // 导出图片
  exportImage () {
    const that = this;

    if (that.data.selectedImages.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({
      title: '正在导出图片...',
    });

    // 先申请相册权限
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => {
        // 权限获取成功，继续导出
        that.performCanvasExport();
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '需要授权',
          content: '保存图片到相册需要您的授权，请在设置中开启',
          showCancel: true,
          cancelText: '取消',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.writePhotosAlbum']) {
                    that.performCanvasExport();
                  }
                },
              });
            }
          },
        });
      },
    });
  },

  // 执行Canvas导出 - 使用图片合成方式
  performCanvasExport () {
    const that = this;

    // 重新绘制Canvas确保内容完整
    that.updateCanvas();

    setTimeout(() => {
      // 使用Canvas 2D API导出
      const canvas = that._canvas;
      const ctx = that._ctx;

      if (canvas && ctx) {
        // 确保Canvas有内容
        const imageData = ctx.getImageData(0, 0, that.data.canvasWidth, that.data.canvasHeight);
        if (imageData && imageData.data && imageData.data.length > 0) {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: function (res) {
              wx.hideLoading();
              console.log('Canvas导出成功:', res);
              // 保存到历史记录
              that.saveToHistory(res.tempFilePath);
              // 保存到相册
              that.saveToAlbum(res.tempFilePath);
            },
            fail: function (error) {
              console.error('Canvas 2D导出失败:', error);
              // 尝试使用图片合成方式
              that.exportWithImageComposition();
            },
          }, that);
        } else {
          console.error('Canvas内容为空');
          that.exportWithImageComposition();
        }
      } else {
        console.error('Canvas对象不存在');
        that.exportWithImageComposition();
      }
    }, 1000); // 增加延迟时间
  },

  // 使用图片合成方式导出
  exportWithImageComposition () {
    const that = this;

    wx.showToast({
      title: '使用图片合成方式导出',
      icon: 'loading',
      duration: 2000,
    });

    // 创建临时Canvas进行图片合成
    const query = wx.createSelectorQuery();
    query.select('#canvas').fields({
      node: true,
      size: true,
    }).exec((res) => {
      if (res[0]) {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 设置Canvas尺寸
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = that.data.canvasWidth * dpr;
        canvas.height = that.data.canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        // 绘制背景
        ctx.fillStyle = that.data.backgroundColor;
        ctx.fillRect(0, 0, that.data.canvasWidth, that.data.canvasHeight);

        // 绘制图片
        that.drawImagesToCanvas(ctx, canvas).then(() => {
          // 使用更简单的方式导出
          that.exportCanvasToFile(canvas);
        }).catch((error) => {
          wx.hideLoading();
          console.error('图片绘制失败:', error);
          wx.showToast({
            title: '导出失败，请重试',
            icon: 'error',
          });
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '导出失败，请重试',
          icon: 'error',
        });
      }
    });
  },

  // 导出Canvas到文件
  exportCanvasToFile (canvas) {
    const that = this;

    // 尝试多种导出方式
    const exportMethods = [
      // 方法1: 使用canvasToTempFilePath
      () => {
        return new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: resolve,
            fail: reject,
          }, that);
        });
      },
      // 方法2: 使用canvasId
      () => {
        return new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvasId: 'canvas',
            success: resolve,
            fail: reject,
          }, that);
        });
      },
      // 方法3: 使用简单的图片保存方式
      () => {
        return new Promise((resolve, reject) => {
          // 如果Canvas导出失败，尝试直接保存第一张图片作为示例
          if (that.data.selectedImages.length > 0) {
            const firstImage = that.data.selectedImages[0];
            const imagePath = typeof firstImage === 'string' ? firstImage : firstImage.path || firstImage.tempFilePath;

            // 直接保存第一张图片
            wx.saveImageToPhotosAlbum({
              filePath: imagePath,
              success: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '已保存第一张图片到相册',
                  icon: 'success',
                });
                resolve({ tempFilePath: imagePath });
              },
              fail: (error) => {
                console.error('保存图片失败:', error);
                reject(error);
              },
            });
          } else {
            reject(new Error('没有可保存的图片'));
          }
        });
      },
    ];

    // 依次尝试各种导出方法
    let methodIndex = 0;
    const tryNextMethod = () => {
      if (methodIndex >= exportMethods.length) {
        wx.hideLoading();
        wx.showToast({
          title: '所有导出方式都失败了',
          icon: 'error',
        });
        return;
      }

      exportMethods[methodIndex]()
        .then((res) => {
          wx.hideLoading();
          console.log('Canvas导出成功:', res);
          // 保存到历史记录
          that.saveToHistory(res.tempFilePath);
          // 保存到相册
          that.saveToAlbum(res.tempFilePath);
        })
        .catch((error) => {
          console.error(`导出方式${methodIndex + 1}失败:`, error);
          methodIndex++;
          tryNextMethod();
        });
    };

    tryNextMethod();
  },

  // 绘制图片到Canvas (用于导出)
  drawImagesToCanvas (ctx, canvas) {
    const that = this;
    const { currentLayoutTemplate, imageSlots } = that.data;

    return new Promise((resolve, reject) => {
      if (!currentLayoutTemplate) {
        reject(new Error('未找到布局配置'));
        return;
      }

      // 检查是否有图片
      const hasImages = imageSlots && imageSlots.some(slot => !slot.isEmpty);
      if (!hasImages) {
        console.log('导出: 没有图片');
        resolve();
        return;
      }

      console.log('导出: 使用布局', currentLayoutTemplate.name);

      // 使用新的布局计算系统
      const imagePositions = calculateLayout(
        currentLayoutTemplate,
        that.data.canvasWidth,
        that.data.canvasHeight,
        that.data.spacing,
        currentLayoutTemplate.imageCount,
      );

      // 使用Promise.all处理所有槽位
      const imagePromises = imageSlots.map((slot, index) => {
        return new Promise((resolveImg) => {
          // 跳过空槽位
          if (slot.isEmpty || !slot.image) {
            resolveImg();
            return;
          }

          if (index >= imagePositions.length) {
            console.warn(`导出: 图片 ${index} 超出布局范围`);
            resolveImg();
            return;
          }

          const pos = imagePositions[index];
          const image = slot.image;

          // 使用wx.getImageInfo获取图片信息
          wx.getImageInfo({
            src: typeof image === 'string' ? image : image.path || image.tempFilePath,
            success: (res) => {
              // 创建图片对象
              const img = canvas.createImage();
              img.onload = () => {
                // 获取该图片的缩放和旋转参数
                const scale = that.data.imageScale[index] || 1.0;
                const rotation = that.data.imageRotation[index] || 0;

                // 计算图片绘制尺寸，保持宽高比
                const imgAspect = img.width / img.height;
                const cellAspect = pos.width / pos.height;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect > cellAspect) {
                  // 图片更宽，以宽度为准
                  drawWidth = pos.width;
                  drawHeight = drawWidth / imgAspect;
                } else {
                  // 图片更高，以高度为准
                  drawHeight = pos.height;
                  drawWidth = drawHeight * imgAspect;
                }

                // 居中绘制
                drawX = pos.x + (pos.width - drawWidth) / 2;
                drawY = pos.y + (pos.height - drawHeight) / 2;

                // 保存状态
                ctx.save();

                // 先绘制圆角矩形裁剪路径（在变换之前），确保图片不会超出容器
                if (that.data.cornerRadius > 0) {
                  const radius = that.data.cornerRadius;
                  ctx.beginPath();
                  that.roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
                  ctx.clip();
                }

                // 应用旋转和缩放变换（在裁剪之后）
                if (rotation !== 0 || scale !== 1.0) {
                  const centerX = pos.x + pos.width / 2;
                  const centerY = pos.y + pos.height / 2;
                  ctx.translate(centerX, centerY);
                  if (rotation !== 0) {
                    ctx.rotate(rotation * Math.PI / 180);
                  }
                  if (scale !== 1.0) {
                    ctx.scale(scale, scale);
                  }
                  ctx.translate(-centerX, -centerY);
                }

                // 绘制图片
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

                // 恢复状态
                ctx.restore();

                resolveImg();
              };

              img.onerror = () => {
                console.error('导出: 图片加载失败:', image);
                resolveImg(); // 即使失败也继续
              };

              // 使用wx.getImageInfo返回的路径
              img.src = res.path;
            },
            fail: (error) => {
              console.error('导出: 获取图片信息失败:', error, image);
              resolveImg(); // 即使失败也继续
            },
          });
        });
      });

      // 等待所有图片加载完成
      Promise.all(imagePromises).then(() => {
        resolve();
      }).catch((error) => {
        console.error('图片绘制过程出错:', error);
        resolve(); // 即使出错也继续
      });
    });
  },

  // 保存到历史记录
  saveToHistory (imagePath) {
    try {
      const history = wx.getStorageSync('imageHistory') || [];
      const historyItem = {
        id: Date.now().toString(),
        type: 'collage',
        title: `布局拼图 ${this.data.selectedImages.length}张`,
        imagePath: imagePath,
        imageCount: this.data.selectedImages.length,
        timestamp: Date.now(),
        settings: {
          layout: this.data.selectedLayout,
          spacing: this.data.spacing,
          cornerRadius: this.data.cornerRadius,
          backgroundColor: this.data.backgroundColor,
        },
      };

      history.push(historyItem);

      // 只保留最近100条记录
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      wx.setStorageSync('imageHistory', history);
      console.log('已保存到历史记录');
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  // 切换水印功能
  onWatermarkToggle (e) {
    this.setData({
      enableWatermark: e.detail.value,
    });
    this.updateCanvas();
  },

  // 更新水印文字
  onWatermarkTextChange (e) {
    this.setData({
      watermarkText: e.detail.value,
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印字号
  onWatermarkSizeChange (e) {
    this.setData({
      watermarkSize: parseInt(e.detail.value),
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印透明度
  onWatermarkOpacityChange (e) {
    this.setData({
      watermarkOpacity: parseFloat(e.detail.value) / 100,
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新水印密度
  onWatermarkDensityChange (e) {
    const densities = ['sparse', 'medium', 'dense'];
    this.setData({
      watermarkDensity: densities[e.detail.value],
    });
    if (this.data.enableWatermark) {
      this.updateCanvas();
    }
  },

  // 更新导出质量
  onExportQualityChange (e) {
    const quality = this.data.exportFormats[e.detail.value];
    this.setData({
      exportQuality: quality.value,
    });
  },

  // 切换编辑模式
  toggleEditMode () {
    this.setData({
      editMode: !this.data.editMode,
      currentTool: '',
    });
  },

  // 选择编辑工具
  selectTool (e) {
    const tool = e.currentTarget.dataset.tool;
    this.setData({
      currentTool: this.data.currentTool === tool ? '' : tool,
      editMode: true,
    });

    if (tool === 'text') {
      this.showTextInput();
    }
  },

  // 显示文字输入框
  showTextInput () {
    const that = this;
    wx.showModal({
      title: '添加文字',
      placeholderText: '请输入文字内容',
      editable: true,
      success: function (res) {
        if (res.confirm && res.content) {
          that.setData({
            textInput: res.content,
          });
          wx.showToast({
            title: '点击画布添加文字',
            icon: 'none',
          });
        }
      },
    });
  },

  // 画布触摸开始
  onCanvasTouchStart (e) {
    const x = e.touches[0].x;
    const y = e.touches[0].y;

    // 编辑工具模式
    if (this.data.editMode && this.data.currentTool) {
      // 关闭工具条
      if (this.data.showImageToolbar) {
        this.hideImageToolbar();
      }

      this.setData({
        isDrawing: true,
        startPoint: { x, y },
      });

      if (this.data.currentTool === 'text' && this.data.textInput) {
        this.addTextElement(x, y);
      }
      return;
    }

    // 检查是否点击了已有图片（非空槽位）
    if (this.data.workflowStep === 'addImages' || this.data.workflowStep === 'editing') {
      const hitIndex = this.getHitImageIndex(x, y);

      if (hitIndex !== -1) {
        // 检查该槽位是否有图片
        const slot = this.data.imageSlots[hitIndex];

        if (slot && !slot.isEmpty) {
          // 如果点击的是同一张图片，关闭工具条
          if (this.data.showImageToolbar && this.data.toolbarImageIndex === hitIndex) {
            this.hideImageToolbar();
            return;
          }

          // 点击了有图片的槽位，显示工具条
          this.showImageToolbar(hitIndex, x, y);
          return;
        }
      }

      // 检查是否点击了空槽位
      const slotIndex = this.getHitSlotIndex(x, y);
      if (slotIndex !== -1) {
        const slot = this.data.imageSlots[slotIndex];
        if (slot && slot.isEmpty) {
          // 关闭工具条
          if (this.data.showImageToolbar) {
            this.hideImageToolbar();
          }
          // 触发槽位点击事件
          this.onSlotTap({ currentTarget: { dataset: { index: slotIndex } } });
          return;
        }
      }

      // 点击了空白区域，关闭工具条
      if (this.data.showImageToolbar) {
        this.hideImageToolbar();
      }
    }

    // 拖拽模式 - 检查是否点击了图片（保留原有拖拽功能）
    const hitIndex = this.getHitImageIndex(x, y);
    if (hitIndex !== -1) {
      this.setData({
        isDragging: true,
        dragIndex: hitIndex,
        dragStartPos: { x, y },
      });

      // 视觉反馈：高亮选中的图片
      this.highlightImage(hitIndex);
    }
  },

  // 画布触摸移动
  onCanvasTouchMove (e) {
    const x = e.touches[0].x;
    const y = e.touches[0].y;

    // 编辑工具模式
    if (this.data.isDrawing && this.data.editMode) {
      this.setData({
        endPoint: { x, y },
      });
      return;
    }

    // 拖拽模式
    if (this.data.isDragging && this.data.dragIndex !== -1) {
      const deltaX = x - this.data.dragStartPos.x;
      const deltaY = y - this.data.dragStartPos.y;

      // 计算拖拽距离
      const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const draggedImagePos = this.data.imagePositions[this.data.dragIndex];
      const threshold = draggedImagePos ? draggedImagePos.width / 2 : 50;

      // 检查当前位置是否有可交换的目标
      const targetIndex = this.getHitImageIndex(x, y);

      // 只有在拖拽距离超过阈值且有有效目标时才显示交换预览
      if (dragDistance > threshold && targetIndex !== -1 && targetIndex !== this.data.dragIndex) {
        // 避免重复显示相同的交换预览
        if (this.lastSwapPreview !== `${this.data.dragIndex}-${targetIndex}`) {
          this.showSwapPreview(this.data.dragIndex, targetIndex);
          this.lastSwapPreview = `${this.data.dragIndex}-${targetIndex}`;
        }
      } else {
        // 显示正常的拖拽效果
        this.redrawCanvasWithDrag(x, y);
        this.lastSwapPreview = null;
      }
    }
  },

  // 画布触摸结束
  onCanvasTouchEnd (e) {
    // 编辑工具模式
    if (this.data.isDrawing && this.data.editMode) {
      const {
        currentTool, startPoint, endPoint,
      } = this.data;

      if (currentTool === 'arrow') {
        this.addArrowElement(startPoint, endPoint);
      } else if (currentTool === 'rect') {
        this.addRectElement(startPoint, endPoint);
      } else if (currentTool === 'circle') {
        this.addCircleElement(startPoint, endPoint);
      }

      this.setData({
        isDrawing: false,
      });
      return;
    }

    // 拖拽模式结束
    if (this.data.isDragging) {
      const x = e.changedTouches[0].x;
      const y = e.changedTouches[0].y;

      // 计算拖拽距离
      const dragDistance = Math.sqrt(
        Math.pow(x - this.data.dragStartPos.x, 2) +
        Math.pow(y - this.data.dragStartPos.y, 2),
      );

      // 获取被拖拽图片的尺寸信息
      const draggedImagePos = this.data.imagePositions[this.data.dragIndex];
      const threshold = draggedImagePos ? draggedImagePos.width / 2 : 50; // 移动距离阈值

      // 只有当拖拽距离超过阈值时才进行位置交换
      if (dragDistance > threshold) {
        // 检查是否可以放置到新位置（交换位置）
        const targetIndex = this.getHitImageIndex(x, y);
        if (targetIndex !== -1 && targetIndex !== this.data.dragIndex) {
          this.swapImages(this.data.dragIndex, targetIndex);
          wx.showToast({
            title: '位置已交换',
            icon: 'success',
            duration: 1000,
          });
        } else {
          wx.showToast({
            title: '未找到交换目标',
            icon: 'none',
            duration: 1000,
          });
        }
      }

      // 清理拖拽相关的状态
      if (this.dragTimer) {
        clearTimeout(this.dragTimer);
        this.dragTimer = null;
      }
      this.lastSwapPreview = null;

      this.setData({
        isDragging: false,
        dragIndex: -1,
      });

      // 重新绘制最终布局
      this.updateCanvas();
    }
  },

  // 添加文字元素
  addTextElement (x, y) {
    const element = {
      type: 'text',
      x: x,
      y: y,
      text: this.data.textInput,
      color: this.data.textColor,
      size: this.data.textSize,
    };

    this.setData({
      editElements: [...this.data.editElements, element],
    });

    this.redrawCanvas();
  },

  // 添加箭头元素
  addArrowElement (startPoint, endPoint) {
    const element = {
      type: 'arrow',
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
      color: this.data.strokeColor,
      width: this.data.strokeWidth,
    };

    this.setData({
      editElements: [...this.data.editElements, element],
    });

    this.redrawCanvas();
  },

  // 添加矩形元素
  addRectElement (startPoint, endPoint) {
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);

    const element = {
      type: 'rect',
      x: x,
      y: y,
      width: width,
      height: height,
      strokeColor: this.data.strokeColor,
      strokeWidth: this.data.strokeWidth,
      fillColor: this.data.fillColor,
    };

    this.setData({
      editElements: [...this.data.editElements, element],
    });

    this.redrawCanvas();
  },

  // 添加圆圈元素
  addCircleElement (startPoint, endPoint) {
    const radius = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2),
    ) / 2;

    const element = {
      type: 'circle',
      x: startPoint.x,
      y: startPoint.y,
      radius: radius,
      strokeColor: this.data.strokeColor,
      strokeWidth: this.data.strokeWidth,
      fillColor: this.data.fillColor,
    };

    this.setData({
      editElements: [...this.data.editElements, element],
    });

    this.redrawCanvas();
  },

  // 清除编辑元素
  clearEditElements () {
    this.setData({
      editElements: [],
    });
    this.updateCanvas();
  },

  // 检测点击位置是否在某个图片上
  getHitImageIndex (x, y) {
    for (let i = 0; i < this.data.imagePositions.length; i++) {
      const pos = this.data.imagePositions[i];

      if (x >= pos.x && x <= pos.x + pos.width &&
        y >= pos.y && y <= pos.y + pos.height) {
        return i;
      }
    }
    return -1;
  },

  // 交换两个图片的位置
  swapImages (index1, index2) {
    const selectedImages = [...this.data.selectedImages];
    [selectedImages[index1], selectedImages[index2]] = [selectedImages[index2], selectedImages[index1]];

    this.setData({
      selectedImages: selectedImages,
    });
  },

  // 高亮显示选中的图片
  highlightImage (index) {
    const ctx = this._ctx;
    if (!ctx || !this.data.imagePositions[index]) return;

    const pos = this.data.imagePositions[index];

    // 绘制高亮边框
    ctx.save();
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(pos.x - 2, pos.y - 2, pos.width + 4, pos.height + 4);
    ctx.restore();
  },

  // 更新拖拽图片的位置
  updateDraggedImagePosition (index, deltaX, deltaY) {
    // 这里可以实现实时位置更新的逻辑
    // 暂时只是记录偏移，实际绘制在redrawCanvasWithDrag中处理
  },

  // 带拖拽效果的重绘
  redrawCanvasWithDrag (currentX, currentY) {
    // 简化拖拽绘制，避免复杂的缓存操作
    const ctx = this._ctx;
    if (!ctx || this.data.dragIndex === -1) return;

    // 节流处理，避免过于频繁的重绘
    if (this.dragTimer) return;

    this.dragTimer = setTimeout(() => {
      // 先重绘整个画布以清除之前的拖拽痕迹
      this.updateCanvas();

      // 然后在新位置绘制拖拽预览框
      setTimeout(() => {
        const pos = this.data.imagePositions[this.data.dragIndex];

        if (pos && ctx) {
          ctx.save();
          ctx.strokeStyle = '#007AFF';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.globalAlpha = 0.8;

          // 绘制拖拽预览框
          const scale = 0.9;
          const scaledWidth = pos.width * scale;
          const scaledHeight = pos.height * scale;

          ctx.strokeRect(
            currentX - scaledWidth / 2,
            currentY - scaledHeight / 2,
            scaledWidth,
            scaledHeight,
          );

          ctx.restore();
        }
      }, 10); // 短暂延迟，确保画布重绘完成

      this.dragTimer = null;
    }, 50); // 减少频率，避免过度重绘
  },


  // 显示交换预览
  showSwapPreview (dragIndex, targetIndex) {
    const ctx = this._ctx;
    if (!ctx || !this.data.imagePositions[dragIndex] || !this.data.imagePositions[targetIndex]) {
      return;
    }

    // 先重绘整个画布以清除之前的内容
    this.updateCanvas();

    // 然后显示交换预览边框
    setTimeout(() => {
      const pos1 = this.data.imagePositions[dragIndex];
      const pos2 = this.data.imagePositions[targetIndex];

      if (ctx && pos1 && pos2) {
        ctx.save();
        ctx.strokeStyle = '#FF3B30'; // 红色表示交换
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.9;

        ctx.strokeRect(pos1.x - 2, pos1.y - 2, pos1.width + 4, pos1.height + 4);
        ctx.strokeRect(pos2.x - 2, pos2.y - 2, pos2.width + 4, pos2.height + 4);

        ctx.restore();
      }
    }, 10); // 短暂延迟，确保画布重绘完成
  },


  // 绘制保持宽高比的图片
  drawImageWithAspectRatio (ctx, img, x, y, width, height) {
    const imgRatio = img.width / img.height;
    const containerRatio = width / height;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > containerRatio) {
      drawWidth = width;
      drawHeight = width / imgRatio;
      drawX = x;
      drawY = y + (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgRatio;
      drawX = x + (width - drawWidth) / 2;
      drawY = y;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  },

  // 保存到相册
  saveToAlbum (filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function () {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
        });
      },
      fail: function (error) {
        console.error('保存到相册失败:', error);
        wx.showToast({
          title: '保存失败，请检查权限',
          icon: 'error',
        });
      },
    });
  },

  // 缩略图点击
  onThumbnailTap (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedImageIndex: index,
    });

    // 可以添加高亮选中图片的逻辑
    this.highlightImage(index);
  },

  // 缩略图长按
  onThumbnailLongpress (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    wx.showActionSheet({
      itemList: ['换一张', '旋转', '删除'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.replaceImage({ currentTarget: { dataset: { index } } });
            break;
          case 1:
            this.rotateImage({ currentTarget: { dataset: { index } } });
            break;
          case 2:
            this.deleteImage({ currentTarget: { dataset: { index } } });
            break;
        }
      },
    });
  },

  // 检测点击位置是否在某个槽位内
  getHitSlotIndex (x, y) {
    const { imagePositions, imageSlots } = this.data;

    if (!imagePositions || imagePositions.length === 0) {
      return -1;
    }

    for (let i = 0; i < imagePositions.length; i++) {
      const pos = imagePositions[i];
      if (x >= pos.x && x <= pos.x + pos.width &&
        y >= pos.y && y <= pos.y + pos.height) {
        return i;
      }
    }

    return -1;
  },

  // 点击槽位添加图片
  onSlotTap (e) {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.imageSlots[index];

    if (!slot.isEmpty) {
      // 已有图片,可以替换
      wx.showModal({
        title: '提示',
        content: '是否替换这张图片?',
        success: (res) => {
          if (res.confirm) {
            this.selectImageForSlot(index);
          }
        },
      });
    } else {
      // 空槽位,直接添加
      this.selectImageForSlot(index);
    }
  },

  // 为指定槽位选择图片
  selectImageForSlot (slotIndex) {
    const that = this;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFile = res.tempFiles[0];
        const newImage = {
          path: tempFile.tempFilePath,
        };

        // 更新槽位
        const updatedSlots = [...that.data.imageSlots];
        const updatedImages = [...that.data.selectedImages];

        // 如果槽位已有图片,替换
        if (!updatedSlots[slotIndex].isEmpty) {
          const oldImageIndex = updatedImages.findIndex(img =>
            img.path === updatedSlots[slotIndex].image.path,
          );
          if (oldImageIndex !== -1) {
            updatedImages[oldImageIndex] = newImage;
          }
        } else {
          // 新增图片
          updatedImages.push(newImage);
        }

        updatedSlots[slotIndex].image = newImage;
        updatedSlots[slotIndex].isEmpty = false;

        console.log('更新槽位数据:', slotIndex, newImage.path);
        console.log('updatedSlots[slotIndex]:', updatedSlots[slotIndex]);
        console.log('所有槽位状态:', updatedSlots.map((s, i) => `槽位${i}: isEmpty=${s.isEmpty}`));

        that.setData({
          imageSlots: updatedSlots,
          selectedImages: updatedImages,
          workflowStep: 'editing',
        }, () => {
          // setData完成后重新绘制Canvas
          console.log('setData完成,开始重绘Canvas');
          console.log('当前imageSlots:', that.data.imageSlots);
          setTimeout(() => {
            that.updateCanvas();
            that.updateAvailableLayouts();
          }, 100);
        });

        wx.showToast({
          title: '图片已添加',
          icon: 'success',
        });
      },
    });
  },

  // 移除槽位中的图片
  onSlotRemove (e) {
    // 关闭工具条
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }

    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.imageSlots[index];

    if (slot.isEmpty) {
      return;
    }

    // 更新槽位
    const updatedSlots = [...this.data.imageSlots];
    const updatedImages = [...this.data.selectedImages];

    // 从selectedImages中移除
    const imageIndex = updatedImages.findIndex(img =>
      img.path === slot.image.path,
    );
    if (imageIndex !== -1) {
      updatedImages.splice(imageIndex, 1);
    }

    updatedSlots[index].image = null;
    updatedSlots[index].isEmpty = true;

    this.setData({
      imageSlots: updatedSlots,
      selectedImages: updatedImages,
    });

    // 重新绘制Canvas
    if (updatedImages.length > 0) {
      this.updateCanvas();
    } else {
      this.drawPlaceholders();
    }

    wx.showToast({
      title: '已移除',
      icon: 'success',
    });
  },

  // 更换布局 - 保留已有图片
  changeLayout () {
    // 直接返回布局选择页面,不清空图片
    this.setData({
      workflowStep: 'selectLayout',
    });
    console.log('返回布局选择页面,保留已有图片');
  },

  // 切换图片显示模式
  toggleImageFitMode () {
    const newMode = this.data.imageFitMode === 'cover' ? 'contain' : 'cover';
    const modeName = newMode === 'cover' ? '填满' : '完全显示';

    this.setData({
      imageFitMode: newMode,
    }, () => {
      // 重新绘制Canvas
      this.updateCanvas();

      wx.showToast({
        title: `图片显示: ${modeName}`,
        icon: 'success',
        duration: 1500,
      });
    });

    console.log('切换图片显示模式:', newMode);
  },

  // 切换图片数量分类
  onImageCountSelect (e) {
    const imageCount = parseInt(e.currentTarget.dataset.count);
    console.log('切换到分类:', imageCount);

    this.setData({
      selectedImageCount: imageCount,
    });
  },

  // 获取当前显示的布局模板
  getDisplayedTemplates () {
    const { selectedImageCount, layoutGroups } = this.data;

    if (selectedImageCount === 0) {
      // 显示全部
      return this.data.allLayoutTemplates;
    } else {
      // 显示指定数量的布局
      const group = layoutGroups.find(g => g.imageCount === selectedImageCount);
      return group ? group.templates : [];
    }
  },

  // 布局选择 - 新流程 (保留已有图片)
  onLayoutSelect (e) {
    const that = this;
    const index = parseInt(e.currentTarget.dataset.index);
    const templateData = e.currentTarget.dataset.template;
    console.log('选择布局模板:', index, templateData);

    // 获取当前显示的模板列表
    const displayedTemplates = this.getDisplayedTemplates();

    if (index >= 0 && index < displayedTemplates.length) {
      const template = displayedTemplates[index];
      console.log('选中的布局:', template.name, '图片数量:', template.imageCount);

      // 获取当前已有的图片
      const existingImages = [];
      if (this.data.imageSlots && this.data.imageSlots.length > 0) {
        this.data.imageSlots.forEach(slot => {
          if (!slot.isEmpty && slot.image) {
            existingImages.push(slot.image);
          }
        });
      }
      console.log('已有图片数量:', existingImages.length);

      // 初始化新布局的图片槽位,并迁移已有图片
      const imageSlots = [];
      const selectedImages = [];

      for (let i = 0; i < template.imageCount; i++) {
        if (i < existingImages.length) {
          // 迁移已有图片到新布局
          imageSlots.push({
            index: i,
            image: existingImages[i],
            isEmpty: false,
          });
          selectedImages.push(existingImages[i]);
          console.log('迁移图片到槽位', i, ':', existingImages[i].path);
        } else {
          // 空槽位
          imageSlots.push({
            index: i,
            image: null,
            isEmpty: true,
          });
        }
      }

      console.log('新布局槽位数:', template.imageCount, '已填充:', selectedImages.length);

      this.setData({
        selectedLayout: index,
        currentLayoutTemplate: template,
        imageSlots: imageSlots,
        selectedImages: selectedImages,
        workflowStep: 'addImages',  // 进入添加图片阶段
      }, () => {
        // 刚切换完布局：立刻按新布局的张数刷新下方内联模板
        that.updateInlineTemplatesForCount(template.imageCount);

        console.log('布局选择完成,准备绘制占位框');
        console.log('ctx存在:', !!that._ctx);
        console.log('canvas存在:', !!that._canvas);

        // 确保Canvas已初始化
        if (!that._ctx || !that._canvas) {
          console.log('Canvas未初始化,等待初始化完成');
          // 等待Canvas初始化
          setTimeout(() => {
            if (that._ctx && that._canvas) {
              that.drawPlaceholders();
            } else {
              console.error('Canvas初始化失败');
              wx.showToast({
                title: 'Canvas初始化失败,请重新进入',
                icon: 'none',
              });
            }
          }, 500);
        } else {
          // Canvas已初始化,检查是否有图片需要绘制
          if (selectedImages.length > 0) {
            // 有图片,直接更新Canvas
            that.updateCanvas();
          } else {
            // 无图片,绘制占位框
            that.drawPlaceholders();
            // 根据新选择的布局张数，刷新下方内联模板
            that.updateInlineTemplatesForCount(template.imageCount);

          }
        }
      });

      wx.showToast({
        title: `已选择: ${template.name}`,
        icon: 'success',
        duration: 1500,
      });
    }
  },

  // 关闭图片操作遮罩
  closeImageOverlay () {
    this.setData({
      selectedImageIndex: -1,
    });
  },

  // 替换图片
  replaceImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const selectedImages = [...this.data.selectedImages];
          selectedImages[index] = {
            path: res.tempFiles[0].tempFilePath,
            size: res.tempFiles[0].size,
          };

          this.setData({
            selectedImages: selectedImages,
            selectedImageIndex: -1,
          });

          this.loadImagesInfo(selectedImages).then(() => {
            this.updateCanvas();
          });

          wx.showToast({
            title: '图片已替换',
            icon: 'success',
          });
        }
      },
    });
  },

  // 旋转图片
  rotateImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    // 这里可以添加图片旋转逻辑
    // 由于小程序限制，实际旋转需要在canvas中实现
    wx.showToast({
      title: '旋转功能开发中',
      icon: 'none',
    });

    this.setData({
      selectedImageIndex: -1,
    });
  },

  // 删除图片

  // 编辑区内联模板选择
  onInlineTemplateSelect (e) {
    const that = this;
    const idx = parseInt(e.currentTarget.dataset.index);
    const list = this.data.inlineTemplates || [];
    if (isNaN(idx) || idx < 0 || idx >= list.length) return;

    const template = { ...list[idx] };
    if (!template.imageCount) {
      template.imageCount = this.data.selectedImages.length || 1;
    }

    // 收集已有图片
    const existingImages = [];
    if (this.data.imageSlots && this.data.imageSlots.length > 0) {
      this.data.imageSlots.forEach(slot => {
        if (!slot.isEmpty && slot.image) {
          existingImages.push(slot.image);
        }
      });
    }

    // 初始化槽位并迁移
    const imageSlots = [];
    const selectedImages = [];
    for (let i = 0; i < template.imageCount; i++) {
      if (i < existingImages.length) {
        imageSlots.push({
          index: i, image: existingImages[i],
          isEmpty: false,
        });
        selectedImages.push(existingImages[i]);
      } else {
        imageSlots.push({
          index: i, image: null, isEmpty: true,
        });
      }
    }

    this.setData({
      currentLayoutTemplate: template,
      imageSlots,
      selectedImages,
      workflowStep: 'editing',
    }, () => {
      if (!that._ctx || !that._canvas) {
        setTimeout(() => {
          if (that._ctx && that._canvas) {

            if (selectedImages.length > 0) {
              that.updateCanvas();
            } else {
              that.drawPlaceholders();
            }
          }

        }, 300);
      } else {
        if (selectedImages.length > 0) {
          // 切换模版后，刷新内联推荐列表
          that.updateAvailableLayouts();

          that.updateCanvas();
        } else {
          that.drawPlaceholders();
        }
      }
    });
  },

  deleteImage (e) {
    const index = parseInt(e.currentTarget.dataset.index);

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.removeImage({ currentTarget: { dataset: { index } } });
          this.setData({
            selectedImageIndex: -1,
          });
        }
      },
    });
  },

  // ========== 图片工具条相关方法 ==========

  // 显示图片工具条
  showImageToolbar (imageIndex, touchX, touchY) {
    const that = this;
    const { imagePositions } = this.data;

    if (!imagePositions || !imagePositions[imageIndex]) {
      return;
    }

    const pos = imagePositions[imageIndex];

    // 先显示工具条（位置暂时设为 0,0），然后获取实际尺寸再调整位置
    this.setData({
      showImageToolbar: true,
      toolbarImageIndex: imageIndex,
      toolbarPosition: { x: 0, y: 0 },
    }, () => {
      // 工具条显示后，获取其实际尺寸
      const query = wx.createSelectorQuery().in(that);
      query.select('#canvas-wrapper').boundingClientRect();
      query.select('.image-toolbar').boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        if (!res || !res[0] || !res[1]) {
          return;
        }

        const canvasRect = res[0];
        const toolbarRect = res[1];

        // 使用工具条的实际宽度和高度
        const toolbarWidth = toolbarRect.width || 280;
        const toolbarHeight = toolbarRect.height || 50;

        // 计算图片在canvas中的中心位置
        const imageCenterX = pos.x + pos.width / 2;

        // 图片在视口中的位置
        const imageTopInViewport = canvasRect.top + pos.y;
        const imageBottomInViewport = canvasRect.top + pos.y + pos.height;

        // 默认显示在图片上方
        let toolbarY = imageTopInViewport - toolbarHeight - 10;

        // 获取窗口信息
        const systemInfo = wx.getSystemInfoSync();
        const windowWidth = systemInfo.windowWidth;
        const windowHeight = systemInfo.windowHeight;

        // 计算工具条的 left 值（不使用 transform，直接计算左边距）
        // 工具条应该水平居中在图片上
        let toolbarLeft = canvasRect.left + imageCenterX - toolbarWidth / 2;

        // 左右边界检查 - 确保工具条不超出屏幕
        const margin = 10; // 边距

        if (toolbarLeft < margin) {
          toolbarLeft = margin;
        }

        if (toolbarLeft + toolbarWidth > windowWidth - margin) {
          toolbarLeft = windowWidth - toolbarWidth - margin;
        }

        // 上下边界检查
        if (toolbarY < margin) {
          // 上方空间不足，显示在图片下方
          toolbarY = imageBottomInViewport + margin;

          // 如果下方也超出屏幕，则显示在图片中央
          if (toolbarY + toolbarHeight > windowHeight - margin) {
            toolbarY = imageTopInViewport + (pos.height - toolbarHeight) / 2;
          }
        }

        // 最终边界检查 - 确保工具条完全在屏幕内
        if (toolbarY < margin) {
          toolbarY = margin;
        }
        if (toolbarY + toolbarHeight > windowHeight - margin) {
          toolbarY = windowHeight - toolbarHeight - margin;
        }

        // 更新工具条位置
        that.setData({
          toolbarPosition: { x: toolbarLeft, y: toolbarY },
        });
      });
    });
  },

  // 隐藏图片工具条
  hideImageToolbar () {
    this.setData({
      showImageToolbar: false,
      toolbarImageIndex: -1,
    });
  },

  // 阻止事件冒泡
  stopPropagation () {
    // 空方法，仅用于阻止事件冒泡
  },

  // 页面点击事件 - 关闭工具条
  onPageTap () {
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }
  },

  // 页面滚动事件 - 关闭工具条
  onPageScroll () {
    if (this.data.showImageToolbar) {
      this.hideImageToolbar();
    }
  },

  // 工具条 - 换一张
  onToolbarReplace () {
    const index = this.data.toolbarImageIndex;
    if (index === -1) return;

    console.log('换一张图片，索引:', index);
    this.hideImageToolbar();

    // 选择新图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          wx.showLoading({
            title: '处理中...',
            mask: true
          });

          const newImagePath = res.tempFiles[0].tempFilePath;

          // 获取图片信息
          wx.getImageInfo({
            src: newImagePath,
            success: (imgInfo) => {
              const imageSlots = this.data.imageSlots;
              const selectedImages = this.data.selectedImages;

              // 更新槽位
              imageSlots[index] = {
                isEmpty: false,
                image: {
                  path: newImagePath,
                  width: imgInfo.width,
                  height: imgInfo.height,
                },
              };

              // 更新选中图片列表
              selectedImages[index] = {
                path: newImagePath,
                width: imgInfo.width,
                height: imgInfo.height,
              };

              this.setData({
                imageSlots: imageSlots,
                selectedImages: selectedImages,
              });

              // 重新绘制画布
              this.updateCanvas();

              wx.hideLoading();
              wx.showToast({
                title: '图片已替换',
                icon: 'success',
              });
            },
            fail: (err) => {
              console.error('获取图片信息失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '处理失败',
                icon: 'none'
              });
            }
          });
        }
      },
    });
  },

  // 工具条 - 旋转
  onToolbarRotate () {
    const index = this.data.toolbarImageIndex;
    if (index === -1) return;

    console.log('旋转图片，索引:', index);

    // 获取当前旋转角度
    const imageRotation = this.data.imageRotation;
    const currentRotation = imageRotation[index] || 0;
    const newRotation = (currentRotation + 90) % 360;

    // 更新旋转角度
    imageRotation[index] = newRotation;

    this.setData({
      imageRotation: imageRotation,
    });

    // 重新绘制画布
    this.updateCanvas();

    wx.showToast({
      title: `旋转${newRotation}°`,
      icon: 'none',
    });
  },

  // 工具条 - 放大
  onToolbarZoomIn () {
    const index = this.data.toolbarImageIndex;
    if (index === -1) return;

    console.log('放大图片，索引:', index);

    // 获取当前缩放比例
    const imageScale = this.data.imageScale;
    const currentScale = imageScale[index] || 1.0;
    const newScale = Math.min(currentScale + 0.1, 2.0); // 最大2倍

    // 更新缩放比例
    imageScale[index] = newScale;

    this.setData({
      imageScale: imageScale,
    });

    // 重新绘制画布
    this.updateCanvas();

    wx.showToast({
      title: `${Math.round(newScale * 100)}%`,
      icon: 'none',
    });
  },

  // 工具条 - 缩小
  onToolbarZoomOut () {
    const index = this.data.toolbarImageIndex;
    if (index === -1) return;

    console.log('缩小图片，索引:', index);

    // 获取当前缩放比例
    const imageScale = this.data.imageScale;
    const currentScale = imageScale[index] || 1.0;
    const newScale = Math.max(currentScale - 0.1, 0.5); // 最小0.5倍

    // 更新缩放比例
    imageScale[index] = newScale;

    this.setData({
      imageScale: imageScale,
    });

    // 重新绘制画布
    this.updateCanvas();

    wx.showToast({
      title: `${Math.round(newScale * 100)}%`,
      icon: 'none',
    });
  },

  // 工具条 - 删除
  onToolbarDelete () {
    const index = this.data.toolbarImageIndex;
    if (index === -1) return;

    console.log('删除图片，索引:', index);
    this.hideImageToolbar();

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          // 清空该槽位
          const imageSlots = this.data.imageSlots;
          const selectedImages = this.data.selectedImages;

          imageSlots[index] = {
            isEmpty: true,
            image: null,
          };

          selectedImages[index] = null;

          // 清除该图片的缩放和旋转设置
          const imageScale = this.data.imageScale;
          const imageRotation = this.data.imageRotation;
          delete imageScale[index];
          delete imageRotation[index];

          this.setData({
            imageSlots: imageSlots,
            selectedImages: selectedImages,
            imageScale: imageScale,
            imageRotation: imageRotation,
          });

          // 重新绘制画布
          this.updateCanvas();

          wx.showToast({
            title: '已删除',
            icon: 'success',
          });
        }
      },
    });
  },

  // ==================== Tab 切换相关方法 ====================

  // Tab 切换
  onTabChange (e) {
    const tabId = e.currentTarget.dataset.tabId;
    console.log('切换到Tab:', tabId);

    const { drawerState } = this.data;

    // 如果抽屉是收起状态，点击Tab时展开到第一层
    if (drawerState === 'collapsed') {
      this.expandDrawer('half');
    }

    this.setData({
      currentTab: tabId
    });
  },

  // ==================== 抽屉相关方法 ====================

  // 展开抽屉
  expandDrawer (state) {
    const { windowHeight, statusBarHeight, navigationBarHeight } = this.data;
    let drawerHeight = 100; // 收起时高度从60改为100
    let showCollapseButton = false;

    console.log('========== 展开抽屉 ==========');
    console.log('目标状态:', state);
    console.log('窗口高度:', windowHeight);

    if (state === 'half') {
      // 第一层：300px，画布被压缩（视觉上分为两个区域）
      drawerHeight = 300;
      showCollapseButton = true;
    } else if (state === 'full') {
      // 第二层：80%屏幕高度，画布恢复100%，抽屉覆盖在画布上
      drawerHeight = windowHeight * 0.8;
      showCollapseButton = true;

      console.log('第二层抽屉高度:', drawerHeight);
    }

    console.log('抽屉高度将设置为:', drawerHeight);

    this.setData({
      drawerState: state,
      drawerHeight: drawerHeight,
      showCollapseButton: showCollapseButton
    }, () => {
      console.log('抽屉状态已更新，开始更新画布');
      // 抽屉高度变化后，重新计算画布尺寸
      this.updateCanvasSizeForDrawer();
    });
  },

  // 收起抽屉
  collapseDrawer () {
    this.setData({
      drawerState: 'collapsed',
      drawerHeight: 100, // 从60改为100
      showCollapseButton: false
    }, () => {
      this.updateCanvasSizeForDrawer();
    });
  },

  // 抽屉触摸开始
  onDrawerTouchStart (e) {
    const touch = e.touches[0];
    this.setData({
      drawerTouchStartY: touch.clientY,
      drawerTouchStartHeight: this.data.drawerHeight
    });
  },

  // 抽屉触摸移动
  onDrawerTouchMove (e) {
    const touch = e.touches[0];
    const { drawerTouchStartY, drawerTouchStartHeight, windowHeight, statusBarHeight, navigationBarHeight } = this.data;
    const deltaY = drawerTouchStartY - touch.clientY; // 向上为正
    const newHeight = drawerTouchStartHeight + deltaY;

    // 限制高度范围
    const minHeight = 100; // 最小高度从60改为100
    const maxHeight = windowHeight * 0.8; // 最大高度从70%改为80%
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // 判断当前应该是哪个状态
    let currentState = 'collapsed';
    if (clampedHeight >= windowHeight * 0.5) {
      currentState = 'full'; // 超过50%屏幕高度，进入第二层
    } else if (clampedHeight > 150) {
      currentState = 'half'; // 第一层
    }

    console.log('========== 拖动抽屉 ==========');
    console.log('窗口高度:', windowHeight);
    console.log('最大高度(80%):', maxHeight);
    console.log('原高度:', drawerTouchStartHeight, '→ 新高度:', newHeight, '→ 限制后:', clampedHeight);
    console.log('当前状态:', currentState);

    // 实时更新抽屉高度和状态
    this.setData({
      drawerHeight: clampedHeight,
      drawerState: currentState
    });

    // 使用节流优化画布更新性能
    if (this._updateCanvasTimer) {
      clearTimeout(this._updateCanvasTimer);
    }
    this._updateCanvasTimer = setTimeout(() => {
      console.log('节流触发，更新画布');
      this.updateCanvasSizeForDrawer();
    }, 50); // 50ms节流
  },

  // 抽屉触摸结束
  onDrawerTouchEnd (e) {
    const { drawerHeight, windowHeight } = this.data;
    const halfHeight = 300;
    const fullHeight = windowHeight * 0.8; // 从70%改为80%

    console.log('抽屉触摸结束，当前高度:', drawerHeight, '半展开:', halfHeight, '全展开:', fullHeight);

    // 根据当前高度判断应该停留在哪个状态
    let targetState = 'collapsed';

    if (drawerHeight < 150) {
      // 接近收起状态
      targetState = 'collapsed';
    } else if (drawerHeight < (halfHeight + fullHeight) / 2) {
      // 接近第一层
      targetState = 'half';
    } else {
      // 接近第二层
      targetState = 'full';
    }

    console.log('目标状态:', targetState);
    this.expandDrawer(targetState);
  },

  // ==================== 内容区域智能拖动 ====================

  // 内容区域滚动到顶部
  onContentScrollToUpper (e) {
    console.log('内容区域滚动到顶部');
    this._isContentAtTop = true;
  },

  // 内容区域触摸开始
  onContentTouchStart (e) {
    const touch = e.touches[0];
    this._contentTouchStartY = touch.clientY;

    // 检查当前滚动位置
    // 注意：scroll-view的scrollTop需要通过事件获取
    console.log('内容区域触摸开始, Y:', touch.clientY);
  },

  // 内容区域触摸移动
  onContentTouchMove (e) {
    const touch = e.touches[0];
    const deltaY = this._contentTouchStartY - touch.clientY; // 向上为正

    console.log('内容区域触摸移动, deltaY:', deltaY, '是否在顶部:', this._isContentAtTop);

    // 如果内容在顶部，且向上滑动，则触发抽屉展开
    if (this._isContentAtTop && deltaY > 10) {
      console.log('内容在顶部且向上滑动，触发抽屉拖动');

      // 模拟抽屉拖动
      const { drawerHeight, drawerTouchStartHeight, windowHeight } = this.data;
      const newHeight = drawerHeight + deltaY * 0.5; // 减缓拖动速度

      // 限制高度范围
      const minHeight = 100; // 从60改为100
      const maxHeight = windowHeight * 0.8; // 从70%改为80%

      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      // 判断当前应该是哪个状态
      let currentState = 'collapsed';
      if (clampedHeight >= windowHeight * 0.5) {
        currentState = 'full';
      } else if (clampedHeight > 150) {
        currentState = 'half';
      }

      console.log('调整抽屉高度:', clampedHeight, '状态:', currentState);

      // 实时更新抽屉高度和状态
      this.setData({
        drawerHeight: clampedHeight,
        drawerState: currentState
      });

      // 使用节流优化画布更新性能
      if (this._updateCanvasTimer) {
        clearTimeout(this._updateCanvasTimer);
      }
      this._updateCanvasTimer = setTimeout(() => {
        console.log('节流触发，更新画布');
        this.updateCanvasSizeForDrawer();
      }, 50); // 50ms节流

      // 更新起始位置，避免跳跃
      this._contentTouchStartY = touch.clientY;
    } else {
      // 内容不在顶部，或向下滑动，标记不在顶部
      if (deltaY < 0) {
        this._isContentAtTop = false;
      }
    }
  },

  // 内容区域触摸结束
  onContentTouchEnd (e) {
    console.log('内容区域触摸结束');

    // 如果抽屉高度发生了变化，需要吸附到最近的状态
    const { drawerHeight, windowHeight } = this.data;
    const halfHeight = 300;
    const fullHeight = windowHeight * 0.8; // 从70%改为80%

    // 如果高度接近半展开或全展开，则吸附
    if (drawerHeight > 150) {
      let targetState = 'half';

      if (drawerHeight > (halfHeight + fullHeight) / 2) {
        targetState = 'full';
      }

      console.log('内容区域拖动结束，吸附到:', targetState);
      this.expandDrawer(targetState);
    }
  },

  // 根据抽屉状态更新画布尺寸
  updateCanvasSizeForDrawer () {
    const that = this;
    const { drawerHeight, drawerState, aspectRatio, aspectRatios, statusBarHeight, navigationBarHeight } = this.data;

    console.log('========== 开始更新画布尺寸 ==========');
    console.log('当前抽屉状态:', drawerState);
    console.log('当前抽屉高度:', drawerHeight);
    console.log('当前画布比例:', aspectRatio);

    // 获取屏幕信息
    const windowInfo = wx.getWindowInfo();
    const screenWidth = windowInfo.screenWidth;
    const screenHeight = windowInfo.screenHeight;

    console.log('屏幕尺寸:', screenWidth, 'x', screenHeight);
    console.log('状态栏高度:', statusBarHeight, '导航栏高度:', navigationBarHeight);

    const topBarHeight = statusBarHeight + navigationBarHeight;
    const verticalMargin = 32; // 上下边距
    let availableHeight;

    // 根据抽屉状态决定画布高度
    if (drawerState === 'full') {
      // 第二层：画布恢复100%高度，抽屉覆盖在画布上
      availableHeight = screenHeight - topBarHeight - verticalMargin;
      console.log('第二层：画布100%高度 =', availableHeight);
    } else {
      // 收起/第一层：画布被压缩，抽屉在底部
      availableHeight = screenHeight - topBarHeight - drawerHeight - verticalMargin;
      console.log('收起/第一层：画布被压缩 =', availableHeight, '(屏幕', screenHeight, '- 顶部栏', topBarHeight, '- 抽屉', drawerHeight, '- 边距', verticalMargin, ')');
    }

    // 计算画布可用宽度
    const horizontalMargin = 40; // 左右边距
    const availableWidth = screenWidth - horizontalMargin;

    console.log('可用空间:', availableWidth, 'x', availableHeight);

    // 获取当前选择的画布比例
    const currentRatio = aspectRatios.find(r => r.value === aspectRatio);
    if (!currentRatio) {
      console.error('未找到当前画布比例，aspectRatio:', aspectRatio);
      console.error('可用的比例列表:', aspectRatios.map(r => r.value));
      // 使用默认比例 1:1
      const defaultRatio = aspectRatios.find(r => r.value === '1:1');
      if (!defaultRatio) {
        console.error('连默认比例都找不到，放弃更新');
        return;
      }
      console.log('使用默认比例 1:1');
      this.setData({ aspectRatio: '1:1' });
      // 递归调用，使用默认比例
      setTimeout(() => {
        this.updateCanvasSizeForDrawer();
      }, 0);
      return;
    }

    const ratioWidth = currentRatio.width;
    const ratioHeight = currentRatio.height;
    const ratioAspect = ratioWidth / ratioHeight;

    console.log('画布比例:', ratioWidth, ':', ratioHeight, '=', ratioAspect);

    // 根据比例和可用空间计算画布尺寸
    let canvasWidth, canvasHeight;

    if (ratioAspect >= 1) {
      // 横向或正方形，优先以宽度为准
      canvasWidth = Math.min(availableWidth, 750); // 最大不超过750px
      canvasHeight = canvasWidth / ratioAspect;

      // 如果高度超出可用空间，则以高度为准重新计算
      if (canvasHeight > availableHeight) {
        console.log('高度超出，以高度为准重新计算');
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * ratioAspect;
      }
    } else {
      // 纵向，优先以高度为准
      canvasHeight = Math.min(availableHeight, availableWidth / ratioAspect);
      canvasWidth = canvasHeight * ratioAspect;

      // 如果宽度超出可用空间，则以宽度为准重新计算
      if (canvasWidth > availableWidth) {
        console.log('宽度超出，以宽度为准重新计算');
        canvasWidth = availableWidth;
        canvasHeight = canvasWidth / ratioAspect;
      }
    }

    const newCanvasWidth = Math.floor(canvasWidth);
    const newCanvasHeight = Math.floor(canvasHeight);

    console.log('计算出的新画布尺寸:', newCanvasWidth, 'x', newCanvasHeight);
    console.log('========== 更新画布尺寸完成 ==========');

    // 更新画布尺寸
    this.setData({
      canvasWidth: newCanvasWidth,
      canvasHeight: newCanvasHeight,
    }, () => {
      console.log('画布尺寸已更新到data');
      // 画布尺寸更新后，重新绘制内容
      if (that._ctx && that._canvas) {
        // 重新设置Canvas节点的实际绘制尺寸
        if (that._canvas) {
          that._canvas.width = newCanvasWidth;
          that._canvas.height = newCanvasHeight;
          console.log('Canvas节点尺寸已更新');
        }

        // 检查是否有图片需要绘制
        const hasImages = that.data.imageSlots && that.data.imageSlots.some(slot => !slot.isEmpty);

        if (hasImages) {
          // 有图片，重新绘制所有内容
          console.log('抽屉调整后重新绘制Canvas（有图片）');
          that.updateCanvas();
        } else if (that.data.currentLayoutTemplate) {
          // 无图片但有布局，重新绘制占位框
          console.log('抽屉调整后重新绘制占位框');
          that.drawPlaceholders();
        }
      } else {
        console.warn('Canvas未初始化，跳过重绘');
      }
    });
  },
});
