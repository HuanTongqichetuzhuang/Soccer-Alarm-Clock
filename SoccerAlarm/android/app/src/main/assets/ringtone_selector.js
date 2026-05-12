// ==================== 铃声选择 & 试听功能（可折叠菜单）====================

// 当前正在试听的铃声ID
let currentlyPlayingRingtone = null;
// 当前试听音量（0-100，默认70）
let previewVolume = 70;
// 折叠面板状态
let ringtonePanelExpanded = false;
// 铃声列表是否已加载
let ringtoneListLoaded = false;

/**
 * 切换铃声面板折叠/展开
 */
function toggleRingtonePanel() {
  const header = document.getElementById('ringtoneCollapseHeader');
  const body = document.getElementById('ringtoneCollapseBody');
  if (!header || !body) return;
  
  ringtonePanelExpanded = !ringtonePanelExpanded;
  
  if (ringtonePanelExpanded) {
    header.classList.add('expanded');
    body.classList.add('expanded');
    // 首次展开时加载铃声列表
    if (!ringtoneListLoaded) {
      loadRingtones();
      ringtoneListLoaded = true;
    }
  } else {
    header.classList.remove('expanded');
    body.classList.remove('expanded');
    // 收起时停止试听
    if (currentlyPlayingRingtone) {
      stopTestRingtone();
    }
  }
}

/**
 * 加载铃声列表
 * 包含：系统默认铃声 + 内置铃声列表 + 手机铃声选择器
 */
function loadRingtones() {
  const container = document.getElementById('ringtoneList');
  if (!container) return;
  
  if (!window.AndroidAlarm || !window.AndroidAlarm.getAvailableRingtones) {
    container.innerHTML = '<div style="text-align:center;color:#7f8c9a;padding:10px;font-size:12px">当前环境不支持铃声选择</div>';
    return;
  }
  
  try {
    const ringtonesJson = window.AndroidAlarm.getAvailableRingtones();
    const ringtones = JSON.parse(ringtonesJson);
    
    if (!ringtones || ringtones.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#7f8c9a;padding:10px;font-size:12px">暂无可用铃声</div>';
      return;
    }
    
    // 获取当前选中的铃声
    let selectedId = 'default';
    if (window.AndroidAlarm && window.AndroidAlarm.getSelectedRingtone) {
      try {
        selectedId = window.AndroidAlarm.getSelectedRingtone();
      } catch(e) {}
    }

    // 检查是否有自定义铃声
    let hasCustom = false;
    let customName = '';
    if (window.AndroidAlarm && window.AndroidAlarm.hasCustomRingtone) {
      try {
        hasCustom = window.AndroidAlarm.hasCustomRingtone();
        if (hasCustom && window.AndroidAlarm.getCustomRingtoneName) {
          customName = window.AndroidAlarm.getCustomRingtoneName();
        }
      } catch(e) {}
    }
    
    // === 1. 手机铃声选择器（最顶部，突出显示）===
    let html = '';
    const isCustomSelected = selectedId === 'custom' && hasCustom;
    html += `
      <div class="system-ringtone-btn${isCustomSelected ? ' has-custom' : ''}" onclick="openSystemRingtonePicker()">
        <div class="sr-icon">📱</div>
        <div class="sr-info">
          <div class="sr-title">${isCustomSelected ? ha(customName || '自定义铃声') : '从手机选择铃声'}</div>
          <div class="sr-desc">${isCustomSelected ? '已选择 · 点击更换' : '打开系统铃声库，选择手机中任意铃声'}</div>
        </div>
        ${isCustomSelected ? '<span class="sr-check">✓</span>' : ''}
      </div>`;

    // 如果选择了自定义铃声，显示清除按钮
    if (isCustomSelected) {
      html += `<div style="text-align:right;margin:-2px 0 6px"><button onclick="event.stopPropagation();clearCustomRingtone()" style="font-size:11px;padding:3px 10px;background:rgba(244,67,54,.1);border:1px solid rgba(244,67,54,.3);border-radius:6px;color:#f44336;cursor:pointer">✕ 恢复默认</button></div>`;
    }

    // === 2. 内置铃声分隔线 ===
    html += `<div style="font-size:11px;color:#7f8c9a;padding:8px 0 4px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px">内置铃声</div>`;
    
    // === 3. 内置铃声列表 ===
    html += ringtones.map(rt => {
      const isSelected = rt.id === selectedId;
      const isPlaying = currentlyPlayingRingtone === rt.id;
      return `
      <div class="ringtone-item${isSelected ? ' selected' : ''}${isPlaying ? ' playing' : ''}" onclick="selectRingtone('${escapeJs(rt.id)}','${escapeJs(rt.name)}')">
        <div class="ringtone-info">
          <div class="ringtone-name">${rt.name}</div>
          <div class="ringtone-source">${rt.source === 'system' ? '系统铃声' : '本地铃声'}</div>
        </div>
        <div class="ringtone-actions">
          ${isSelected ? '<span class="ringtone-check">✓</span>' : ''}
          <button class="ringtone-preview-btn${isPlaying ? ' active' : ''}" onclick="event.stopPropagation();toggleRingtonePreview('${escapeJs(rt.id)}')">
            ${isPlaying ? '⏹' : '▶'}
          </button>
        </div>
      </div>`;
    }).join('');
    
    container.innerHTML = html;
    
    // 如果正在试听，显示音量控制面板
    renderVolumeControl();
    
    // 更新显示的铃声名称
    updateSelectedRingtoneName();
  } catch (e) {
    console.error('加载铃声列表失败:', e);
    container.innerHTML = '<div style="text-align:center;color:#7f8c9a;padding:10px;font-size:12px">加载失败</div>';
  }
}

