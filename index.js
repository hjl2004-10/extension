import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

// 扩展配置
const extensionName = "extension";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 全局状态管理
const audioState = {
  isPlaying: false,
  lastProcessedMessageId: null,
  lastProcessedUserMessageId: null,
  processingTimeout: null,
  audioQueue: []
};

// 默认设置
const defaultSettings = {
  apiKey: "",
  apiUrl: "https://api.siliconflow.cn/v1",
  ttsModel: "FunAudioLLM/CosyVoice2-0.5B",
  ttsVoice: "alex",
  ttsSpeed: 1.0,
  ttsGain: 0,
  responseFormat: "mp3",
  sampleRate: 32000,
  imageModel: "",
  imageSize: "512",
  textStart: "（",
  textEnd: "）",
  generationFrequency: 5,
  autoPlay: true,
  autoPlayUser: false,
  customVoices: [] // 存储自定义音色列表
};

// TTS模型和音色配置
const TTS_MODELS = {
  "FunAudioLLM/CosyVoice2-0.5B": {
    name: "CosyVoice2-0.5B",
    voices: {
      "alex": "Alex (男声)",
      "anna": "Anna (女声)",
      "bella": "Bella (女声)",
      "benjamin": "Benjamin (男声)",
      "charles": "Charles (男声)",
      "claire": "Claire (女声)",
      "david": "David (男声)",
      "diana": "Diana (女声)"
    }
  }
};

// 加载设置
async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // 更新UI
  $("#siliconflow_api_key").val(extension_settings[extensionName].apiKey || "");
  $("#siliconflow_api_url").val(extension_settings[extensionName].apiUrl || defaultSettings.apiUrl);
  $("#tts_model").val(extension_settings[extensionName].ttsModel || defaultSettings.ttsModel);
  $("#tts_voice").val(extension_settings[extensionName].ttsVoice || defaultSettings.ttsVoice);
  $("#tts_speed").val(extension_settings[extensionName].ttsSpeed || defaultSettings.ttsSpeed);
  $("#tts_speed_value").text(extension_settings[extensionName].ttsSpeed || defaultSettings.ttsSpeed);
  $("#tts_gain").val(extension_settings[extensionName].ttsGain || defaultSettings.ttsGain);
  $("#tts_gain_value").text(extension_settings[extensionName].ttsGain || defaultSettings.ttsGain);
  $("#response_format").val(extension_settings[extensionName].responseFormat || defaultSettings.responseFormat);
  $("#sample_rate").val(extension_settings[extensionName].sampleRate || defaultSettings.sampleRate);
  $("#image_size").val(extension_settings[extensionName].imageSize || defaultSettings.imageSize);
  $("#image_text_start").val(extension_settings[extensionName].textStart || defaultSettings.textStart);
  $("#image_text_end").val(extension_settings[extensionName].textEnd || defaultSettings.textEnd);
  $("#generation_frequency").val(extension_settings[extensionName].generationFrequency || defaultSettings.generationFrequency);
  $("#auto_play_audio").prop("checked", extension_settings[extensionName].autoPlay !== false);
  $("#auto_play_user").prop("checked", extension_settings[extensionName].autoPlayUser === true);
  
  updateVoiceOptions();
}

