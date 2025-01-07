// 显示插件 UI，设置宽度和高度
figma.showUI(__html__, { width: 600, height: 600 });

// 文本格式优化器
class TextOptimizer {
  // 检测文本主要语言
  static detectMainLanguage(text) {
    const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    return chineseCount > englishCount ? 'zh' : 'en';
  }

  // 空格优化
  static optimizeSpacing(text) {
    return text
      // 修正中英文之间的空格
      .replace(/([\u4e00-\u9fa5])([\w])/g, '$1 $2')
      .replace(/([\w])([\u4e00-\u9fa5])/g, '$1 $2')
      // 修正中文和数字之间的空格
      .replace(/([\u4e00-\u9fa5])(\d)/g, '$1 $2')
      .replace(/(\d)([\u4e00-\u9fa5])/g, '$1 $2')
      // 删除重复空格
      .replace(/\s+/g, ' ')
      // 修正括号前后的空格
      .replace(/\s*([(\[{])\s*/g, ' $1')
      .replace(/\s*([)\]}])\s*/g, '$1 ')
      // 删除中文之间的空格
      .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
  }

  // 标点优化
  static optimizePunctuation(text, lang) {
    if (lang === 'zh') {
      return text
        // 将英文标点转换为中文标点
        .replace(/,/g, '，')
        .replace(/\./g, '。')
        .replace(/\?/g, '？')
        .replace(/!/g, '！')
        .replace(/;/g, '；')
        .replace(/:/g, '：')
        // 修正引号
        .replace(/"/g, '\u201c')  // 替换成左双引号
        .replace(/"/g, '\u201d')  // 替换成右双引号
        .replace(/'/g, '\u2018')  // 替换成左单引号
        .replace(/'/g, '\u2019')  // 替换成右单引号
        // 修正破折号和省略号
        .replace(/--/g, '—')
        .replace(/\.\.\./g, '…');
    } else {
      return text
        // 将中文标点转换为英文标点
        .replace(/，/g, ', ')
        .replace(/。/g, '. ')
        .replace(/？/g, '? ')
        .replace(/！/g, '! ')
        .replace(/；/g, '; ')
        .replace(/：/g, ': ')
        // 修正引号
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // 修正破折号和省略号
        .replace(/—/g, ' - ')
        .replace(/…/g, '...');
    }
  }

  // 计算建议行高
  static calculateLineHeight(fontSize) {
    // 根据字号计算黄金比例的行高
    return Math.round(fontSize * 1.5);
  }

  // 主优化函数
  static async optimizeTextNode(node) {
    if (node.type !== 'TEXT') return;
  
    try {
      // 首先加载当前文本使用的字体
      await figma.loadFontAsync(node.fontName);
  
      // 保存原始文本以便比较
      const originalText = node.characters;
      
      // 检测主要语言
      const mainLang = this.detectMainLanguage(originalText);
      
      // 应用文本优化
      let optimizedText = originalText;
      optimizedText = this.optimizeSpacing(optimizedText);
      optimizedText = this.optimizePunctuation(optimizedText, mainLang);
  
      // 仅在文本确实改变时更新
      if (optimizedText !== originalText) {
        node.characters = optimizedText;
      }
  
      // 优化行高
      if (node.fontSize) {
        const suggestedLineHeight = this.calculateLineHeight(node.fontSize);
        node.lineHeight = { value: suggestedLineHeight, unit: "PIXELS" };
      }
    } catch (error) {
      console.error('处理文本节点时出错：', error);
      throw error;
    }
  }
  
  // 修改 processNodes 方法为异步方法
  static async processNodes(nodes) {
    for (const node of nodes) {
      if (node.type === 'TEXT') {
        await this.optimizeTextNode(node);
      }
      // 递归处理子节点
      if ('children' in node) {
        await this.processNodes(node.children);
      }
    }
  }
}

// 加载所有可用的字体并发送到前端 UI
figma.listAvailableFontsAsync().then((fonts) => {
  figma.ui.postMessage({ type: 'fonts-loaded', fonts });

  // 确保在 UI 加载后立即检查当前的选中状态
  checkSelectionStyles();
});

// 使用 `figma.ui.on` 事件监听器替代 `window.onmessage`
figma.ui.on('message', (pluginMessage) => {
  if (pluginMessage && pluginMessage.type === 'selection-changed') {
    const { fontSize, fontWeight, letterSpacing, lineHeight } = pluginMessage;

    // 更新每个字段的值，包括处理 "mix" 状态
    updateUIField('chinese-font-size', fontSize, 'input');
    updateUIField('chinese-font-weight', fontWeight, 'select');
    updateUIField('chinese-letter-spacing', letterSpacing, 'input');
    updateUIField('chinese-line-height', lineHeight, 'input');

    updateUIField('english-font-size', fontSize, 'input');
    updateUIField('english-font-weight', fontWeight, 'select');
    updateUIField('english-letter-spacing', letterSpacing, 'input');
    updateUIField('english-line-height', lineHeight, 'input');
  }
});

// 检查选中的文本节点的样式是否混合
function checkSelectionStyles() {
  const selectedNodes = figma.currentPage.selection;

  if (selectedNodes.length === 0) {
    return;
  }

  let fontSize, fontWeight, letterSpacing, lineHeight;
  let hasMixedFontSize = false;
  let hasMixedFontWeight = false;
  let hasMixedLetterSpacing = false;
  let hasMixedLineHeight = false;

  selectedNodes.forEach(node => {
    if (node.type === 'TEXT') {
      if (fontSize === undefined) {
        fontSize = node.fontSize;
      } else if (fontSize !== node.fontSize) {
        hasMixedFontSize = true;
      }

      if (fontWeight === undefined) {
        fontWeight = node.fontName.style;
      } else if (fontWeight !== node.fontName.style) {
        hasMixedFontWeight = true;
      }

      if (letterSpacing === undefined) {
        letterSpacing = node.letterSpacing.value;
      } else if (letterSpacing !== node.letterSpacing.value) {
        hasMixedLetterSpacing = true;
      }

      if (lineHeight === undefined) {
        lineHeight = node.lineHeight.value;
      } else if (lineHeight !== node.lineHeight.value) {
        hasMixedLineHeight = true;
      }
    }
  });

  figma.ui.postMessage({
    type: 'selection-changed',
    fontSize: hasMixedFontSize ? 'mix' : fontSize,
    fontWeight: hasMixedFontWeight ? 'mix' : fontWeight,
    letterSpacing: hasMixedLetterSpacing ? 'mix' : letterSpacing,
    lineHeight: hasMixedLineHeight ? 'mix' : lineHeight
  });
}

// 处理 UI 消息的逻辑
figma.ui.on('message', async (msg) => {
  if (msg.type === 'optimize-text') {
    const selectedNodes = figma.currentPage.selection;
    
    if (selectedNodes.length === 0) {
      figma.notify('请选择需要优化的图层');
      return;
    }

    try {
      await TextOptimizer.processNodes(selectedNodes);
      figma.notify('文本格式已优化完成！');
    } catch (error) {
      console.error('优化过程出错：', error);
      figma.notify('优化过程中出现错误：' + error.message);
    }
    return;
  }

  const selectedNodes = figma.currentPage.selection;

  if (selectedNodes.length === 0) {
    figma.notify('Please select a frame containing text.');
    return;
  }

  const applyTextStylesToNodes = async (textNodes) => {
    for (const textNode of textNodes) {
      const textContent = textNode.characters;
      const isChinese = /[\u4e00-\u9fa5]+/.test(textContent);

      if (msg.type === 'apply-chinese-styles' && isChinese) {
        await applyTextStyle(textNode, msg.styles);
      } else if (msg.type === 'apply-english-styles' && !isChinese) {
        await applyTextStyle(textNode, msg.styles);
      }
    }
  };

  for (const node of selectedNodes) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      const textNodes = node.findAllWithCriteria({ types: ['TEXT'] });
      await applyTextStylesToNodes(textNodes);
    } else if (node.type === 'TEXT') {
      await applyTextStylesToNodes([node]);
    }
  }

  figma.notify('Text styles updated successfully.');
});

// 样式应用函数
async function applyTextStyle(textNode, styles) {
  if (styles.fontFamily && styles.fontWeight !== 'current') {
    await figma.loadFontAsync({ family: styles.fontFamily, style: styles.fontWeight });
    textNode.fontName = { family: styles.fontFamily, style: styles.fontWeight };
  }

  if (styles.fontSize !== 'current' && !isNaN(parseFloat(styles.fontSize))) {
    textNode.fontSize = parseFloat(styles.fontSize);
  }

  if (styles.letterSpacing !== 'current' && !isNaN(parseFloat(styles.letterSpacing))) {
    textNode.letterSpacing = { value: parseFloat(styles.letterSpacing), unit: "PIXELS" };
  }

  if (styles.lineHeight !== 'current' && !isNaN(parseFloat(styles.lineHeight))) {
    textNode.lineHeight = { value: parseFloat(styles.lineHeight), unit: "PIXELS" };
  }

  if (styles.paragraphSpacing !== 'current' && !isNaN(parseFloat(styles.paragraphSpacing))) {
    textNode.paragraphSpacing = parseFloat(styles.paragraphSpacing);
  }

  textNode.textCase = styles.textCase;
  textNode.textDecoration = styles.textDecoration;
}