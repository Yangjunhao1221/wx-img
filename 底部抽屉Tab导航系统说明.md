# 底部抽屉Tab导航系统说明

## 📋 功能概述

在拼图编辑页面实现了一个**底部抽屉式Tab导航系统**，采用苹果官网的简约设计风格，提供流畅的交互体验。

---

## 🎯 核心功能

### 1. 五个Tab标签

| Tab ID | 名称 | 功能说明 | 状态 |
|--------|------|----------|------|
| `poster` | 海报 | 海报模版选择（待接入数据） | 占位 |
| `template` | 模版 | 画布比例选择 + 推荐布局 | ✅ 已实现 |
| `splice` | 拼接 | 拼接模式（待接入数据） | 占位 |
| `free` | 自由 | 自由模式（待接入数据） | 占位 |
| `settings` | 设置 | 样式设置（间距、圆角、背景色等） | ✅ 已实现 |

### 2. 三层抽屉状态

| 状态 | 高度 | 说明 | 触发方式 |
|------|------|------|----------|
| **收起** (collapsed) | 60px | 只显示Tab标签栏 | 点击收起按钮 / 向下拖动 |
| **半展开** (half) | 300px | 显示主要内容 | 点击Tab / 向上拖动 |
| **全展开** (full) | 70%屏幕高度 | 显示完整内容 | 向上拖动到顶部 |

### 3. 触摸手势控制

- **点击Tab**：如果抽屉是收起状态，自动展开到半展开状态
- **拖动抽屉头部**：可以自由调整抽屉高度
- **松手自动吸附**：
  - 高度 < 150px → 自动收起
  - 150px ≤ 高度 < (半展开+全展开)/2 → 吸附到半展开
  - 高度 ≥ (半展开+全展开)/2 → 吸附到全展开

### 4. 画布自适应

抽屉高度变化时，画布会自动调整尺寸以适应可用空间：

- **计算可用高度**：屏幕高度 - 状态栏 - 导航栏 - 抽屉高度 - 边距
- **计算可用宽度**：屏幕宽度 - 左右边距
- **保持画布比例**：根据选择的画布比例（1:1、16:9等）自动计算最佳尺寸
- **自动重绘**：尺寸调整后自动重绘画布内容

### 5. 悬浮按钮动态定位

悬浮添加图片按钮（FAB）的位置会根据抽屉高度自动调整：

- **位置计算**：`bottom = drawerHeight + 20px`
- **始终可见**：无论抽屉处于何种状态，按钮都不会被遮挡
- **平滑过渡**：使用CSS transition实现位置变化的平滑动画

---

## 🎨 设计风格

### 苹果简约风格

参考苹果官网的设计语言：

- **配色方案**：
  - 主色：`#0071e3` (苹果蓝)
  - 文字主色：`#1d1d1f` (深灰)
  - 文字次色：`#86868b` (浅灰)
  - 背景色：`#fbfbfd` (浅白)
  - 边框色：`#d2d2d7` (浅灰)

- **字体设计**：
  - 字号：13px (小号文字)
  - 字重：400 (常规) / 500 (中等) / 600 (加粗)
  - 字间距：-0.08px (紧凑)

- **圆角和阴影**：
  - 按钮圆角：18px (胶囊形状)
  - 卡片圆角：12px
  - 无明显阴影，使用细边框

- **动画效果**：
  - 过渡时间：0.2s - 0.3s
  - 缓动函数：ease
  - 点击缩放：scale(0.95)

---

## 📁 文件修改

### 1. `pages/collage/collage.js`

#### 数据字段 (Line 16-34)

