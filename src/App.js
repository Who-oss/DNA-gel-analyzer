import React, { useState } from 'react';
import './App.css';
import DNAAnalyzer from './scripts/DNAAnalyzer';  // 导入你的脚本

function App() {
  const [showAnalyzer, setShowAnalyzer] = useState(true);

// 切换 DNAAnalyzer 显示/隐藏的处理函数
const toggleAnalyzer = () => {
  setShowAnalyzer(prev => !prev);
};

return (
  <div className="App">
    <div className="container">
      <button
        onClick={toggleAnalyzer}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-4"
      >
        {showAnalyzer ? 'Hide Analyzer' : 'Show Analyzer'}
      </button>

      {showAnalyzer && <DNAAnalyzer />}
    </div>
  </div>
);
}

export default App;