// 更新音色选项
function updateVoiceOptions() {
  const model = $("#tts_model").val();
  const voiceSelect = $("#tts_voice");
  const currentValue = voiceSelect.val();
  voiceSelect.empty();
  
  // 添加预设音色
  if (TTS_MODELS[model] && TTS_MODELS[model].voices) {
    voiceSelect.append('<optgroup label="预设音色">');
    Object.entries(TTS_MODELS[model].voices).forEach(([value, name]) => {
      voiceSelect.append(`<option value="${value}">${name}</option>`);
    });
    voiceSelect.append('</optgroup>');
  }
  
  // 添加自定义音色
  const customVoices = extension_settings[extensionName].customVoices || [];
  console.log(`更新音色选项，自定义音色数量: ${customVoices.length}`);
  
  if (customVoices.length > 0) {
    voiceSelect.append('<optgroup label="自定义音色">');
    customVoices.forEach(voice => {
      // 尝试不同的字段名称
      const voiceName = voice.name || voice.customName || voice.custom_name || "未命名";
      const voiceUri = voice.uri || voice.id || voice.voice_id;
      console.log(`添加自定义音色: ${voiceName} -> ${voiceUri}`);
      voiceSelect.append(`<option value="${voiceUri}">${voiceName} (自定义)</option>`);
    });
    voiceSelect.append('</optgroup>');
  }
  
  // 恢复之前的选择或设置默认值
  if (currentValue && voiceSelect.find(`option[value="${currentValue}"]`).length > 0) {
    voiceSelect.val(currentValue);
  } else {
    voiceSelect.val(extension_settings[extensionName].ttsVoice || Object.keys(TTS_MODELS[model]?.voices || {})[0]);
  }
}

// 保存设置
function saveSettings() {
  extension_settings[extensionName].apiKey = $("#siliconflow_api_key").val();
  extension_settings[extensionName].apiUrl = $("#siliconflow_api_url").val();
  extension_settings[extensionName].ttsModel = $("#tts_model").val();
  extension_settings[extensionName].ttsVoice = $("#tts_voice").val();
  extension_settings[extensionName].ttsSpeed = parseFloat($("#tts_speed").val());
  extension_settings[extensionName].ttsGain = parseFloat($("#tts_gain").val());
  extension_settings[extensionName].responseFormat = $("#response_format").val();
  extension_settings[extensionName].sampleRate = parseInt($("#sample_rate").val());
  extension_settings[extensionName].imageSize = $("#image_size").val();
  extension_settings[extensionName].textStart = $("#image_text_start").val();
  extension_settings[extensionName].textEnd = $("#image_text_end").val();
  extension_settings[extensionName].generationFrequency = parseInt($("#generation_frequency").val());
  extension_settings[extensionName].autoPlay = $("#auto_play_audio").prop("checked");
  extension_settings[extensionName].autoPlayUser = $("#auto_play_user").prop("checked");
  
  saveSettingsDebounced();
  // 移除弹窗提示，改为控制台日志
  console.log("设置已保存");
}