```javascript
// Tab 相关
currentTab: 'template',  // 当前选中的Tab
tabs: [
  { id: 'poster', name: '海报' },
  { id: 'template', name: '模版' },
  { id: 'splice', name: '拼接' },
  { id: 'free', name: '自由' },
  { id: 'settings', name: '设置' }
],

// 抽屉状态管理
drawerState: 'collapsed',  // 'collapsed' | 'half' | 'full'
drawerHeight: 60,  // 当前抽屉高度
windowHeight: 0,   // 屏幕高度
showCollapseButton: false,  // 是否显示收起按钮

// 抽屉触摸相关
drawerTouchStartY: 0,
drawerTouchStartHeight: 0,
```

#### 核心方法

**Tab切换** (Line 3350-3365)
```javascript
onTabChange(e) {
  const tabId = e.currentTarget.dataset.tabId;
  const { drawerState } = this.data;
  
  // 如果抽屉是收起状态，点击Tab时展开到第一层
  if (drawerState === 'collapsed') {
    this.expandDrawer('half');
  }
  
  this.setData({ currentTab: tabId });
}
```

**展开抽屉** (Line 3369-3391)
```javascript
expandDrawer(state) {
  const { windowHeight } = this.data;
  let drawerHeight = 60;
  let showCollapseButton = false;
  
  if (state === 'half') {
    drawerHeight = 300;
    showCollapseButton = true;
  } else if (state === 'full') {
    drawerHeight = windowHeight * 0.7;
    showCollapseButton = true;
  }
  
  this.setData({
    drawerState: state,
    drawerHeight: drawerHeight,
    showCollapseButton: showCollapseButton
  }, () => {
    this.updateCanvasSizeForDrawer();
  });
}
```

**收起抽屉** (Line 3393-3402)
```javascript
collapseDrawer() {
  this.setData({
    drawerState: 'collapsed',
    drawerHeight: 60,
    showCollapseButton: false
  }, () => {
    this.updateCanvasSizeForDrawer();
  });
}
```

**触摸手势** (Line 3404-3451)
```javascript
// 触摸开始
onDrawerTouchStart(e) {
  const touch = e.touches[0];
  this.setData({
    drawerTouchStartY: touch.clientY,
    drawerTouchStartHeight: this.data.drawerHeight
  });
}

// 触摸移动
onDrawerTouchMove(e) {
  const touch = e.touches[0];
  const { drawerTouchStartY, drawerTouchStartHeight, windowHeight } = this.data;
  const deltaY = drawerTouchStartY - touch.clientY; // 向上为正
  const newHeight = drawerTouchStartHeight + deltaY;
  
  // 限制高度范围
  const minHeight = 60;
  const maxHeight = windowHeight * 0.7;
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
  
  this.setData({ drawerHeight: clampedHeight });
}

// 触摸结束 - 自动吸附
onDrawerTouchEnd(e) {
  const { drawerHeight, windowHeight } = this.data;
  const halfHeight = 300;
  const fullHeight = windowHeight * 0.7;
  
  let targetState = 'collapsed';
  
  if (drawerHeight < 150) {
    targetState = 'collapsed';
  } else if (drawerHeight < (halfHeight + fullHeight) / 2) {
    targetState = 'half';
  } else {
    targetState = 'full';
  }
  
  this.expandDrawer(targetState);
}
```

**画布自适应** (Line 3453-3544)
```javascript
updateCanvasSizeForDrawer() {
  // 计算可用空间
  const availableHeight = screenHeight - topBarHeight - drawerHeight - verticalMargin;
  const availableWidth = screenWidth - horizontalMargin;
  
  // 根据画布比例和可用空间计算最佳尺寸
  // 保持画布比例不变，自动适应可用空间
  
  // 更新画布尺寸并重绘
}
```

### 2. `pages/collage/collage.wxml`

#### 底部抽屉结构 (Line 129-254)

