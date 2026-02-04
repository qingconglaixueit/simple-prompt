// 加载配置
function loadConfig() {
  // 优先从local存储加载，确保获取最新保存的完整配置
  chrome.storage.local.get(['model', 'api_key', 'prompts', 'theme'], function(localResult) {
    if (chrome.runtime.lastError) {
      console.error('Local存储加载失败:', chrome.runtime.lastError);
      
      // 如果local存储失败，尝试从sync存储加载
      chrome.storage.sync.get(['model', 'api_key', 'prompts', 'theme'], function(syncResult) {
        if (chrome.runtime.lastError) {
          console.error('Sync存储加载也失败:', chrome.runtime.lastError);
          // 显示一个空的配置
          renderPrompts([{ title: '', content: '' }]);
          return;
        }
        
        processConfigData(syncResult);
      });
    } else {
      // Local存储加载成功，处理数据
      processConfigData(localResult);
    }
  });
}

// 处理配置数据
function processConfigData(result) {
  if (result.model) {
    document.getElementById('model').value = result.model;
  }
  if (result.api_key) {
    document.getElementById('api_key').value = result.api_key;
  }
  if (result.prompts && result.prompts.length > 0) {
    renderPrompts(result.prompts);
  } else {
    // 默认显示一个空的提示词配置
    renderPrompts([{ title: '', content: '' }]);
  }
  
  // 加载主题设置
  if (result.theme) {
    document.getElementById(`theme-${result.theme}`).checked = true;
  } else {
    // 默认使用机器人主题
    document.getElementById('theme-robot').checked = true;
  }
  
  // 应用主题
  applyTheme(result.theme || 'robot');
}

// 应用主题
function applyTheme(theme) {
  const body = document.body;
  if (theme === 'girly') {
    body.classList.add('girly-theme');
  } else {
    body.classList.remove('girly-theme');
  }
}

// 渲染提示词配置
function renderPrompts(prompts) {
  const container = document.getElementById('prompts-container');
  container.innerHTML = '';
  
  prompts.forEach((prompt, index) => {
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    promptItem.innerHTML = `
      <div class="input-group">
        <label for="prompt-title-${index}">提示词功能标题描述</label>
        <input type="text" id="prompt-title-${index}" value="${prompt.title || ''}" placeholder="例如: 文案润色">
      </div>
      <div class="input-group">
        <label for="prompt-content-${index}">提示词详情</label>
        <textarea id="prompt-content-${index}" placeholder="例如: 请将以下内容润色得更专业: {content}">${prompt.content || ''}</textarea>
      </div>
      <button class="delete-btn">删除</button>
    `;
    container.appendChild(promptItem);
    
    // 为删除按钮添加事件监听器
    const deleteBtn = promptItem.querySelector('.delete-btn');
    deleteBtn.onclick = () => deletePrompt(index);
  });
}

// 添加提示词
function addPrompt() {
  const container = document.getElementById('prompts-container');
  const index = container.children.length;
  
  const promptItem = document.createElement('div');
  promptItem.className = 'prompt-item';
  promptItem.innerHTML = `
    <div class="input-group">
      <label for="prompt-title-${index}">提示词功能标题描述</label>
      <input type="text" id="prompt-title-${index}" placeholder="例如: 文案润色">
    </div>
    <div class="input-group">
      <label for="prompt-content-${index}">提示词详情</label>
      <textarea id="prompt-content-${index}" placeholder="例如: 请将以下内容润色得更专业: {content}"></textarea>
    </div>
    <button class="delete-btn">删除</button>
  `;
  container.appendChild(promptItem);
  
  // 为删除按钮添加事件监听器
  const deleteBtn = promptItem.querySelector('.delete-btn');
  deleteBtn.onclick = () => deletePrompt(index);
}

// 删除提示词
function deletePrompt(index) {
  const container = document.getElementById('prompts-container');
  if (container.children.length > 1) {
    container.removeChild(container.children[index]);
    // 重新编号
    reindexPrompts();
  } else {
    alert('至少需要保留一个提示词配置');
  }
}

// 重新编号提示词
function reindexPrompts() {
  const container = document.getElementById('prompts-container');
  const promptItems = container.querySelectorAll('.prompt-item');
  
  promptItems.forEach((item, index) => {
    const titleInput = item.querySelector('input');
    const contentTextarea = item.querySelector('textarea');
    const deleteBtn = item.querySelector('button');
    
    titleInput.id = `prompt-title-${index}`;
    contentTextarea.id = `prompt-content-${index}`;
    deleteBtn.onclick = () => deletePrompt(index);
  });
}

// 保存配置
function saveConfig() {
  const model = document.getElementById('model').value;
  const api_key = document.getElementById('api_key').value;
  const prompts = [];
  
  // 获取当前选中的主题
  const theme = document.querySelector('input[name="theme"]:checked').value;
  
  const container = document.getElementById('prompts-container');
  const promptItems = container.querySelectorAll('.prompt-item');
  
  promptItems.forEach((item, index) => {
    const title = item.querySelector(`#prompt-title-${index}`).value;
    const content = item.querySelector(`#prompt-content-${index}`).value;
    prompts.push({ title, content });
  });
  
  // 验证必填项
  if (!model || !api_key) {
    alert('请填写模型名称和API Key');
    return;
  }
  
  if (prompts.some(prompt => !prompt.title || !prompt.content)) {
    alert('请填写所有提示词的标题和内容');
    return;
  }
  
  // 准备要保存的数据
  const configData = {
    model: model,
    api_key: api_key,
    prompts: prompts,
    theme: theme
  };
  
  // 检查数据大小
  const dataSize = new Blob([JSON.stringify(configData)]).size;
  console.log('配置数据大小:', Math.round(dataSize / 1024), 'KB');
  
  // 保存到local存储（始终保存，确保数据一致性）
  chrome.storage.local.set(configData, function() {
    const status = document.getElementById('status');
    
    if (chrome.runtime.lastError) {
      console.error('Local存储失败:', chrome.runtime.lastError);
      status.textContent = '保存失败：' + chrome.runtime.lastError.message;
      status.classList.add('show');
      status.style.color = '#ff4444';
      setTimeout(() => {
        status.classList.remove('show');
        setTimeout(() => {
          status.textContent = '';
          status.style.color = '';
        }, 500);
      }, 3000);
      return;
    }
    
    // local存储成功后，再尝试sync存储
    chrome.storage.sync.set(configData, function() {
      if (chrome.runtime.lastError) {
        console.error('Sync存储失败:', chrome.runtime.lastError);
        // sync存储失败不影响local存储的成功提示
      }
      
      status.textContent = '配置已保存！';
      status.classList.add('show');
      setTimeout(() => {
        status.classList.remove('show');
        setTimeout(() => {
          status.textContent = '';
        }, 500);
      }, 2000);
    });
  });
}

// 页面加载时加载配置
document.addEventListener('DOMContentLoaded', function() {
  loadConfig();
  
  // 绑定添加提示词按钮事件
  const addPromptBtn = document.getElementById('add-prompt-btn');
  if (addPromptBtn) {
    addPromptBtn.onclick = addPrompt;
  }
  
  // 绑定保存配置按钮事件
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.onclick = saveConfig;
  }
  
  // 绑定主题切换事件（实时预览）
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      // 实时应用主题变化（无需保存即可预览）
      applyTheme(this.value);
    });
  });
});