// 测试连接
async function testConnection() {
  const apiKey = $("#siliconflow_api_key").val();
  
  if (!apiKey) {
    toastr.error("请先输入API密钥", "连接失败");
    return;
  }
  
  try {
    // 获取音色列表作为连接测试
    const response = await fetch(`${extension_settings[extensionName].apiUrl}/audio/voice/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      // 只更新状态，不显示弹窗
      $("#connection_status").text("已连接").css("color", "green");
      console.log("API连接成功");
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    toastr.error(`连接失败: ${error.message}`, "硅基流动插件");
    $("#connection_status").text("未连接").css("color", "red");
  }
}

// TTS功能
async function generateTTS(text) {
  const apiKey = extension_settings[extensionName].apiKey;
  
  if (!apiKey) {
    toastr.error("请先配置API密钥", "TTS错误");
    return;
  }
  
  if (!text) {
    toastr.error("文本不能为空", "TTS错误");
    return;
  }
  
  // 检查是否正在处理
  if (audioState.isPlaying) {
    console.log('音频正在处理中，跳过此次请求');
    return;
  }
  
  try {
    // 移除弹窗提示，只在控制台记录
    console.log("正在生成语音...");
    
    // 从页面实时获取所有参数
    const voiceValue = $("#tts_voice").val() || "alex";
    const speed = parseFloat($("#tts_speed").val()) || 1.0;
    const gain = parseFloat($("#tts_gain").val()) || 0;
    
    // 判断是自定义音色还是预设音色
    let voiceParam;
    if (voiceValue.startsWith("speech:")) {
      // 自定义音色，直接使用URI
      voiceParam = voiceValue;
    } else {
      // 预设音色，使用模型:音色格式
      voiceParam = `FunAudioLLM/CosyVoice2-0.5B:${voiceValue}`;
    }
    
    const requestBody = {
      model: "FunAudioLLM/CosyVoice2-0.5B",
      input: text,
      voice: voiceParam,
      response_format: "mp3",
      speed: speed,
      gain: gain
    };
    console.log('TTS请求参数:', {
      音色: voiceParam,
      语速: speed,
      音量: gain,
      文本: text.substring(0, 50) + '...'
    });
    
    const response = await fetch(`${extension_settings[extensionName].apiUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 创建音频元素播放
    const audio = new Audio(audioUrl);
    
    if (extension_settings[extensionName].autoPlay) {
      // 设置播放状态
      audioState.isPlaying = true;
      
      // 监听播放结束事件
      audio.addEventListener('ended', () => {
        audioState.isPlaying = false;
        console.log('音频播放完成');
      });
      
      audio.addEventListener('error', () => {
        audioState.isPlaying = false;
        console.log('音频播放错误');
      });
      
      // 播放音频
      audio.play().catch(err => {
        audioState.isPlaying = false;
        console.error('播放失败:', err);
      });
    }
    
    // 添加下载按钮
    const downloadLink = $(`<a href="${audioUrl}" download="tts_output.${extension_settings[extensionName].responseFormat}">下载音频</a>`);
    $("#tts_output").empty().append(downloadLink);
    
    // 移除成功提示，只在控制台记录
    console.log("语音生成成功！");
    
    return audioUrl;
  } catch (error) {
    console.error("TTS Error:", error);
    toastr.error(`语音生成失败: ${error.message}`, "TTS错误");
  }
}

// 监听消息事件，自动提取文本并生成语音
function setupMessageListener() {
  console.log('设置消息监听器');
  console.log('事件类型:', event_types);
  console.log('eventSource 对象:', eventSource);
  
  // 测试事件是否正常触发
  try {
    // 测试监听所有消息事件
    console.log('尝试监听所有消息相关事件...');
    
    // 监听消息添加事件
    if (event_types.MESSAGE_SENT) {
      eventSource.on(event_types.MESSAGE_SENT, () => {
        console.log('检测到MESSAGE_SENT事件');
      });
    }
    
    // 监听消息接收事件
    if (event_types.MESSAGE_RECEIVED) {
      eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        console.log('检测到MESSAGE_RECEIVED事件');
      });
    }
    
    // 监听聊天更新事件  
    if (event_types.CHAT_CHANGED) {
      eventSource.on(event_types.CHAT_CHANGED, () => {
        console.log('检测到CHAT_CHANGED事件');
      });
    }
  } catch (error) {
    console.error('设置测试监听器出错:', error);
  }
  
  // 监听SillyTavern的消息事件
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (messageId) => {
    console.log('角色消息渲染:', messageId);
    
    // 防止重复处理同一条消息
    if (audioState.lastProcessedMessageId === messageId) {
      console.log('消息已处理，跳过:', messageId);
      return;
    }
    
    console.log('新消息，准备处理:', messageId);
    
    // 检查是否开启自动朗读
    const autoPlay = $("#auto_play_audio").prop("checked");
    if (!autoPlay) {
      console.log('自动朗读未开启');
      return;
    }
    
    // 清除之前的延时器
    if (audioState.processingTimeout) {
      clearTimeout(audioState.processingTimeout);
    }
    
    // 使用防抖处理，等待消息完全渲染
    audioState.processingTimeout = setTimeout(() => {
      console.log('延时处理开始:', messageId);
      // 再次检查是否已处理
      if (audioState.lastProcessedMessageId === messageId) {
        console.log('消息在延迟期间已被处理，跳过');
        return;
      }
      
      // 标记为已处理
      audioState.lastProcessedMessageId = messageId;
      console.log('处理消息:', messageId);
      const messageElement = $(`.mes[mesid="${messageId}"]`);
      console.log('查找消息元素:', messageElement.length > 0 ? '找到' : '未找到');
      
      const message = messageElement.find('.mes_text').text();
      console.log('消息内容长度:', message ? message.length : 0);
      
      if (!message) {
        console.log('消息内容为空');
        return;
      }
      
      const textStart = $("#image_text_start").val();
      const textEnd = $("#image_text_end").val();
      
      console.log('检查标记:', { textStart, textEnd, 消息内容: message.substring(0, 100) });
      
      if (textStart && textEnd) {
        let extractedTexts = [];
        
        // 添加调试日志
        console.log('原始消息:', message);
        console.log('消息中的引号位置:');
        for (let i = 0; i < message.length; i++) {
          if (message[i] === '"' || message[i] === '"' || message[i] === '"' || message[i] === '"') {
            console.log(`位置${i}: "${message[i]}" (字符码: ${message[i].charCodeAt(0)})`);
          }
        }
        
        // 判断开始和结束标记是否相同（如英文引号）
        if (textStart === textEnd) {
          // 相同标记：使用更智能的配对算法
          let insideQuote = false;
          let currentText = '';
          let pairCount = 0;
          
          for (let i = 0; i < message.length; i++) {
            const char = message[i];
            
            if (char === textStart) {
              if (!insideQuote) {
                // 开始引号
                console.log(`位置${i}: 开始第${pairCount + 1}对引号`);
                insideQuote = true;
                currentText = '';
              } else {
                // 结束引号
                console.log(`位置${i}: 结束第${pairCount + 1}对引号，内容: "${currentText}"`);
                if (currentText.trim()) {
                  extractedTexts.push(currentText.trim());
                  pairCount++;
                  console.log(`提取第${pairCount}对引号内容:`, currentText.trim());
                }
                insideQuote = false;
                currentText = '';
              }
            } else if (insideQuote) {
              currentText += char;
            }
          }
        } else {
          // 不同标记：使用正则表达式
          const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedStart = escapeRegex(textStart);
          const escapedEnd = escapeRegex(textEnd);
          
          const regex = new RegExp(`${escapedStart}(.*?)${escapedEnd}`, 'g');
          const matches = message.match(regex);
          
          if (matches && matches.length > 0) {
            console.log(`找到${matches.length}个标记内容`);
            
            matches.forEach(match => {
              const cleanText = match.replace(textStart, '').replace(textEnd, '').trim();
              if (cleanText) {
                extractedTexts.push(cleanText);
              }
            });
          }
        }
        
        if (extractedTexts.length > 0) {
          const finalText = extractedTexts.join(' ');
          console.log('自动朗读标记内文本:', finalText);
          generateTTS(finalText);
          return; // 重要：找到标记就不读全文
        }
        
        // 设置了标记但没找到匹配内容，不朗读
        console.log('设置了标记但未找到匹配内容，跳过朗读');
      } else {
        // 没有设置标记，朗读全文
        console.log('未设置标记，自动朗读全文:', message.substring(0, 100));
        console.log('开始生成TTS...');
        generateTTS(message);
      }
    }, 1000); // 延迟1000ms等待DOM完全更新，包括世界书和COT
  });
  
  // 用户消息监听
  eventSource.on(event_types.USER_MESSAGE_RENDERED, async (messageId) => {
    console.log('用户消息渲染:', messageId);
    
    // 防止重复处理同一条用户消息
    if (audioState.lastProcessedUserMessageId === messageId) {
      console.log('用户消息已处理，跳过:', messageId);
      return;
    }
    
    const autoPlayUser = $("#auto_play_user").prop("checked");
    if (!autoPlayUser) {
      console.log('用户消息自动朗读未开启');
      return;
    }
    console.log('用户消息自动朗读已开启');
    
    // 标记为已处理
    audioState.lastProcessedUserMessageId = messageId;
    
    setTimeout(() => {
      console.log('用户消息延时处理开始:', messageId);
      const messageElement = $(`.mes[mesid="${messageId}"]`);
      console.log('用户消息元素:', messageElement.length > 0 ? '找到' : '未找到');
      
      const message = messageElement.find('.mes_text').text();
      console.log('用户消息内容长度:', message ? message.length : 0);
      if (!message) {
        console.log('用户消息内容为空');
        return;
      }
      
      const textStart = $("#image_text_start").val();
      const textEnd = $("#image_text_end").val();
      
      console.log('用户消息 - 检查标记:', { textStart, textEnd, 消息内容: message.substring(0, 100) });
      
      if (textStart && textEnd) {
        let extractedTexts = [];
        
        // 添加调试日志
        console.log('用户原始消息:', message);
        console.log('用户消息中的引号位置:');
        for (let i = 0; i < message.length; i++) {
          if (message[i] === '"' || message[i] === '"' || message[i] === '"' || message[i] === '"') {
            console.log(`位置${i}: "${message[i]}" (字符码: ${message[i].charCodeAt(0)})`);
          }
        }
        
        // 判断开始和结束标记是否相同（如英文引号）
        if (textStart === textEnd) {
          // 相同标记：使用更智能的配对算法
          let insideQuote = false;
          let currentText = '';
          let pairCount = 0;
          
          for (let i = 0; i < message.length; i++) {
            const char = message[i];
            
            if (char === textStart) {
              if (!insideQuote) {
                // 开始引号
                console.log(`用户消息 - 位置${i}: 开始第${pairCount + 1}对引号`);
                insideQuote = true;
                currentText = '';
              } else {
                // 结束引号
                console.log(`用户消息 - 位置${i}: 结束第${pairCount + 1}对引号，内容: "${currentText}"`);
                if (currentText.trim()) {
                  extractedTexts.push(currentText.trim());
                  pairCount++;
                  console.log(`用户消息 - 提取第${pairCount}对引号内容:`, currentText.trim());
                }
                insideQuote = false;
                currentText = '';
              }
            } else if (insideQuote) {
              currentText += char;
            }
          }
        } else {
          // 不同标记：使用正则表达式
          const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedStart = escapeRegex(textStart);
          const escapedEnd = escapeRegex(textEnd);
          
          const regex = new RegExp(`${escapedStart}(.*?)${escapedEnd}`, 'g');
          const matches = message.match(regex);
          
          if (matches && matches.length > 0) {
            console.log(`用户消息 - 找到${matches.length}个标记内容`);
            
            matches.forEach(match => {
              const cleanText = match.replace(textStart, '').replace(textEnd, '').trim();
              if (cleanText) {
                extractedTexts.push(cleanText);
              }
            });
          }
        }
        
        if (extractedTexts.length > 0) {
          const finalText = extractedTexts.join(' ');
          console.log('用户消息 - 自动朗读标记内文本:', finalText);
          generateTTS(finalText);
          return;
        }
        
        // 设置了标记但没找到匹配内容，不朗读
        console.log('用户消息 - 设置了标记但未找到匹配内容，跳过朗读');
      } else {
        // 没有设置标记，朗读全文
        console.log('用户消息 - 未设置标记，自动朗读全文:', message.substring(0, 100));
        generateTTS(message);
      }
    }, 500);
  });
}

