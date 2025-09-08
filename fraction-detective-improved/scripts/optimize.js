#!/usr/bin/env node

/**
 * 웹앱 최적화 스크립트
 * HTML, CSS, JS 압축 및 최적화를 수행합니다.
 */

const fs = require('fs');
const path = require('path');

// 설정
const CONFIG = {
    srcFile: 'index.html',
    outputDir: 'dist',
    minifyOptions: {
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true
    }
};

/**
 * 메인 최적화 함수
 */
async function optimize() {
    console.log('🚀 웹앱 최적화를 시작합니다...\n');

    try {
        // 1. 출력 디렉토리 생성
        createOutputDirectory();

        // 2. HTML 파일 읽기
        const htmlContent = readSourceFile();

        // 3. 인라인 CSS 최적화
        const optimizedHTML = optimizeInlineCSS(htmlContent);

        // 4. 인라인 JavaScript 최적화
        const finalHTML = optimizeInlineJS(optimizedHTML);

        // 5. HTML 구조 최적화
        const minifiedHTML = optimizeHTML(finalHTML);

        // 6. 최적화된 파일 저장
        saveOptimizedFile(minifiedHTML);

        // 7. 파일 크기 비교
        compareSizes();

        console.log('✅ 최적화가 완료되었습니다!');
        console.log(`📁 출력 위치: ${path.resolve(CONFIG.outputDir)}`);

    } catch (error) {
        console.error('❌ 최적화 중 오류가 발생했습니다:', error.message);
        process.exit(1);
    }
}

/**
 * 출력 디렉토리 생성
 */
function createOutputDirectory() {
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
        console.log(`📁 출력 디렉토리 생성: ${CONFIG.outputDir}`);
    }
}

/**
 * 소스 파일 읽기
 */
function readSourceFile() {
    const filePath = path.resolve(CONFIG.srcFile);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`소스 파일을 찾을 수 없습니다: ${filePath}`);
    }

    console.log(`📖 소스 파일 읽기: ${CONFIG.srcFile}`);
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * 인라인 CSS 최적화
 */
function optimizeInlineCSS(html) {
    console.log('🎨 CSS 최적화 중...');
    
    return html.replace(/<style>([\s\S]*?)<\/style>/gi, (match, cssContent) => {
        // 주석 제거
        let optimized = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // 불필요한 공백 제거
        optimized = optimized
            .replace(/\s+/g, ' ')
            .replace(/;\s*}/g, '}')
            .replace(/{\s*/g, '{')
            .replace(/}\s*/g, '}')
            .replace(/:\s*/g, ':')
            .replace(/;\s*/g, ';')
            .trim();

        return `<style>${optimized}</style>`;
    });
}

/**
 * 인라인 JavaScript 최적화
 */
function optimizeInlineJS(html) {
    console.log('⚡ JavaScript 최적화 중...');
    
    return html.replace(/<script>([\s\S]*?)<\/script>/gi, (match, jsContent) => {
        // 주석 제거 (한 줄 주석)
        let optimized = jsContent.replace(/\/\/.*$/gm, '');
        
        // 주석 제거 (여러 줄 주석)
        optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // 불필요한 공백 제거
        optimized = optimized
            .replace(/\s+/g, ' ')
            .replace(/;\s*}/g, ';}')
            .replace(/{\s*/g, '{')
            .replace(/}\s*/g, '}')
            .trim();

        return `<script>${optimized}</script>`;
    });
}

/**
 * HTML 구조 최적화
 */
function optimizeHTML(html) {
    console.log('📄 HTML 최적화 중...');
    
    let optimized = html;
    
    // 주석 제거 (단, IE 조건부 주석은 유지)
    optimized = optimized.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
    
    // 불필요한 공백 제거
    optimized = optimized
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();
    
    // 빈 속성 제거
    optimized = optimized.replace(/\s+([a-zA-Z-]+)=""/g, '');
    
    return optimized;
}

/**
 * 최적화된 파일 저장
 */
function saveOptimizedFile(content) {
    const outputPath = path.join(CONFIG.outputDir, 'index.html');
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`💾 최적화된 파일 저장: ${outputPath}`);
}

/**
 * 파일 크기 비교
 */
function compareSizes() {
    const originalPath = path.resolve(CONFIG.srcFile);
    const optimizedPath = path.join(CONFIG.outputDir, 'index.html');
    
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log('\n📊 파일 크기 비교:');
    console.log(`   원본: ${formatBytes(originalSize)}`);
    console.log(`   최적화: ${formatBytes(optimizedSize)}`);
    console.log(`   감소율: ${reduction}%\n`);
}

/**
 * 바이트를 읽기 쉬운 형태로 변환
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 에러 핸들링
 */
process.on('uncaughtException', (error) => {
    console.error('❌ 예상치 못한 오류:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ 처리되지 않은 Promise 거부:', reason);
    process.exit(1);
});

// 스크립트 실행
if (require.main === module) {
    optimize();
}

module.exports = { optimize };