/**
 * 打开系统铃声选择器
 */
function openSystemRingtonePicker() {
  if (!window.AndroidAlarm || !window.AndroidAlarm.openSystemRingtonePicker) {
    showToast('⚠️ 当前环境不支持系统铃声选择');
    return;
  }
  try {
    window.AndroidAlarm.openSystemRingtonePicker();
  } catch (e) {
    console.error('打开铃声选择器失败:', e);
    showToast('⚠️ 无法打开铃声选择器');
  }
}

/**
 * 系统铃声选择器回调（由Kotlin端调用）
 */
function onCustomRingtoneSelected(name) {
  showToast('✅ 已选择铃声：' + name);
  loadRingtones();
}

/**
 * 清除自定义铃声
 */
function clearCustomRingtone() {
  if (!window.AndroidAlarm || !window.AndroidAlarm.clearCustomRingtone) {
    showToast('⚠️ 当前环境不支持此操作');
    return;
  }
  try {
    window.AndroidAlarm.clearCustomRingtone();
    showToast('✅ 已恢复默认铃声');
    loadRingtones();
  } catch (e) {
    console.error('清除自定义铃声失败:', e);
    showToast('⚠️ 操作失败');
  }
}

/**
 * 渲染音量控制面板
 * 只在试听时显示
 */
function renderVolumeControl() {
  let panel = document.getElementById('volumeControlPanel');
  
  if (!currentlyPlayingRingtone) {
    // 不在试听，移除面板
    if (panel) panel.remove();
    return;
  }
  
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'volumeControlPanel';
    panel.className = 'volume-control-panel';
    
    // 找到铃声列表容器，插入在后面
    const ringtoneList = document.getElementById('ringtoneList');
    if (ringtoneList && ringtoneList.parentNode) {
      ringtoneList.parentNode.insertBefore(panel, ringtoneList.nextSibling);
    }
  }
  
  panel.innerHTML = `
    <div class="volume-header">
      <span class="volume-icon">${previewVolume === 0 ? '🔇' : previewVolume < 30 ? '🔈' : previewVolume < 70 ? '🔉' : '🔊'}</span>
      <span class="volume-label">试听音量</span>
      <span class="volume-value">${previewVolume}%</span>
    </div>
    <div class="volume-slider-wrap">
      <input type="range" min="0" max="100" value="${previewVolume}" 
        class="volume-slider" 
        oninput="onVolumeChange(this.value)"
        ontouchmove="onVolumeChange(this.value)">
    </div>
    <div class="volume-actions">
      <button class="volume-btn stop-btn" onclick="stopTestRingtone()">⏹ 停止试听</button>
    </div>
  `;
}

/**
 * 音量滑块变化回调
 */
