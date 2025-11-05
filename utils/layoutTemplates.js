/**
 * 布局模板定义
 * 支持1-16张图片的多种布局方式
 */

/**
 * 布局类型说明:
 * - grid: 规则网格布局,使用 rows 和 cols 定义
 * - custom: 自定义布局,使用 positions 数组定义每张图片的位置
 * 
 * positions 数组格式:
 * [
 *   { x: 0, y: 0, width: 0.5, height: 0.5 },  // 相对位置和尺寸 (0-1)
 *   ...
 * ]
 */

const layoutTemplates = {
  // 1张图片
  '1': [
    {
      name: '单图居中',
      icon: '▫',
      type: 'grid',
      rows: 1,
      cols: 1
    }
  ],

  // 2张图片
  '2': [
    {
      name: '横向排列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 2
    },
    {
      name: '竖向排列',
      icon: '▥',
      type: 'grid',
      rows: 2,
      cols: 1
    },
    {
      name: '上大下小',
      icon: '⬒',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 1, height: 0.6 },
        { x: 0, y: 0.6, width: 1, height: 0.4 }
      ]
    },
    {
      name: '左大右小',
      icon: '◧',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.6, height: 1 },
        { x: 0.6, y: 0, width: 0.4, height: 1 }
      ]
    }
  ],

  // 3张图片
  '3': [
    {
      name: '横向三列',
      icon: '☰',
      type: 'grid',
      rows: 1,
      cols: 3
    },
    {
      name: '竖向三行',
      icon: '▥',
      type: 'grid',
      rows: 3,
      cols: 1
    },
    {
      name: '上1下2',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 1, height: 0.5 },
        { x: 0, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
      ]
    },
    {
      name: '上2下1',
      icon: '⌵',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0, width: 0.5, height: 0.5 },
        { x: 0, y: 0.5, width: 1, height: 0.5 }
      ]
    },
    {
      name: '左1右2',
      icon: '◨',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 1 },
        { x: 0.5, y: 0, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
      ]
    },
    {
      name: '左2右1',
      icon: '◧',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        { x: 0, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0, width: 0.5, height: 1 }
      ]
    }
  ],

  // 4张图片
  '4': [
    {
      name: '2×2网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 2
    },
    {
      name: '横向四列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 4
    },
    {
      name: '竖向四行',
      icon: '▥',
      type: 'grid',
      rows: 4,
      cols: 1
    },
    {
      name: '上1下3',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 1, height: 0.4 },
        { x: 0, y: 0.4, width: 0.333, height: 0.6 },
        { x: 0.333, y: 0.4, width: 0.334, height: 0.6 },
        { x: 0.667, y: 0.4, width: 0.333, height: 0.6 }
      ]
    },
    {
      name: '上3下1',
      icon: '⌵',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.6 },
        { x: 0.333, y: 0, width: 0.334, height: 0.6 },
        { x: 0.667, y: 0, width: 0.333, height: 0.6 },
        { x: 0, y: 0.6, width: 1, height: 0.4 }
      ]
    },
    {
      name: '左1右3',
      icon: '◨',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.4, height: 1 },
        { x: 0.4, y: 0, width: 0.6, height: 0.333 },
        { x: 0.4, y: 0.333, width: 0.6, height: 0.334 },
        { x: 0.4, y: 0.667, width: 0.6, height: 0.333 }
      ]
    },
    {
      name: '左3右1',
      icon: '◧',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.6, height: 0.333 },
        { x: 0, y: 0.333, width: 0.6, height: 0.334 },
        { x: 0, y: 0.667, width: 0.6, height: 0.333 },
        { x: 0.6, y: 0, width: 0.4, height: 1 }
      ]
    }
  ],

  // 5张图片
  '5': [
    {
      name: '上2下3',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.4 },
        { x: 0.5, y: 0, width: 0.5, height: 0.4 },
        { x: 0, y: 0.4, width: 0.333, height: 0.6 },
        { x: 0.333, y: 0.4, width: 0.334, height: 0.6 },
        { x: 0.667, y: 0.4, width: 0.333, height: 0.6 }
      ]
    },
    {
      name: '上3下2',
      icon: '⌵',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.6 },
        { x: 0.333, y: 0, width: 0.334, height: 0.6 },
        { x: 0.667, y: 0, width: 0.333, height: 0.6 },
        { x: 0, y: 0.6, width: 0.5, height: 0.4 },
        { x: 0.5, y: 0.6, width: 0.5, height: 0.4 }
      ]
    },
    {
      name: '左2右3',
      icon: '◨',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.4, height: 0.5 },
        { x: 0, y: 0.5, width: 0.4, height: 0.5 },
        { x: 0.4, y: 0, width: 0.6, height: 0.333 },
        { x: 0.4, y: 0.333, width: 0.6, height: 0.334 },
        { x: 0.4, y: 0.667, width: 0.6, height: 0.333 }
      ]
    },
    {
      name: '左3右2',
      icon: '◧',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.6, height: 0.333 },
        { x: 0, y: 0.333, width: 0.6, height: 0.334 },
        { x: 0, y: 0.667, width: 0.6, height: 0.333 },
        { x: 0.6, y: 0, width: 0.4, height: 0.5 },
        { x: 0.6, y: 0.5, width: 0.4, height: 0.5 }
      ]
    },
    {
      name: '中心布局',
      icon: '◉',
      type: 'custom',
      positions: [
        { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },  // 中心
        { x: 0, y: 0, width: 0.2, height: 0.2 },      // 左上
        { x: 0.8, y: 0, width: 0.2, height: 0.2 },    // 右上
        { x: 0, y: 0.8, width: 0.2, height: 0.2 },    // 左下
        { x: 0.8, y: 0.8, width: 0.2, height: 0.2 }   // 右下
      ]
    }
  ],

  // 6张图片
  '6': [
    {
      name: '2×3网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 3
    },
    {
      name: '3×2网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 2
    },
    {
      name: '横向六列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 6
    },
    {
      name: '竖向六行',
      icon: '▥',
      type: 'grid',
      rows: 6,
      cols: 1
    },
    {
      name: '上2中2下2',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.333 },
        { x: 0.5, y: 0, width: 0.5, height: 0.333 },
        { x: 0, y: 0.333, width: 0.5, height: 0.334 },
        { x: 0.5, y: 0.333, width: 0.5, height: 0.334 },
        { x: 0, y: 0.667, width: 0.5, height: 0.333 },
        { x: 0.5, y: 0.667, width: 0.5, height: 0.333 }
      ]
    },
    {
      name: '上1中2下3',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 1, height: 0.25 },
        { x: 0, y: 0.25, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0.25, width: 0.5, height: 0.25 },
        { x: 0, y: 0.5, width: 0.333, height: 0.5 },
        { x: 0.333, y: 0.5, width: 0.334, height: 0.5 },
        { x: 0.667, y: 0.5, width: 0.333, height: 0.5 }
      ]
    }
  ],

  // 7张图片
  '7': [
    {
      name: '上1中3下3',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 1, height: 0.25 },
        { x: 0, y: 0.25, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0.25, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0.25, width: 0.333, height: 0.375 },
        { x: 0, y: 0.625, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0.625, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0.625, width: 0.333, height: 0.375 }
      ]
    },
    {
      name: '上2中3下2',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0, width: 0.5, height: 0.25 },
        { x: 0, y: 0.25, width: 0.333, height: 0.5 },
        { x: 0.333, y: 0.25, width: 0.334, height: 0.5 },
        { x: 0.667, y: 0.25, width: 0.333, height: 0.5 },
        { x: 0, y: 0.75, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0.75, width: 0.5, height: 0.25 }
      ]
    },
    {
      name: '上3中1下3',
      icon: '⌵',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0, width: 0.333, height: 0.375 },
        { x: 0, y: 0.375, width: 1, height: 0.25 },
        { x: 0, y: 0.625, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0.625, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0.625, width: 0.333, height: 0.375 }
      ]
    },
    {
      name: '横向七列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 7
    }
  ],

  // 8张图片
  '8': [
    {
      name: '2×4网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 4
    },
    {
      name: '4×2网格',
      icon: '▦',
      type: 'grid',
      rows: 4,
      cols: 2
    },
    {
      name: '上2中4下2',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0, width: 0.5, height: 0.25 },
        { x: 0, y: 0.25, width: 0.25, height: 0.5 },
        { x: 0.25, y: 0.25, width: 0.25, height: 0.5 },
        { x: 0.5, y: 0.25, width: 0.25, height: 0.5 },
        { x: 0.75, y: 0.25, width: 0.25, height: 0.5 },
        { x: 0, y: 0.75, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0.75, width: 0.5, height: 0.25 }
      ]
    },
    {
      name: '上3中2下3',
      icon: '⌶',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0, width: 0.333, height: 0.375 },
        { x: 0, y: 0.375, width: 0.5, height: 0.25 },
        { x: 0.5, y: 0.375, width: 0.5, height: 0.25 },
        { x: 0, y: 0.625, width: 0.333, height: 0.375 },
        { x: 0.333, y: 0.625, width: 0.334, height: 0.375 },
        { x: 0.667, y: 0.625, width: 0.333, height: 0.375 }
      ]
    },
    {
      name: '横向八列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 8
    }
  ],

  // 9张图片
  '9': [
    {
      name: '3×3网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 3
    },
    {
      name: '横向九列',
      icon: '▬',
      type: 'grid',
      rows: 1,
      cols: 9
    },
    {
      name: '上2中5下2',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.5, height: 0.2 },
        { x: 0.5, y: 0, width: 0.5, height: 0.2 },
        { x: 0, y: 0.2, width: 0.2, height: 0.6 },
        { x: 0.2, y: 0.2, width: 0.2, height: 0.6 },
        { x: 0.4, y: 0.2, width: 0.2, height: 0.6 },
        { x: 0.6, y: 0.2, width: 0.2, height: 0.6 },
        { x: 0.8, y: 0.2, width: 0.2, height: 0.6 },
        { x: 0, y: 0.8, width: 0.5, height: 0.2 },
        { x: 0.5, y: 0.8, width: 0.5, height: 0.2 }
      ]
    },
    {
      name: '中心1周围8',
      icon: '◉',
      type: 'custom',
      positions: [
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },  // 中心
        { x: 0, y: 0, width: 0.25, height: 0.25 },      // 左上
        { x: 0.25, y: 0, width: 0.5, height: 0.25 },    // 上
        { x: 0.75, y: 0, width: 0.25, height: 0.25 },   // 右上
        { x: 0.75, y: 0.25, width: 0.25, height: 0.5 }, // 右
        { x: 0.75, y: 0.75, width: 0.25, height: 0.25 },// 右下
        { x: 0.25, y: 0.75, width: 0.5, height: 0.25 }, // 下
        { x: 0, y: 0.75, width: 0.25, height: 0.25 },   // 左下
        { x: 0, y: 0.25, width: 0.25, height: 0.5 }     // 左
      ]
    }
  ],

  // 10张图片
  '10': [
    {
      name: '2×5网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 5
    },
    {
      name: '5×2网格',
      icon: '▦',
      type: 'grid',
      rows: 5,
      cols: 2
    },
    {
      name: '上3中4下3',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.3 },
        { x: 0.333, y: 0, width: 0.334, height: 0.3 },
        { x: 0.667, y: 0, width: 0.333, height: 0.3 },
        { x: 0, y: 0.3, width: 0.25, height: 0.4 },
        { x: 0.25, y: 0.3, width: 0.25, height: 0.4 },
        { x: 0.5, y: 0.3, width: 0.25, height: 0.4 },
        { x: 0.75, y: 0.3, width: 0.25, height: 0.4 },
        { x: 0, y: 0.7, width: 0.333, height: 0.3 },
        { x: 0.333, y: 0.7, width: 0.334, height: 0.3 },
        { x: 0.667, y: 0.7, width: 0.333, height: 0.3 }
      ]
    }
  ],

  // 11张图片
  '11': [
    {
      name: '上3中5下3',
      icon: '☰',
      type: 'custom',
      positions: [
        { x: 0, y: 0, width: 0.333, height: 0.3 },
        { x: 0.333, y: 0, width: 0.334, height: 0.3 },
        { x: 0.667, y: 0, width: 0.333, height: 0.3 },
        { x: 0, y: 0.3, width: 0.2, height: 0.4 },
        { x: 0.2, y: 0.3, width: 0.2, height: 0.4 },
        { x: 0.4, y: 0.3, width: 0.2, height: 0.4 },
        { x: 0.6, y: 0.3, width: 0.2, height: 0.4 },
        { x: 0.8, y: 0.3, width: 0.2, height: 0.4 },
        { x: 0, y: 0.7, width: 0.333, height: 0.3 },
        { x: 0.333, y: 0.7, width: 0.334, height: 0.3 },
        { x: 0.667, y: 0.7, width: 0.333, height: 0.3 }
      ]
    },
    {
      name: '3×4网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 4
    }
  ],

  // 12张图片
  '12': [
    {
      name: '3×4网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 4
    },
    {
      name: '4×3网格',
      icon: '▦',
      type: 'grid',
      rows: 4,
      cols: 3
    },
    {
      name: '2×6网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 6
    },
    {
      name: '6×2网格',
      icon: '▦',
      type: 'grid',
      rows: 6,
      cols: 2
    }
  ],

  // 13张图片
  '13': [
    {
      name: '3×5网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 5
    },
    {
      name: '5×3网格',
      icon: '▦',
      type: 'grid',
      rows: 5,
      cols: 3
    }
  ],

  // 14张图片
  '14': [
    {
      name: '2×7网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 7
    },
    {
      name: '7×2网格',
      icon: '▦',
      type: 'grid',
      rows: 7,
      cols: 2
    }
  ],

  // 15张图片
  '15': [
    {
      name: '3×5网格',
      icon: '▦',
      type: 'grid',
      rows: 3,
      cols: 5
    },
    {
      name: '5×3网格',
      icon: '▦',
      type: 'grid',
      rows: 5,
      cols: 3
    }
  ],

  // 16张图片
  '16': [
    {
      name: '4×4网格',
      icon: '▦',
      type: 'grid',
      rows: 4,
      cols: 4
    },
    {
      name: '2×8网格',
      icon: '▦',
      type: 'grid',
      rows: 2,
      cols: 8
    },
    {
      name: '8×2网格',
      icon: '▦',
      type: 'grid',
      rows: 8,
      cols: 2
    }
  ]
};

/**
 * 获取指定图片数量的布局模板
 * @param {number} imageCount - 图片数量
 * @returns {Array} 布局模板数组
 */
function getLayoutTemplates (imageCount) {
  if (imageCount < 1 || imageCount > 16) {
    return [];
  }
  return layoutTemplates[imageCount] || [];
}

/**
 * 获取所有布局模板
 * @returns {Object} 所有布局模板
 */
function getAllLayoutTemplates () {
  return layoutTemplates;
}

module.exports = {
  getLayoutTemplates,
  getAllLayoutTemplates,
  layoutTemplates
};

