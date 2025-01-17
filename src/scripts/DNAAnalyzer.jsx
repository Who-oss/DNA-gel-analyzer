import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, Label } from 'recharts';
import './DNAAnalyzer.css';

function DNAAnalyzer() {
  // ...原有状态定义保持不变...
  const [image, setImage] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [regions, setRegions] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [results, setResults] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [profileData, setProfileData] = useState([]);
  const [baselinePoints, setBaselinePoints] = useState([]);
  const [isSettingBaseline, setIsSettingBaseline] = useState(false);
  const [plotWidth, setPlotWidth] = useState(800);
  const [plotHeight, setPlotHeight] = useState(400);
  const [horizontalZoom, setHorizontalZoom] = useState(1);
  const [verticalZoom, setVerticalZoom] = useState(1);
  const [hoverPoint, setHoverPoint] = useState(null);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // 添加新的状态来跟踪是否正在编辑现有区域
  const [editingRegionIndex, setEditingRegionIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 添加新的状态
  const [showEfficiencyOnImage, setShowEfficiencyOnImage] = useState(false);
  const [efficiencyLabels, setEfficiencyLabels] = useState([]); // 存储标签位置和样式
  const [isDraggingLabel, setIsDraggingLabel] = useState(false);
  const [draggingLabelIndex, setDraggingLabelIndex] = useState(null);
  const [labelColor, setLabelColor] = useState('#00ff00');
  const [labelFontSize, setLabelFontSize] = useState(16);

  // 添加新的状态
  const [showRegionLabels, setShowRegionLabels] = useState(false);
  const [regionLabels, setRegionLabels] = useState([]); // 存储region标签位置和样式
  const [isDraggingRegionLabel, setIsDraggingRegionLabel] = useState(false);
  const [draggingRegionLabelIndex, setDraggingRegionLabelIndex] = useState(null);
  const [regionLabelColor, setRegionLabelColor] = useState('#ff0000');
  const [regionLabelFontSize, setRegionLabelFontSize] = useState(16);
  const [editingLabelText, setEditingLabelText] = useState(null); // {index: number, text: string}

  // 添加lastClickTime状态
  const [lastClickTime, setLastClickTime] = useState(0);

  // 添加缺失的 handleImageUpload 函数
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          drawImage();
        };
        img.src = e.target.result;
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  // 添加缺失的 drawImage 函数
  function drawImage() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (img) {
      // 计算缩放后的尺寸
      const scaledWidth = img.width * horizontalZoom;
      const scaledHeight = img.height * verticalZoom;
      
      // 设置画布尺寸
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // 清除画布
      ctx.clearRect(0, 0, scaledWidth, scaledHeight);

      // 绘制原始图像
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      
      // 转换为灰度
      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      
      // 应用亮度和对比度
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';

      // 绘制区域和标签
      regions.forEach((region, index) => {
        if (!showEfficiencyOnImage) {
          ctx.strokeStyle = index === selectedRegion ? '#ff0000' : '#00ff00';
          ctx.lineWidth = 2;
          const scaledRegion = {
            x: region.x * horizontalZoom,
            y: region.y * verticalZoom,
            width: region.width * horizontalZoom,
            height: region.height * verticalZoom
          };
          ctx.strokeRect(
            scaledRegion.x,
            scaledRegion.y,
            scaledRegion.width,
            scaledRegion.height
          );
          
          if (!showRegionLabels) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            ctx.fillText(
              `Region ${index + 1}`,
              scaledRegion.x,
              scaledRegion.y - 5
            );
          }
        }
      });

      // 绘制region标签
      if (showRegionLabels && regionLabels.length > 0) {
        regionLabels.forEach((label) => {
          ctx.fillStyle = label.color || regionLabelColor;
          ctx.font = `${label.fontSize || regionLabelFontSize}px Arial`;
          ctx.fillText(
            label.text || `${numberToChineseNumber(label.index + 1)}`,
            label.x * horizontalZoom,
            label.y * verticalZoom
          );
        });
      }

      // 绘制效率标签
      if (showEfficiencyOnImage && efficiencyLabels.length > 0) {
        efficiencyLabels.forEach((label) => {
          if (results[label.index]) {
            ctx.fillStyle = label.color || labelColor;
            ctx.font = `${label.fontSize || labelFontSize}px Arial`;
            const text = `Clv: ${(results[label.index].efficiency * 100).toFixed(2)}%`;
            ctx.fillText(
              text,
              label.x * horizontalZoom,
              label.y * verticalZoom
            );
          }
        });
      }
    }
  }

  // 修改handleMouseDown函数
  function handleMouseDown(e) {
    if (isSettingBaseline) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / horizontalZoom;
    const y = (e.clientY - rect.top) / verticalZoom;

    if (showRegionLabels) {
      handleRegionLabelMouseDown(e);
    } else if (showEfficiencyOnImage) {
      handleLabelMouseDown(e);
    } else {
      // 检查是否点击了已有的区域
      const clickedRegionIndex = regions.findIndex(region => 
        x >= region.x && x <= region.x + region.width &&
        y >= region.y && y <= region.y + region.height
      );

      if (clickedRegionIndex !== -1) {
        setEditingRegionIndex(clickedRegionIndex);
        setIsDragging(true);
        setDragOffset({
          x: x - regions[clickedRegionIndex].x,
          y: y - regions[clickedRegionIndex].y
        });
      } else {
        setIsDrawing(true);
        setStartPoint({ x, y });
      }
    }
  }

  // 修改handleMouseMove函数
  function handleMouseMove(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / horizontalZoom;
    const y = (e.clientY - rect.top) / verticalZoom;

    if (isDraggingRegionLabel && draggingRegionLabelIndex !== null) {
      // 移动region标签
      const newLabels = [...regionLabels];
      newLabels[draggingRegionLabelIndex] = {
        ...newLabels[draggingRegionLabelIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setRegionLabels(newLabels);
      drawImage();  // 立即重绘
    } else if (isDraggingLabel && draggingLabelIndex !== null) {
      // 移动效率标签
      const newLabels = [...efficiencyLabels];
      newLabels[draggingLabelIndex] = {
        ...newLabels[draggingLabelIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setEfficiencyLabels(newLabels);
      drawImage();  // 立即重绘
    } else if (isDragging && editingRegionIndex !== null) {
      // 移动区域
      const newRegions = [...regions];
      newRegions[editingRegionIndex] = {
        ...newRegions[editingRegionIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setRegions(newRegions);
      drawImage();
    } else if (isDrawing) {
      // 绘制新区域
      drawImage();
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.scale(horizontalZoom, verticalZoom);
      ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
      ctx.scale(1/horizontalZoom, 1/verticalZoom);
    }
  }

  // 修改handleMouseUp函数
  function handleMouseUp(e) {
    if (isDraggingRegionLabel) {
      setIsDraggingRegionLabel(false);
      setDraggingRegionLabelIndex(null);
    } else if (isDraggingLabel) {
      setIsDraggingLabel(false);
      setDraggingLabelIndex(null);
    } else if (isDragging) {
      setIsDragging(false);
      setEditingRegionIndex(null);
    } else if (isDrawing) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / horizontalZoom;
      const y = (e.clientY - rect.top) / verticalZoom;
      const newRegion = {
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y)
      };
      const newRegions = [...regions, newRegion];
      setRegions(newRegions);
      setIsDrawing(false);
      drawImage();
      handleRegionClick(newRegions.length - 1);
    }
  }

  function handleRegionClick(index) {
    if (index < 0 || index >= regions.length) return;
    
    setSelectedRegion(index);
    const region = regions[index];
    if (!region) return;
    
    const profile = getIntensityProfile(region);
    const chartData = profile.map((value, index) => ({
      position: index,
      intensity: value
    }));
    setProfileData(chartData);
    setBaselinePoints([]);
  }

  function getIntensityProfile(region) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(
      region.x * horizontalZoom,
      region.y * verticalZoom,
      region.width * horizontalZoom,
      region.height * verticalZoom
    );
    const data = imageData.data;

    // 创建与区域高度相匹配的数组
    let profile = new Array(Math.floor(region.height)).fill(0);
    
    // 计算每行的平均强度
    for (let y = 0; y < region.height; y++) {
      let sum = 0;
      let count = 0;
      
      // 对每一行进行采样
      for (let x = 0; x < region.width * horizontalZoom; x++) {
        const scaledY = Math.floor(y * verticalZoom);
        const idx = (scaledY * Math.floor(region.width * horizontalZoom) + x) * 4;
        if (idx >= 0 && idx < data.length) {
          const gray = 255 - (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sum += gray;
          count++;
        }
      }
      
      profile[y] = count > 0 ? sum / count : 0;
    }

    return smoothArray(profile, 5);
  }

  // 智能数据点查找功能
  function findNearestDataPoint(clickX, clickY, profileData) {
    if (!profileData.length) return null;
    
    const searchRadius = 20;
    let nearestPoint = null;
    let minDistance = Infinity;
    
    profileData.forEach(point => {
      const dx = point.position - clickX;
      const dy = point.intensity - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance < searchRadius) {
        minDistance = distance;
        nearestPoint = point;
      }
    });
    
    return nearestPoint;
  }

  // Chart交互处理
  function handleChartClick(e) {
    if (!isSettingBaseline || !e || !e.activeLabel) return;

    const clickedPosition = e.activeLabel;
    const clickedData = profileData.find(point => point.position === clickedPosition);
    
    if (clickedData) {
      const newPoint = {
        position: clickedData.position,
        intensity: clickedData.intensity
      };
      setBaselinePoints(points => [...points, newPoint]);
      // 强制重新渲染
      drawImage();
    }
  }

  function handleChartMouseMove(e) {
    if (!isSettingBaseline || !e?.activePayload?.[0]) {
      setHoverPoint(null);
      return;
    }
    
    const mouseX = e.activePayload[0].payload.position;
    const mouseY = e.activePayload[0].payload.intensity;
    
    const nearestPoint = findNearestDataPoint(mouseX, mouseY, profileData);
    setHoverPoint(nearestPoint);
  }

  // 添加分析区域函数
  function analyzeRegion() {
    if (selectedRegion === null || baselinePoints.length < 2) return;

    const profile = getIntensityProfile(regions[selectedRegion]);
    let peaks = [];
    for (let i = 1; i < profile.length - 1; i++) {
      if (profile[i] > profile[i - 1] && profile[i] > profile[i + 1]) {
        peaks.push({ position: i, intensity: profile[i] });
      }
    }
    
    peaks.sort((a, b) => b.intensity - a.intensity);
    peaks = peaks.slice(0, 2);

    if (peaks.length >= 2) {
      const areas = peaks.map(peak => {
        let area = 0;
        let left = peak.position;
        let right = peak.position;

        while (left > 0 && profile[left] > profile[left - 1]) left--;
        while (right < profile.length - 1 && profile[right] > profile[right + 1]) right++;

        for (let i = left; i <= right; i++) {
          const baseline = calculateBaseline(i);
          area += Math.max(0, profile[i] - baseline);
        }

        return area;
      });

      const efficiency = areas[1] / (areas[0] + areas[1]);
      setResults(prev => {
        const newResults = [...prev];
        newResults[selectedRegion] = {
          region: selectedRegion + 1,
          efficiency: efficiency
        };
        return newResults;
      });

      // 如果当前正在显示效率标签，更新对应标签
      if (showEfficiencyOnImage) {
        setEfficiencyLabels(prev => {
          const newLabels = [...prev];
          const labelIndex = newLabels.findIndex(label => label.index === selectedRegion);
          if (labelIndex === -1) {
            // 如果标签不存在，添加新标签
            newLabels.push({
              x: regions[selectedRegion].x,
              y: regions[selectedRegion].y + regions[selectedRegion].height + 20,
              color: labelColor,
              fontSize: labelFontSize,
              index: selectedRegion
            });
          }
          return newLabels;
        });
      }
      
      setTimeout(() => drawImage(), 0);
    }
  }

  // 其他辅助函数
  function smoothArray(array, windowSize) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowSize); j < Math.min(array.length, i + windowSize + 1); j++) {
        sum += array[j];
        count++;
      }
      result[i] = sum / count;
    }
    return result;
  }

  function calculateBaseline(position) {
    if (baselinePoints.length < 2) return 0;
    
    let left = baselinePoints[0];
    let right = baselinePoints[baselinePoints.length - 1];
    
    for (let i = 0; i < baselinePoints.length - 1; i++) {
      if (baselinePoints[i].position <= position && baselinePoints[i + 1].position >= position) {
        left = baselinePoints[i];
        right = baselinePoints[i + 1];
        break;
      }
    }

    const slope = (right.intensity - left.intensity) / (right.position - left.position);
    return left.intensity + slope * (position - left.position);
  }

  // 添加删除区域的功能
  function deleteRegion(index) {
    const newRegions = regions.filter((_, i) => i !== index);
    setRegions(newRegions);
    setSelectedRegion(null);
    setProfileData([]);
    setBaselinePoints([]);
    drawImage();
  }

  // 添加标签拖动处理函数
  function handleLabelMouseDown(e) {
    if (!showEfficiencyOnImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / horizontalZoom;
    const y = (e.clientY - rect.top) / verticalZoom;

    // 检查是否点击了标签
    const clickedLabelIndex = efficiencyLabels.findIndex(label => {
      if (!results[label.index]) return false;
      const labelWidth = ctx.measureText(`Clv: ${(results[label.index].efficiency * 100).toFixed(2)}%`).width;
      return x >= label.x && x <= label.x + labelWidth &&
             y >= label.y - labelFontSize && y <= label.y;
    });

    if (clickedLabelIndex !== -1) {
      setIsDraggingLabel(true);
      setDraggingLabelIndex(clickedLabelIndex);
      setDragOffset({
        x: x - efficiencyLabels[clickedLabelIndex].x,
        y: y - efficiencyLabels[clickedLabelIndex].y
      });
    }
  }

  // 添加切换效率显示的函数
  function toggleEfficiencyDisplay() {
    if (!showEfficiencyOnImage) {
      const newLabels = regions.map((region, index) => ({
        x: region.x,
        y: region.y + region.height + 20,
        color: labelColor,
        fontSize: labelFontSize,
        index,
        draggable: true  // 添加可拖动标记
      })).filter((_, index) => results[index]);
      setEfficiencyLabels(newLabels);
    }
    setShowEfficiencyOnImage(prev => !prev);
    drawImage();
  }

  // 添加中文数字转换函数
  function numberToChineseNumber(num) {
    const symbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    return symbols[num - 1] || num.toString();
  }

  // 添加region标签拖动处理函数
  function handleRegionLabelMouseDown(e) {
    if (!showRegionLabels) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / horizontalZoom;
    const y = (e.clientY - rect.top) / verticalZoom;

    // 检查是否点击了标签
    const clickedLabelIndex = regionLabels.findIndex(label => {
      const text = label.text || `${numberToChineseNumber(label.index + 1)}`;
      const labelWidth = ctx.measureText(text).width;
      return x >= label.x && x <= label.x + labelWidth &&
             y >= label.y - regionLabelFontSize && y <= label.y;
    });

    if (clickedLabelIndex !== -1) {
      // 检查是否双击（用于编辑文本）
      const now = Date.now();
      if (now - lastClickTime < 300) { // 300ms内的双击
        setEditingLabelText({
          index: clickedLabelIndex,
          text: regionLabels[clickedLabelIndex].text || `${numberToChineseNumber(regionLabels[clickedLabelIndex].index + 1)}`
        });
        return;
      }
      setLastClickTime(now);

      setIsDraggingRegionLabel(true);
      setDraggingRegionLabelIndex(clickedLabelIndex);
      setDragOffset({
        x: x - regionLabels[clickedLabelIndex].x,
        y: y - regionLabels[clickedLabelIndex].y
      });
    }
  }

  // 添加切换region标签显示的函数
  function toggleRegionLabels() {
    if (!showRegionLabels) {
      const newLabels = regions.map((region, index) => ({
        x: region.x,
        y: region.y - 10,
        color: regionLabelColor,
        fontSize: regionLabelFontSize,
        index,
        text: '',
        draggable: true  // 添加可拖动标记
      }));
      setRegionLabels(newLabels);
    }
    setShowRegionLabels(prev => !prev);
    drawImage();
  }

  // 添加缺失的效果更新
  useEffect(() => {
    if (image) {
      drawImage();
    }
  }, [
    brightness, 
    contrast, 
    regions, 
    selectedRegion, 
    horizontalZoom, 
    verticalZoom, 
    showEfficiencyOnImage, 
    efficiencyLabels, 
    showRegionLabels, 
    regionLabels,
    labelColor, 
    labelFontSize,
    regionLabelColor,
    regionLabelFontSize
  ]);

  // 添加一个通用的输入验证函数
  function validateNumberInput(value, min, max) {
    const num = Number(value);
    if (isNaN(num)) return min;
    return Math.min(Math.max(num, min), max);
  }

  // 添加删除基线点的函数
  function handleBaselinePointDelete(index) {
    setBaselinePoints(points => points.filter((_, i) => i !== index));
  }

  // 确保 profileData 的格式正确
  console.log('Profile Data:', profileData);
  console.log('Baseline Points:', baselinePoints);

  useEffect(() => {
    console.log('Chart dimensions:', {
      width: 460,
      height: 600,
      margin: { top: 20, right: 30, left: 40, bottom: 20 }
    });
    console.log('Current baseline points:', baselinePoints);
  }, [baselinePoints]);

  return (
    <div className="dna-analyzer">
      {/* 文件上传区域 */}
      <div className="top-controls">
        <div className="upload-section">
          <div className="help-text">
            {'请选择需要计算切割效率的图片文件（支持 .jpg, .png, .gif 格式）'}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
          />
        </div>
        <div className="action-buttons">
          <div className="help-text text-right">
            {isSettingBaseline 
              ? '点击灰度曲线上的点来设置基线，完成后点击"完成基线设置"'
              : '选择区域后点击"设置基线"开始绘制基线'}
          </div>
          <div className="button-group">
            <button
              onClick={() => setIsSettingBaseline(!isSettingBaseline)}
              className={`px-3 py-1 rounded ${
                isSettingBaseline ? 'bg-green-500' : 'bg-blue-500'
              } text-white`}
            >
              {isSettingBaseline ? '完成基线设置' : '设置基线'}
            </button>
            <button
              onClick={analyzeRegion}
              className="px-3 py-1 bg-blue-500 text-white rounded"
              disabled={selectedRegion === null || baselinePoints.length < 2}
            >
              分析区域
            </button>
          </div>
        </div>
      </div>

      {/* 主布局 */}
      <div className="main-layout">
        {/* 左侧控制面板 */}
        <div className="left-panel">
          <div className="help-text">
            {'调整图像显示参数'}
          </div>
          {/* 亮度控制 */}
          <div className="control-group">
            <label>亮度:</label>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
            <div className="number-input">
              <input
                type="number"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(validateNumberInput(e.target.value, 0, 200))}
              />
              <span>%</span>
            </div>
          </div>

          {/* 对比度控制 */}
          <div className="control-group">
            <label>对比度:</label>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />
            <div className="number-input">
              <input
                type="number"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(validateNumberInput(e.target.value, 0, 200))}
              />
              <span>%</span>
            </div>
          </div>

          {/* 横向缩放控制 */}
          <div className="control-group">
            <label>横向缩放:</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={horizontalZoom}
              onChange={(e) => setHorizontalZoom(Number(e.target.value))}
            />
            <div className="number-input">
              <input
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={horizontalZoom}
                onChange={(e) => setHorizontalZoom(validateNumberInput(e.target.value, 0.5, 3))}
              />
              <span>×</span>
            </div>
          </div>

          {/* 纵向缩放控制 */}
          <div className="control-group">
            <label>纵向缩放:</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={verticalZoom}
              onChange={(e) => setVerticalZoom(Number(e.target.value))}
            />
            <div className="number-input">
              <input
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={verticalZoom}
                onChange={(e) => setVerticalZoom(validateNumberInput(e.target.value, 0.5, 3))}
              />
              <span>×</span>
            </div>
          </div>
        </div>

        {/* 中间图像区域 */}
        <div className="center-panel">
          <div className="help-text">
            {regions.length === 0 
              ? '请在图片上按住鼠标左键并拖动来选择要分析的区域'
              : '点击已创建的区域进行分析，或继续创建新的区域'}
          </div>
          <div className="region-buttons">
            {regions.map((_, index) => (
              <div key={index} className="flex items-center gap-1">
                <button
                  onClick={() => handleRegionClick(index)}
                  className={`px-2 py-1 rounded ${
                    selectedRegion === index
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Region {index + 1}
                </button>
                <button
                  onClick={() => deleteRegion(index)}
                  className="px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                  title="删除此区域"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
        </div>

        {/* 右侧分析面板 */}
        <div className="right-panel">
          {profileData.length > 0 && (
            <>
              <div className="help-text">
                {isSettingBaseline 
                  ? '在曲线上点击添加基线点，至少需要2个点。点击基线点旁的 × 可以删除该点'
                  : '灰度曲线图显示所选区域的灰度分布'}
              </div>
              <div className="chart-container">
                <LineChart
                  width={460}
                  height={600}
                  data={profileData}
                  onClick={handleChartClick}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={() => setHoverPoint(null)}
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="position" 
                    type="number"
                  />
                  <YAxis 
                    type="number"
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="#8884d8" 
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {baselinePoints.length >= 2 && (
                    <Line
                      type="monotone"
                      data={profileData.map(point => ({
                        position: point.position,
                        intensity: calculateBaseline(point.position)
                      }))}
                      dataKey="intensity"
                      stroke="#ff0000"
                      dot={false}
                    />
                  )}
                  {baselinePoints.map((point, index) => (
                    <g key={index}>
                      <Line
                        data={[point]}
                        dataKey="intensity"
                        xAxisDataKey="position"
                        stroke="none"
                        dot={{
                          r: 4,
                          fill: 'red',
                          stroke: 'none'
                        }}
                      />
                      {isSettingBaseline && (
                        <g>
                          <text
                            x={10}
                            y={500 + index * 20}
                            fill="red"
                            fontSize="12"
                            textAnchor="start"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBaselinePointDelete(index);
                            }}
                          >
                            {`点${index + 1}: (${point.position.toFixed(1)}, ${point.intensity.toFixed(1)}) `}
                            <tspan fill="#ff0000" fontSize="14">×</tspan>
                          </text>
                        </g>
                      )}
                    </g>
                  ))}
                  {isSettingBaseline && hoverPoint && (
                    <>
                      <ReferenceDot
                        x={hoverPoint.position}
                        y={hoverPoint.intensity}
                        r={6}
                        fill="none"
                        stroke="#ff0000"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine x={hoverPoint.position} stroke="#666" strokeDasharray="3 3" />
                      <ReferenceLine y={hoverPoint.intensity} stroke="#666" strokeDasharray="3 3" />
                    </>
                  )}
                </LineChart>
              </div>
            </>
          )}

          {results.length > 0 && (
            <div className="results-section">
              <div className="help-text">
                {'分析结果与标签控制'}
              </div>
              <div className="action-buttons">
                <button
                  onClick={toggleEfficiencyDisplay}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                  title="在图片上显示/隐藏切割效率标签"
                >
                  {showEfficiencyOnImage ? '隐藏图上效率' : '在图上显示效率'}
                </button>
                <button
                  onClick={toggleRegionLabels}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                  title="在图片上显示/隐藏区域标签"
                >
                  {showRegionLabels ? '隐藏区域标签' : '显示区域标签'}
                </button>
              </div>

              {/* 效率标签控制 */}
              {showEfficiencyOnImage && (
                <div className="label-controls">
                  <h3 className="text-sm font-medium mb-2">效率标签样式</h3>
                  <div className="control-row">
                    <label>颜色:</label>
                    <input
                      type="color"
                      value={labelColor}
                      onChange={(e) => {
                        setLabelColor(e.target.value);
                        setEfficiencyLabels(labels =>
                          labels.map(label => ({ ...label, color: e.target.value }))
                        );
                      }}
                      className="color-picker"
                    />
                  </div>
                  <div className="control-row">
                    <label>字体大小:</label>
                    <div className="font-size-control">
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={labelFontSize}
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setLabelFontSize(size);
                          setEfficiencyLabels(labels =>
                            labels.map(label => ({ ...label, fontSize: size }))
                          );
                        }}
                      />
                      <span>{labelFontSize}px</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 区域标签控制 */}
              {showRegionLabels && (
                <div className="label-controls">
                  <h3 className="text-sm font-medium mb-2">区域标签样式</h3>
                  <div className="control-row">
                    <label>颜色:</label>
                    <input
                      type="color"
                      value={regionLabelColor}
                      onChange={(e) => {
                        setRegionLabelColor(e.target.value);
                        setRegionLabels(labels =>
                          labels.map(label => ({ ...label, color: e.target.value }))
                        );
                      }}
                      className="color-picker"
                    />
                  </div>
                  <div className="control-row">
                    <label>字体大小:</label>
                    <div className="font-size-control">
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={regionLabelFontSize}
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setRegionLabelFontSize(size);
                          setRegionLabels(labels =>
                            labels.map(label => ({ ...label, fontSize: size }))
                          );
                        }}
                      />
                      <span>{regionLabelFontSize}px</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 结果表格 */}
              <table className="w-full">
                <thead>
                  <tr>
                    <th>区域</th>
                    <th>切割效率</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    result && (
                      <tr key={index}>
                        <td className="text-center">{result.region}</td>
                        <td className="text-center">
                          {(result.efficiency * 100).toFixed(2)}%
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 标签编辑弹窗 */}
      {editingLabelText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <input
              type="text"
              value={editingLabelText.text}
              onChange={(e) => setEditingLabelText({
                ...editingLabelText,
                text: e.target.value
              })}
              className="border p-2 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRegionLabels(labels =>
                    labels.map((label, i) =>
                      i === editingLabelText.index
                        ? { ...label, text: editingLabelText.text }
                        : label
                    )
                  );
                  setEditingLabelText(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                确定
              </button>
              <button
                onClick={() => setEditingLabelText(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DNAAnalyzer;