import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const WordCloud = ({ words, width = 400, height = 300 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!words || words.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // 기존 내용 제거

    // 크기 설정
    svg.attr("width", width).attr("height", height);

    // 색상 스케일
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // 폰트 크기 스케일 (빈도수에 따라)
    const maxCount = d3.max(words, d => d.count) || 1;
    const minCount = d3.min(words, d => d.count) || 1;
    const fontSizeScale = d3.scaleLinear()
      .domain([minCount, maxCount])
      .range([16, 48]);

    // 간단한 원형 배치 알고리즘
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    // 단어들을 원형으로 배치
    const angleStep = (2 * Math.PI) / words.length;
    
    words.forEach((word, index) => {
      const angle = index * angleStep;
      const distance = Math.random() * radius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const fontSize = fontSizeScale(word.count);

      svg.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", fontSize)
        .attr("font-weight", "bold")
        .attr("fill", colorScale(index))
        .attr("opacity", 0)
        .text(word.text)
        .transition()
        .duration(1000)
        .delay(index * 100)
        .attr("opacity", 1)
        .on("end", function() {
          // 호버 효과 추가
          d3.select(this)
            .on("mouseover", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("font-size", fontSize * 1.2)
                .attr("opacity", 0.8);
            })
            .on("mouseout", function() {
              d3.select(this)
                .transition()
                .duration(200)
                .attr("font-size", fontSize)
                .attr("opacity", 1);
            });
        });

      // 빈도수 표시 (작은 텍스트로)
      svg.append("text")
        .attr("x", x)
        .attr("y", y + fontSize / 2 + 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", 10)
        .attr("fill", "#666")
        .attr("opacity", 0)
        .text(`(${word.count})`)
        .transition()
        .duration(1000)
        .delay(index * 100 + 500)
        .attr("opacity", 0.7);
    });

  }, [words, width, height]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default WordCloud;