// 克隆音色功能
async function uploadVoice() {
  const apiKey = extension_settings[extensionName].apiKey;
  const voiceName = $("#clone_voice_name").val();
  const voiceText = $("#clone_voice_text").val();
  const audioFile = $("#clone_voice_audio")[0].files[0];
  
  if (!apiKey) {
    toastr.error("请先配置API密钥", "克隆音色错误");
    return;
  }
  
  if (!voiceName || !voiceText || !audioFile) {
    toastr.error("请填写音色名称、参考文本并选择音频文件", "克隆音色错误");
    return;
  }
  
  // 验证音色名称格式
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (!namePattern.test(voiceName)) {
    toastr.error("音色名称只能包含英文字母、数字、下划线和连字符", "格式错误");
    return;
  }
  
  if (voiceName.length > 64) {
    toastr.error("音色名称不能超过64个字符", "格式错误");
    return;
  }
  
  try {
    console.log("开始上传音色...");
    
    // 根据API文档，有两种方式上传：base64或文件
    // 先尝试用base64方式
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const base64Audio = e.target.result; // 这将包含 data:audio/mpeg;base64,xxx 格式
        
        // 使用JSON格式发送，因为API文档显示可以用base64
        const requestBody = {
          model: 'FunAudioLLM/CosyVoice2-0.5B',
          customName: voiceName,
          text: voiceText,
          audio: base64Audio // 直接使用完整的base64字符串，包含data:audio/mpeg;base64头
        };
        
        const response = await fetch(`${extension_settings[extensionName].apiUrl}/uploads/audio/voice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error response:", errorText);
          
          // 如果JSON方式失败，尝试FormData方式
          console.log("JSON上传失败，尝试FormData方式...");
          
          const formData = new FormData();
          formData.append('model', 'FunAudioLLM/CosyVoice2-0.5B');
          formData.append('customName', voiceName);
          formData.append('text', voiceText);
          
          // 创建一个Blob对象从base64
          const base64Data = base64Audio.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: audioFile.type});
          
          formData.append('audio', blob, audioFile.name);
          
          const response2 = await fetch(`${extension_settings[extensionName].apiUrl}/uploads/audio/voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            body: formData
          });
          
          if (!response2.ok) {
            throw new Error(`HTTP ${response2.status}: ${await response2.text()}`);
          }
          
          const data = await response2.json();
          console.log("音色上传成功(FormData):", data);
        } else {
          const data = await response.json();
          console.log("音色上传成功(JSON):", data);
        }
        
        // 清空输入
        $("#clone_voice_name").val("");
        $("#clone_voice_text").val("");
        $("#clone_voice_audio").val("");
        
        toastr.success(`音色 "${voiceName}" 克隆成功！`, "克隆音色");
        
        // 刷新音色列表
        await loadCustomVoices();
        
      } catch (error) {
        console.error("Voice Clone Error:", error);
        toastr.error(`音色克隆失败: ${error.message}`, "克隆音色错误");
      }
    };
    
    reader.readAsDataURL(audioFile);
    
  } catch (error) {
    console.error("Voice Clone Error:", error);
    toastr.error(`音色克隆失败: ${error.message}`, "克隆音色错误");
  }
}