function onVolumeChange(val) {
  previewVolume = parseInt(val);
  
  // 实时调节native端音量
  if (window.AndroidAlarm && window.AndroidAlarm.setRingtoneVolume) {
    try {
      window.AndroidAlarm.setRingtoneVolume(previewVolume);
    } catch(e) {
      console.error('调节音量失败:', e);
    }
  }
  
  // 更新音量图标和数值
  const panel = document.getElementById('volumeControlPanel');
  if (panel) {
    const icon = panel.querySelector('.volume-icon');
    const value = panel.querySelector('.volume-value');
    if (icon) icon.textContent = previewVolume === 0 ? '🔇' : previewVolume < 30 ? '🔈' : previewVolume < 70 ? '🔉' : '🔊';
    if (value) value.textContent = previewVolume + '%';
  }
}

/**
 * 切换铃声试听（点击试听按钮）
 * 如果正在播放同一首，则停止；否则播放新铃声
 */
function toggleRingtonePreview(ringtoneId) {
  if (currentlyPlayingRingtone === ringtoneId) {
    // 停止当前播放
    stopTestRingtone();
    return;
  }
  
  // 停止之前的播放
  if (window.AndroidAlarm && window.AndroidAlarm.stopRingtone) {
    try { window.AndroidAlarm.stopRingtone(); } catch(e) {}
  }
  
  // 开始新的试听（带音量）
  currentlyPlayingRingtone = ringtoneId;
  
  if (window.AndroidAlarm) {
    try {
      // 优先使用带音量的播放接口
      if (window.AndroidAlarm.playRingtoneWithVolume) {
        window.AndroidAlarm.playRingtoneWithVolume(ringtoneId, previewVolume);
      } else if (window.AndroidAlarm.playRingtone) {
        window.AndroidAlarm.playRingtone(ringtoneId);
      }
    } catch (e) {
      console.error('试听铃声失败:', e);
      showToast('⚠️ 试听失败');
    }
  }
  
  // 刷新列表以更新试听按钮状态和音量面板
  loadRingtones();
}

/**
 * 选择铃声
 */
function selectRingtone(ringtoneId, ringtoneName) {
  if (!window.AndroidAlarm || !window.AndroidAlarm.setSelectedRingtone) {
    showToast('⚠️ 当前环境不支持铃声选择');
    return;
  }
  
  try {
    window.AndroidAlarm.setSelectedRingtone(ringtoneId);
    showToast('✅ 已选择铃声：' + ringtoneName);
    
    // 重新加载列表以更新UI
    loadRingtones();
  } catch (e) {
    console.error('选择铃声失败:', e);
    showToast('⚠️ 选择铃声失败');
  }
}

/**
 * 更新显示的铃声名称
 */
function updateSelectedRingtoneName() {
  const badge = document.getElementById('selectedRingtoneName');
  if (!badge) return;
  
  if (!window.AndroidAlarm || !window.AndroidAlarm.getSelectedRingtone) {
    badge.textContent = '默认';
    return;
  }
  
  try {
    const selectedId = window.AndroidAlarm.getSelectedRingtone();
    
    // 如果是自定义铃声（通过系统选择器选的）
    if (selectedId === 'custom') {
      const customName = (window.AndroidAlarm.getCustomRingtoneName && window.AndroidAlarm.getCustomRingtoneName()) || '自定义';
      badge.textContent = customName;
      return;
    }
    
    // 获取铃声名称
    const ringtonesJson = window.AndroidAlarm.getAvailableRingtones();
    const ringtones = JSON.parse(ringtonesJson);
    const selected = ringtones.find(rt => rt.id === selectedId);
    
    badge.textContent = selected ? selected.name : '默认';
  } catch (e) {
    badge.textContent = '默认';
  }
}

/**
 * 停止试听
 */
function stopTestRingtone() {
  if (window.AndroidAlarm && window.AndroidAlarm.stopRingtone) {
    try {
      window.AndroidAlarm.stopRingtone();
    } catch (e) {
      console.error('停止试听失败:', e);
    }
  }
  currentlyPlayingRingtone = null;
  loadRingtones();
}

/**
 * 转义JS字符串（用于onclick等属性）
 */
function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// 页面加载时不自动加载铃声列表（折叠菜单，首次展开时才加载）
