// 应用主题
function applyTheme(theme) {
  const body = document.body;
  if (theme === 'girly') {
    body.classList.add('girly-theme');
  } else {
    body.classList.remove('girly-theme');
  }
}

// 加载配置
function loadConfig() {
  chrome.storage.sync.get(['model', 'api_key', 'prompts', 'theme'], function(result) {
    if (!result.model || !result.api_key || !result.prompts || result.prompts.length === 0) {
      // 没有配置，显示去配置界面
      document.getElementById('no-config').style.display = 'block';
      document.getElementById('prompts-list').style.display = 'none';
      document.getElementById('input-container').style.display = 'none';
    } else {
      // 有配置，显示提示词列表
      document.getElementById('no-config').style.display = 'none';
      document.getElementById('prompts-list').style.display = 'block';
      document.getElementById('input-container').style.display = 'none';
      renderPrompts(result.prompts);
    }
    
    // 应用主题
    applyTheme(result.theme || 'robot');
  });
}

// 渲染提示词列表
function renderPrompts(prompts) {
  const container = document.getElementById('prompts-list');
  container.innerHTML = '';
  
  prompts.forEach((prompt, index) => {
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    promptItem.textContent = prompt.title;
    promptItem.onclick = () => selectPrompt(index, prompt);
    container.appendChild(promptItem);
  });
}

// 选择提示词
function selectPrompt(index, prompt) {
  // 保存当前选择的提示词
  currentPrompt = prompt;
  
  // 切换到输入界面
  document.getElementById('prompts-list').style.display = 'none';
  document.getElementById('input-container').style.display = 'block';
  
  // 更新提示词标题
  document.getElementById('current-prompt-title').textContent = prompt.title;
}

// 返回提示词列表
function backToPrompts() {
  document.getElementById('input-container').style.display = 'none';
  document.getElementById('prompts-list').style.display = 'block';
}

// 发送请求到SiliconFlow
async function sendToSiliconFlow() {
  const userInput = document.getElementById('user-input').value;
  if (!userInput) {
    alert('请输入内容');
    return;
  }
  
  if (!currentPrompt) {
    alert('请先选择提示词');
    return;
  }
  
  // 获取配置
  chrome.storage.sync.get(['model', 'api_key'], async function(result) {
    if (!result.model || !result.api_key) {
      alert('配置不完整，请先配置');
      return;
    }
    
    // 组合提示词和用户内容
    let combinedPrompt;
    if (currentPrompt.content.includes('{content}')) {
      combinedPrompt = currentPrompt.content.replace('{content}', userInput);
    } else {
      combinedPrompt = currentPrompt.content + '\n' + userInput;
    }
    
    // 添加当前实时时间到提示词最前面
    const currentTime = new Date();
    const formattedTime = `当前时间: ${currentTime.getFullYear()}-${(currentTime.getMonth() + 1).toString().padStart(2, '0')}-${currentTime.getDate().toString().padStart(2, '0')} ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    combinedPrompt = formattedTime + '\n\n' + combinedPrompt;
    
    // 显示加载状态
    const loading = document.getElementById('loading');
    const aiButton = document.getElementById('ai-button');
    loading.style.display = 'inline-block';
    aiButton.disabled = true;
    
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: result.model,
          messages: [
            {
              role: 'system',
              content: combinedPrompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error('API请求失败');
      }
      
      const data = await response.json();
      const resultText = data.choices[0].message.content;
      
      // 显示结果
      document.getElementById('result').value = resultText;
    } catch (error) {
      console.error('请求错误:', error);
      alert('请求失败，请检查配置和网络连接');
    } finally {
      // 隐藏加载状态
      loading.style.display = 'none';
      aiButton.disabled = false;
    }
  });
}

// 打开配置页面
function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// 复制结果到剪贴板
function copyResult() {
  const result = document.getElementById('result');
  result.select();
  document.execCommand('copy');
  
  const copyBtn = document.getElementById('copy-btn');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = '已复制!';
  copyBtn.style.background = '#4CAF50';
  
  setTimeout(() => {
    copyBtn.textContent = originalText;
    copyBtn.style.background = '#1a73e8';
  }, 2000);
}

// 全局变量
let currentPrompt = null;

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
  // 加载配置
  loadConfig();
  
  // 绑定事件
  document.getElementById('back-btn').onclick = backToPrompts;
  document.getElementById('ai-button').onclick = sendToSiliconFlow;
  document.getElementById('copy-btn').onclick = copyResult;
  
  // 绑定配置按钮事件
  const goConfigBtn = document.getElementById('go-config-btn');
  if (goConfigBtn) {
    goConfigBtn.onclick = openOptions;
  }
  
  const configLinkBtn = document.getElementById('config-link-btn');
  if (configLinkBtn) {
    configLinkBtn.onclick = function(e) {
      e.preventDefault(); // 阻止默认链接行为
      openOptions();
    };
  }
});