```xml
<!-- 底部抽屉区域 - 动态高度 -->
<view class="bottom-drawer-area" style="height: {{drawerHeight}}px;">
  <!-- 抽屉头部：Tab导航栏 + 收起按钮 -->
  <view class="drawer-header"
        bindtouchstart="onDrawerTouchStart"
        bindtouchmove="onDrawerTouchMove"
        bindtouchend="onDrawerTouchEnd">
    <!-- Tab 导航栏 -->
    <view class="tab-bar-minimal">
      <view wx:for="{{tabs}}" wx:key="id"
            class="tab-item-minimal {{currentTab === item.id ? 'active' : ''}}"
            data-tab-id="{{item.id}}"
            bindtap="onTabChange">
        <text class="tab-label">{{item.name}}</text>
      </view>
    </view>
    
    <!-- 收起按钮 -->
    <view class="collapse-button" wx:if="{{showCollapseButton}}" bindtap="collapseDrawer">
      <text class="collapse-icon">▼</text>
    </view>
  </view>
  
  <!-- Tab 内容区（可滚动） -->
  <scroll-view class="tab-content" scroll-y enhanced show-scrollbar="{{false}}">
    <!-- 各个Tab的内容 -->
  </scroll-view>
</view>
```

### 3. `pages/collage/collage.wxss`

#### 核心样式

**抽屉容器** (Line 1267-1281)
```css
.bottom-drawer-area {
  background: #fbfbfd;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #d2d2d7;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.3s ease;
  z-index: 100;
}
```

**Tab导航栏** (Line 1289-1330)
```css
.tab-bar-minimal {
  display: flex;
  height: 44px;
  background: #fbfbfd;
  border-bottom: 1px solid #d2d2d7;
}

.tab-item-minimal.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #0071e3;
  border-radius: 1px;
}
```

**收起按钮** (Line 1373-1395)
```css
.collapse-button {
  position: absolute;
  top: 8px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  transition: all 0.2s;
}
```

---

## 🧪 测试步骤

### 1. 基础功能测试

1. **Tab切换**
   - 点击不同的Tab，检查是否正确切换
   - 收起状态下点击Tab，检查是否自动展开

2. **抽屉展开/收起**
   - 点击收起按钮，检查抽屉是否收起
   - 点击Tab，检查抽屉是否展开

3. **拖动手势**
   - 向上拖动抽屉头部，检查抽屉是否跟随
   - 向下拖动抽屉头部，检查抽屉是否跟随
   - 松手后检查是否自动吸附到最近的状态

### 2. 画布自适应测试

1. **展开抽屉**
   - 观察画布是否自动缩小
   - 检查画布比例是否保持不变

2. **收起抽屉**
   - 观察画布是否自动放大
   - 检查画布比例是否保持不变

3. **切换画布比例**
   - 在不同抽屉状态下切换画布比例
   - 检查画布是否正确调整尺寸

### 3. 边界情况测试

1. **快速拖动**
   - 快速向上/向下拖动
   - 检查是否有卡顿或错误

2. **多次切换**
   - 快速切换Tab
   - 快速展开/收起抽屉
   - 检查状态是否正确

---

## 📝 注意事项

1. **性能优化**
   - 抽屉高度变化使用CSS transition，流畅度高
   - 画布重绘只在必要时触发
   - 使用回调确保setData完成后再重绘

2. **兼容性**
   - 使用微信小程序原生组件
   - 触摸事件兼容真机和模拟器
   - 画布尺寸计算考虑不同屏幕尺寸

3. **用户体验**
   - 自动吸附提供明确的状态反馈
   - 收起按钮只在展开状态显示
   - 画布自适应避免内容被遮挡

---

## 🔄 后续优化方向

1. **内容完善**
   - 实现"海报"Tab的模版选择功能
   - 实现"拼接"Tab的拼接模式
   - 实现"自由"Tab的自由编辑模式

2. **交互优化**
   - 添加抽屉展开/收起的动画效果
   - 优化拖动手势的阻尼感
   - 添加触觉反馈（振动）

3. **性能优化**
   - 优化画布重绘性能
   - 添加防抖/节流处理
   - 优化内存占用

---

**版本**: v1.0.0  
**更新日期**: 2025-11-06  
**开发者**: Augment Agent