// 获取自定义音色列表
async function loadCustomVoices() {
  const apiKey = extension_settings[extensionName].apiKey;
  
  if (!apiKey) return;
  
  try {
    const response = await fetch(`${extension_settings[extensionName].apiUrl}/audio/voice/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log("自定义音色列表:", data);
    
    // 保存到设置 - 注意API返回的是result不是results
    extension_settings[extensionName].customVoices = data.result || data.results || [];
    
    // 打印第一个音色的结构以便调试
    if (extension_settings[extensionName].customVoices.length > 0) {
      console.log("第一个自定义音色结构:", extension_settings[extensionName].customVoices[0]);
    }
    
    // 更新UI显示
    updateCustomVoicesList();
    updateVoiceOptions();
    
  } catch (error) {
    console.error("Load Custom Voices Error:", error);
  }
}

// 更新自定义音色列表显示
function updateCustomVoicesList() {
  const customVoices = extension_settings[extensionName].customVoices || [];
  const listContainer = $("#custom_voices_list");
  
  if (customVoices.length === 0) {
    listContainer.html("<small>暂无自定义音色</small>");
    return;
  }
  
  let html = "";
  customVoices.forEach(voice => {
    const voiceName = voice.name || voice.customName || voice.custom_name || "未命名";
    const voiceUri = voice.uri || voice.id || voice.voice_id;
    html += `
      <div class="custom-voice-item" style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
        <span>${voiceName}</span>
        <button class="menu_button delete-voice" data-uri="${voiceUri}" data-name="${voiceName}" style="float: right; padding: 2px 8px; font-size: 12px;">删除</button>
      </div>
    `;
  });
  
  listContainer.html(html);
}

// 删除自定义音色
async function deleteCustomVoice(uri, name) {
  const apiKey = extension_settings[extensionName].apiKey;
  
  if (!apiKey) {
    toastr.error("请先配置API密钥", "删除音色错误");
    return;
  }
  
  if (!confirm(`确定要删除音色 "${name}" 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`${extension_settings[extensionName].apiUrl}/audio/voice/deletions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uri: uri })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    toastr.success(`音色 "${name}" 已删除`, "删除成功");
    
    // 刷新列表
    await loadCustomVoices();
    
  } catch (error) {
    console.error("Delete Voice Error:", error);
    toastr.error(`删除失败: ${error.message}`, "删除音色错误");
  }
}

// jQuery加载时初始化
jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
  $("#extensions_settings").append(settingsHtml);
  
  // Inline drawer 折叠/展开功能 - 使用延迟绑定
  setTimeout(() => {
    $('.siliconflow-extension-settings .inline-drawer-toggle').each(function() {
      $(this).off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $header = $(this);
        const $icon = $header.find('.inline-drawer-icon');
        const $content = $header.next('.inline-drawer-content');
        const isOpen = $content.data('open') === true;
        
        if (isOpen) {
          // 收起
          $content.data('open', false);
          $content.hide();
          $icon.removeClass('down');
        } else {
          // 展开
          $content.data('open', true);
          $content.show();
          $icon.addClass('down');
        }
      });
    });
  }, 100);
  
  // 绑定事件
  $("#save_siliconflow_settings").on("click", saveSettings);
  
  // 克隆音色功能事件
  $("#upload_voice").on("click", uploadVoice);
  $("#refresh_custom_voices").on("click", loadCustomVoices);
  
  // 删除音色事件（使用事件委托）
  $(document).on("click", ".delete-voice", function() {
    const uri = $(this).data("uri");
    const name = $(this).data("name");
    deleteCustomVoice(uri, name);
  });
  
  // 自动保存复选框状态
  $("#auto_play_audio").on("change", function() {
    extension_settings[extensionName].autoPlay = $(this).prop("checked");
    saveSettingsDebounced();
    console.log("自动朗读角色消息:", $(this).prop("checked"));
  });
  
  $("#auto_play_user").on("change", function() {
    extension_settings[extensionName].autoPlayUser = $(this).prop("checked");
    saveSettingsDebounced();
    console.log("自动朗读用户消息:", $(this).prop("checked"));
  });
  
  // 标记设置自动保存
  $("#image_text_start, #image_text_end").on("input", function() {
    extension_settings[extensionName].textStart = $("#image_text_start").val();
    extension_settings[extensionName].textEnd = $("#image_text_end").val();
    saveSettingsDebounced();
  });
  $("#test_siliconflow_connection").on("click", testConnection);
  $("#tts_model").on("change", updateVoiceOptions);
  $("#tts_voice").on("change", function() {
    extension_settings[extensionName].ttsVoice = $(this).val();
    console.log("选择的音色:", $(this).val());
  });
  $("#tts_speed").on("input", function() {
    $("#tts_speed_value").text($(this).val());
  });
  $("#tts_gain").on("input", function() {
    $("#tts_gain_value").text($(this).val());
  });
  
  // TTS测试按钮
  $("#test_tts").on("click", async function() {
    // 先保存当前选择的音色
    extension_settings[extensionName].ttsVoice = $("#tts_voice").val();
    const testText = $("#tts_test_text").val() || "你好，这是一个测试语音。";
    await generateTTS(testText);
  });
  
  // 加载设置
  await loadSettings();
  
  // 加载自定义音色列表
  await loadCustomVoices();
  
  // 设置消息监听器
  setupMessageListener();
  
  console.log("硅基流动插件已加载");
  console.log("自动朗读功能已启用，请在控制台查看调试信息");
  console.log('事件源:', eventSource);
  console.log('事件类型:', event_types);
  console.log('角色消息事件:', event_types.CHARACTER_MESSAGE_RENDERED);
  console.log('用户消息事件:', event_types.USER_MESSAGE_RENDERED);
});

export { generateTTS };