import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const WordCloud = ({ words, width = 500, height = 500 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!words || words.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // 기존 내용 제거

    // 크기 설정
    svg.attr("width", width).attr("height", height);

    // 색상 스케일
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // 폰트 크기 스케일 (빈도수에 따라) - 전체적으로 크기 증가
    const maxCount = d3.max(words, d => d.count) || 1;
    const minCount = d3.min(words, d => d.count) || 1;
    const fontSizeScale = d3.scaleLinear()
      .domain([minCount, maxCount])
      .range([24, 64]); // 최소 16→24, 최대 48→64로 증가

    // 충돌 방지를 위한 배치 알고리즘 - 배치 범위 확대
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2.5; // 범위를 더 넓게 (3 → 2.5)
    
    // 이미 배치된 단어들의 위치를 저장
    const placedWords = [];
    
    // 두 단어가 겹치는지 확인하는 함수
    const isOverlapping = (x1, y1, w1, h1, x2, y2, w2, h2) => {
      const padding = 12; // 단어 간 간격을 더 넓게 설정 (5 -> 12)
      return !(x1 + w1 + padding < x2 || 
               x2 + w2 + padding < x1 || 
               y1 + h1 + padding < y2 || 
               y2 + h2 + padding < y1);
    };
    
    // 안전한 위치를 찾는 함수
    const findSafePosition = (fontSize, wordLength) => {
      const estimatedWidth = wordLength * fontSize * 0.65; // 단어 너비 추정을 더 정확하게
      const estimatedHeight = fontSize * 1.2; // 높이에도 여유 공간 추가
      
      for (let attempt = 0; attempt < 100; attempt++) { // 시도 횟수 증가
        let x, y;
        
        if (attempt < 15) {
          // 처음 15번은 중앙 근처에서 시도 (더 넓은 중앙 영역)
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * maxRadius * 0.8; // 0.7 → 0.8로 확대
          x = centerX + Math.cos(angle) * distance - estimatedWidth / 2;
          y = centerY + Math.sin(angle) * distance - estimatedHeight / 2;
        } else if (attempt < 40) {
          // 중간 시도는 더 넓은 중앙 영역
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * maxRadius * 1.4; // 1.2 → 1.4로 확대
          x = centerX + Math.cos(angle) * distance - estimatedWidth / 2;
          y = centerY + Math.sin(angle) * distance - estimatedHeight / 2;
        } else {
          // 그 다음은 전체 영역에서 시도
          x = Math.random() * (width - estimatedWidth - 40) + 20; // 여백을 더 크게
          y = Math.random() * (height - estimatedHeight - 40) + 20; // 여백을 더 크게
        }
        
        // 경계 체크 (더 엄격하게)
        if (x < 15 || y < 15 || x + estimatedWidth > width - 15 || y + estimatedHeight > height - 15) {
          continue;
        }
        
        // 겹침 체크
        let overlapping = false;
        for (const placed of placedWords) {
          if (isOverlapping(x, y, estimatedWidth, estimatedHeight, 
                           placed.x, placed.y, placed.width, placed.height)) {
            overlapping = true;
            break;
          }
        }
        
        if (!overlapping) {
          return { 
            x: x + estimatedWidth / 2, 
            y: y + estimatedHeight / 2, 
            width: estimatedWidth, 
            height: estimatedHeight 
          };
        }
      }
      
      // 안전한 위치를 찾지 못한 경우 스파이럴 배치
      const spiralAngle = placedWords.length * 0.5;
      const spiralRadius = Math.min(maxRadius + placedWords.length * 5, Math.min(width, height) / 2);
      const x = centerX + Math.cos(spiralAngle) * spiralRadius;
      const y = centerY + Math.sin(spiralAngle) * spiralRadius;
      
      return { 
        x, 
        y, 
        width: estimatedWidth, 
        height: estimatedHeight 
      };
    };
    
    words.forEach((word, index) => {
      const fontSize = fontSizeScale(word.count);
      const position = findSafePosition(fontSize, word.text.length);
      
      // 배치된 단어 정보 저장
      placedWords.push({
        x: position.x - position.width / 2,
        y: position.y - position.height / 2,
        width: position.width,
        height: position.height
      });

      svg.append("text")
        .attr("x", position.x)
        .attr("y", position.y)
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
        .attr("x", position.x)
        .attr("y", position.y + fontSize / 2 + 12)
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