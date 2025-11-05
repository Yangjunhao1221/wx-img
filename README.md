# 图片拼接工具 - 微信小程序

一个功能完整的图片拼接工具微信小程序，支持布局拼图和长图拼接功能。

## 功能特性

### 🎯 布局拼图
- **多种网格布局**: 自动计算最佳网格布局
- **灵活拼接方向**: 支持横向/竖向拼接
- **图片管理**: 图片选择、删除、随机排列
- **实时预览**: 实时显示拼接效果

### 📏 画布设置
- **多种比例预设**: 1:1, 16:9, 9:16, 16:10, 4:3, 3:4
- **自定义比例**: 支持自定义宽高比
- **样式调整**: 边框、间距、圆角设置
- **背景自定义**: 背景颜色和背景图片

### 🖼️ 长图拼接
- **智能拼接**: 自动计算最佳拼接尺寸
- **顺序调整**: 支持图片顺序上下调整
- **多种方向**: 支持垂直和水平拼接
- **实时预览**: 实时显示长图效果

### 🎨 高级功能
- **水印功能**: 文字水印、透明度、旋转角度
- **水印密度**: 稀疏、中等、密集三种模式
- **导出选项**: 高清JPG、标准JPG、无损PNG
- **一键保存**: 直接保存到手机相册

## 技术实现

### 🏗️ 架构设计
- **Canvas渲染**: 使用Canvas 2D API进行高性能图片渲染
- **工具类封装**: ImageUtils和CanvasUtils工具类
- **响应式布局**: 适配不同屏幕尺寸
- **模块化开发**: 功能模块化，便于维护扩展

### 📱 页面结构
```
pages/
├── index/          # 入口页面
├── collage/        # 布局拼图页面
└── longimage/      # 长图拼接页面

utils/
├── imageUtils.js   # 图片处理工具
└── canvasUtils.js  # Canvas绘制工具
```

## 使用指南

### 布局拼图
1. 点击"选择图片"选择要拼接的图片（最多9张）
2. 选择拼接方向（横向/竖向）
3. 调整画布比例和样式设置
4. 可选择启用水印功能
5. 点击"下载图片"保存到相册

### 长图拼接
1. 点击"选择图片"选择要拼接的图片（最多20张）
2. 选择拼接方向（竖向/横向）
3. 调整间距、圆角等样式
4. 可调整图片顺序（上移/下移）
5. 点击"下载长图"保存到相册

## 开发部署

### 环境要求
- 微信开发者工具
- 小程序开发资质

### 快速开始
1. 下载项目代码
2. 使用微信开发者工具导入项目
3. 配置小程序AppID
4. 预览或发布

### 配置说明
- `app.json`: 小程序配置文件
- `project.config.json`: 项目配置文件
- 需要申请相册写入权限：`scope.writePhotosAlbum`

## 核心功能实现

### Canvas渲染引擎
```javascript
// 初始化Canvas
initCanvas() {
  const query = wx.createSelectorQuery();
  query.select('#canvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
    });
}
```

### 图片处理流程
```javascript
// 图片加载和绘制
loadAndDrawImage(imagePath, x, y, width, height) {
  wx.getImageInfo({
    src: imagePath,
    success: (res) => {
      ctx.save();
      this.roundRect(ctx, x, y, width, height, cornerRadius);
      ctx.clip();
      ctx.drawImage(imagePath, x, y, width, height);
      ctx.restore();
    }
  });
}
```

## 性能优化

- **图片懒加载**: 按需加载图片资源
- **Canvas缓存**: 避免重复渲染
- **内存管理**: 及时释放图片资源
- **响应式设计**: 适配不同设备性能

## 浏览器兼容

- ✅ 微信小程序基础库 2.19.4+
- ✅ Canvas 2D API支持
- ✅ 图片处理API支持

## 更新日志

### v1.0.0 (2025-09-30)
- ✨ 完整的布局拼图功能
- ✨ 长图拼接功能
- ✨ 画布设置和样式调整
- ✨ 水印功能
- ✨ 多格式导出
- ✨ 响应式界面设计

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进这个项目！

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过Issue联系。
