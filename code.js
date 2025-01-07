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
        .replace(/,/g, '，')
        .replace(/\./g, '。')
        .replace(/\?/g, '？')
        .replace(/!/g, '！')
        .replace(/;/g, '；')
        .replace(/:/g, '：')
        .replace(/"/g, '\u201c')
        .replace(/"/g, '\u201d')
        .replace(/'/g, '\u2018')
        .replace(/'/g, '\u2019')
        .replace(/--/g, '—')
        .replace(/\.\.\./g, '…');
    } else {
      return text
        .replace(/，/g, ', ')
        .replace(/。/g, '. ')
        .replace(/？/g, '? ')
        .replace(/！/g, '! ')
        .replace(/；/g, '; ')
        .replace(/：/g, ': ')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/—/g, ' - ')
        .replace(/…/g, '...');
    }
  }

  // 计算建议行高
  static calculateLineHeight(fontSize) {
    return Math.round(fontSize * 1.5);
  }

  // 主优化函数
  static async optimizeTextNode(node) {
    if (node.type !== 'TEXT') return;

    try {
      // 加载当前文本使用的字体
      await figma.loadFontAsync(node.fontName);

      const originalText = node.characters;
      const mainLang = this.detectMainLanguage(originalText);
      
      let optimizedText = originalText;
      optimizedText = this.optimizeSpacing(optimizedText);
      optimizedText = this.optimizePunctuation(optimizedText, mainLang);

      if (optimizedText !== originalText) {
        node.characters = optimizedText;
      }

      if (node.fontSize) {
        const suggestedLineHeight = this.calculateLineHeight(node.fontSize);
        node.lineHeight = { value: suggestedLineHeight, unit: "PIXELS" };
      }
    } catch (error) {
      console.error('处理文本节点时出错：', error);
      throw error;
    }
  }

  // 递归处理所有文本节点
  static async processNodes(nodes) {
    for (const node of nodes) {
      if (node.type === 'TEXT') {
        await this.optimizeTextNode(node);
      }
      if ('children' in node) {
        await this.processNodes(node.children);
      }
    }
  }
}

// 检查选中的文本节点的样式是否混合
function checkSelectionStyles() {
  console.log('Checking selection styles...'); // Debug log
  const selectedNodes = figma.currentPage.selection;
  
  // 如果没有选中节点，清空所有字段
  if (selectedNodes.length === 0) {
    console.log('No nodes selected, clearing fields'); // Debug log
    figma.ui.postMessage({
      type: 'selection-changed',
      styles: {
        fontSize: '',
        fontFamily: '',
        fontWeight: '',
        letterSpacing: '',
        lineHeight: '',
        paragraphSpacing: '',
        textCase: '',
        textDecoration: ''
      }
    });
    return;
  }

  // 初始化所有属性的检查对象
  const styleProps = {
    fontSize: { value: undefined, isMixed: false },
    fontFamily: { value: undefined, isMixed: false },
    fontWeight: { value: undefined, isMixed: false },
    letterSpacing: { value: undefined, isMixed: false },
    lineHeight: { value: undefined, isMixed: false },
    paragraphSpacing: { value: undefined, isMixed: false },
    textCase: { value: undefined, isMixed: false },
    textDecoration: { value: undefined, isMixed: false }
  };

  let hasTextNode = false;

  // 遍历所有选中的节点
  selectedNodes.forEach(node => {
    if (node.type === 'TEXT') {
      hasTextNode = true;
      // 检查每个属性
      Object.entries(styleProps).forEach(([prop, status]) => {
        let currentValue;
        switch(prop) {
          case 'fontSize':
            currentValue = node.fontSize;
            break;
          case 'fontFamily':
            currentValue = node.fontName.family;
            break;
          case 'fontWeight':
            currentValue = node.fontName.style;
            break;
          case 'letterSpacing':
            currentValue = node.letterSpacing ? node.letterSpacing.value : undefined;
            break;
          case 'lineHeight':
            currentValue = node.lineHeight ? node.lineHeight.value : undefined;
            break;
          case 'paragraphSpacing':
            currentValue = node.paragraphSpacing || undefined;
            break;
          case 'textCase':
            currentValue = node.textCase || 'ORIGINAL';
            break;
          case 'textDecoration':
            currentValue = node.textDecoration || 'NONE';
            break;
        }

        if (status.value === undefined) {
          status.value = currentValue;
        } else if (status.value !== currentValue) {
          status.isMixed = true;
        }
      });
    }
  });

  if (!hasTextNode) {
    console.log('No text nodes in selection'); // Debug log
    return;
  }

  // 发送状态到 UI
  const styles = Object.entries(styleProps).reduce((acc, [prop, status]) => {
    acc[prop] = status.isMixed ? 'mix' : status.value;
    return acc;
  }, {});

  console.log('Sending styles to UI:', styles); // Debug log
  figma.ui.postMessage({
    type: 'selection-changed',
    styles
  });
}

// 添加选区变化监听
figma.on('selectionchange', () => {
  console.log('Selection changed'); // Debug log
  checkSelectionStyles();
});

// 加载所有可用的字体并发送到前端 UI
figma.listAvailableFontsAsync().then((fonts) => {
  figma.ui.postMessage({ type: 'fonts-loaded', fonts });
  // 初始化时也检查一次当前选区
  checkSelectionStyles();
});

// 样式应用函数
async function applyTextStyle(textNode, styles) {
  try {
    // 先加载字体
    if (styles.fontFamily && styles.fontWeight !== 'mix' && styles.fontWeight !== 'current') {
      await figma.loadFontAsync({ 
        family: styles.fontFamily, 
        style: styles.fontWeight 
      });
    }

    // 只应用非 mix 的样式
    if (styles.fontFamily !== 'mix' && styles.fontWeight !== 'mix') {
      textNode.fontName = { 
        family: styles.fontFamily, 
        style: styles.fontWeight 
      };
    }

    if (styles.fontSize !== 'mix' && styles.fontSize !== 'current') {
      textNode.fontSize = parseFloat(styles.fontSize);
    }

    if (styles.letterSpacing !== 'mix' && styles.letterSpacing !== 'current') {
      textNode.letterSpacing = { 
        value: parseFloat(styles.letterSpacing), 
        unit: "PIXELS" 
      };
    }

    if (styles.lineHeight !== 'mix' && styles.lineHeight !== 'current') {
      textNode.lineHeight = { 
        value: parseFloat(styles.lineHeight), 
        unit: "PIXELS" 
      };
    }

    if (styles.paragraphSpacing !== 'mix' && styles.paragraphSpacing !== 'current') {
      textNode.paragraphSpacing = parseFloat(styles.paragraphSpacing);
    }

    if (styles.textCase !== 'mix') {
      textNode.textCase = styles.textCase;
    }

    if (styles.textDecoration !== 'mix') {
      textNode.textDecoration = styles.textDecoration;
    }
  } catch (error) {
    console.error('应用样式时出错：', error);
    throw error;
  }
}

// 统一的消息处理
figma.ui.on('message', async (msg) => {
  const selectedNodes = figma.currentPage.selection;

  try {
    switch (msg.type) {
      case 'optimize-text':
        if (selectedNodes.length === 0) {
          figma.notify('请选择需要优化的图层');
          return;
        }
        await TextOptimizer.processNodes(selectedNodes);
        figma.notify('文本格式已优化完成！');
        break;

      case 'apply-chinese-styles':
      case 'apply-english-styles':
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
        // 更新完样式后重新检查选区
        checkSelectionStyles();
        break;

      default:
        console.log('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('消息处理出错：', error);
    figma.notify('操作过程中出现错误');
  }
});