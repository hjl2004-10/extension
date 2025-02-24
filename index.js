// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced } from "../../../../script.js";

// Keep track of where your extension is located, name should match repo name
const extensionName = "st-extension-example";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {};


 
// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // Updating settings in the UI
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

// This function is called when the extension settings are changed in the UI
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// This function is called when the button is clicked
function onButtonClick() {
  // You can do whatever you want here
  // Let's make a popup appear with the checked setting
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}

// This function is called when the extension is loaded
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $("#extensions_settings").append(settingsHtml);

  // These are examples of listening for events
  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);

  // Load settings when starting things up (if you have any)
  loadSettings();

  // 初始化其他设置
  initializeAdditionalSettings();

  initializeTextExtractionSettings();
  initializeVoiceUpload();
});

// 处理生图功能设置
async function loadImageSettings() {
    const url = localStorage.getItem('image_url') || '';
    const apiKey = localStorage.getItem('image_api_key') || '';
    document.getElementById('image_url').value = url;
    document.getElementById('image_api_key').value = apiKey;

    // 加载可用模型
    const models = await fetchAvailableModels();
    const modelSelect = document.getElementById('available_models');
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
}

document.getElementById('save_image_settings').addEventListener('click', () => {
    const url = document.getElementById('image_url').value;
    const apiKey = document.getElementById('image_api_key').value;
    localStorage.setItem('image_url', url);
    localStorage.setItem('image_api_key', apiKey);
});

document.getElementById('connect_image').addEventListener('click', () => {
    // 连接逻辑
});

// 处理语音功能设置
async function loadTTSSettings() {
    const url = localStorage.getItem('tts_url') || '';
    const apiKey = localStorage.getItem('tts_api_key') || '';
    document.getElementById('tts_url').value = url;
    document.getElementById('tts_api_key').value = apiKey;

    // 加载可用模型
    const models = await fetchAvailableModels();
    const modelSelect = document.getElementById('tts_models');
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });

    // 加载音色
    const voices = await fetchAvailableVoices();
    const voiceSelect = document.getElementById('voice_selection');
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice;
        option.textContent = voice;
        voiceSelect.appendChild(option);
    });
}

document.getElementById('save_tts_settings').addEventListener('click', () => {
    const url = document.getElementById('tts_url').value;
    const apiKey = document.getElementById('tts_api_key').value;
    localStorage.setItem('tts_url', url);
    localStorage.setItem('tts_api_key', apiKey);
});

document.getElementById('connect_tts').addEventListener('click', () => {
    // 连接逻辑
});

// 处理其他设置
function initializeAdditionalSettings() {
    // 播放速度设置
    const speedSlider = document.getElementById('playback_speed');
    const speedValue = document.getElementById('speed_value');
    
    speedSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        speedValue.textContent = `${value}x`;
        localStorage.setItem('tts_playback_speed', value);
    });
    
    // 音量设置
    const volumeSlider = document.getElementById('volume');
    const volumeValue = document.getElementById('volume_value');
    
    volumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        volumeValue.textContent = `${Math.round(value * 100)}%`;
        localStorage.setItem('tts_volume', value);
    });
    
    // 图片大小设置
    const sizeSelect = document.getElementById('image_size');
    sizeSelect.addEventListener('change', (e) => {
        localStorage.setItem('image_size', e.target.value);
    });
    
    // 生成频率限制
    const frequencyInput = document.getElementById('generation_frequency');
    frequencyInput.addEventListener('input', (e) => {
        localStorage.setItem('generation_frequency', e.target.value);
    });
    
    // 加载保存的设置
    loadSavedSettings();
}

function loadSavedSettings() {
    // 加载播放速度
    const savedSpeed = localStorage.getItem('tts_playback_speed') || '1';
    document.getElementById('playback_speed').value = savedSpeed;
    document.getElementById('speed_value').textContent = `${savedSpeed}x`;
    
    // 加载音量
    const savedVolume = localStorage.getItem('tts_volume') || '1';
    document.getElementById('volume').value = savedVolume;
    document.getElementById('volume_value').textContent = `${Math.round(savedVolume * 100)}%`;
    
    // 加载图片大小
    const savedSize = localStorage.getItem('image_size') || '512';
    document.getElementById('image_size').value = savedSize;
    
    // 加载生成频率
    const savedFrequency = localStorage.getItem('generation_frequency') || '5';
    document.getElementById('generation_frequency').value = savedFrequency;
}

// 处理文本截取设置
function initializeTextExtractionSettings() {
    // 加载保存的设置
    const imageStart = localStorage.getItem('image_text_start') || '（';
    const imageEnd = localStorage.getItem('image_text_end') || '）';
    const ttsStart = localStorage.getItem('tts_text_start') || '（';
    const ttsEnd = localStorage.getItem('tts_text_end') || '）';
    
    // 设置初始值
    document.getElementById('image_text_start').value = imageStart;
    document.getElementById('image_text_end').value = imageEnd;
    document.getElementById('tts_text_start').value = ttsStart;
    document.getElementById('tts_text_end').value = ttsEnd;
    
    // 添加事件监听
    document.getElementById('image_text_start').addEventListener('input', (e) => {
        localStorage.setItem('image_text_start', e.target.value);
    });
    document.getElementById('image_text_end').addEventListener('input', (e) => {
        localStorage.setItem('image_text_end', e.target.value);
    });
    document.getElementById('tts_text_start').addEventListener('input', (e) => {
        localStorage.setItem('tts_text_start', e.target.value);
    });
    document.getElementById('tts_text_end').addEventListener('input', (e) => {
        localStorage.setItem('tts_text_end', e.target.value);
    });
}

// 处理音色上传功能
async function initializeVoiceUpload() {
    // 加载可用模型到下拉框
    const models = await fetchAvailableModels();
    const modelSelect = document.getElementById('voice_model');
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    
    // 处理音色上传
    document.getElementById('upload_voice').addEventListener('click', async () => {
        const model = document.getElementById('voice_model').value;
        const file = document.getElementById('voice_file').files[0];
        const text = document.getElementById('voice_text').value;
        const name = document.getElementById('voice_name').value;
        
        if (!file || !text || !name) {
            toastr.error('请填写所有必要信息');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('model', model);
            formData.append('audio', file);
            formData.append('text', text);
            formData.append('name', name);
            
            const response = await fetch('https://api.siliconflow.cn/v1/audio/voices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('tts_api_key')}`
                },
                body: formData
            });
            
            if (response.ok) {
                toastr.success('音色上传成功');
                // 刷新音色列表
                await loadTTSSettings();
            } else {
                toastr.error('音色上传失败');
            }
        } catch (error) {
            console.error('音色上传错误:', error);
            toastr.error('音色上传出错');
        }
    });
}

// 初始化设置
loadImageSettings();
loadTTSSettings();
