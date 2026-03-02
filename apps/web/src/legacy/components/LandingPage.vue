<template>
  <div class="landing-page">
    <!-- Animated Background -->
    <div class="hero-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="gradient-orb orb-4"></div>
      <div class="grid-pattern"></div>
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
      <div class="particles">
        <div class="particle" v-for="(p, index) in particles" :key="index" :style="p.style"></div>
      </div>
    </div>

    <div class="main-layout">
      <!-- Left Panel: Content -->
      <div class="left-panel">
        <div class="hero-content">
          <!-- Animated Badge -->
          <div class="hero-badge">
            <span class="badge-glow"></span>
            <span class="badge-icon">✨</span>
            <span class="badge-text">拾取语言的点滴，成就流利表达</span>
          </div>

          <!-- Logo + Title Row -->
          <div class="hero-title-row">
            <div class="hero-logo">
              <img src="/logo2.png" alt="拾语 Logo" class="logo-image" />
            </div>
            <div class="title-divider"></div>
            <h1 class="hero-title">
              <span class="title-line">智能英语</span>
              <span class="title-line gradient-text">学习伴侣</span>
            </h1>
          </div>

          <p class="hero-subtitle">
            AI 助力的智能标注、生词管理与长难句分析。<br>
            <strong>沉浸式双语阅读体验，让学习更高效。</strong>
          </p>

          <div class="hero-actions">
            <a href="/articles" class="cta-button primary">
              <span class="btn-text">开始阅读</span>
              <span class="btn-icon">→</span>
              <span class="btn-shine"></span>
            </a>
            <a href="/vocabulary" class="cta-button secondary">
              <span class="btn-text">生词本</span>
            </a>
            <a href="/sentences" class="cta-button secondary">
              <span class="btn-text">长难句库</span>
            </a>
          </div>

          <!-- Feature Highlights (Replaces Stats) -->
          <div class="stats-row">
            <div class="stat-item feature-item" v-for="(feature, index) in features" :key="index">
              <span class="feature-icon">{{ feature.icon }}</span>
              <div>
                <span class="stat-number feature-title">{{ feature.label }}</span>
                <span class="stat-label">{{ feature.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Visuals -->
      <div class="right-panel">
        <div class="cards-container">
          <!-- Card 1: Annotation -->
          <div class="card-wrapper" :class="getPositionClass(0)" @mouseenter="pauseRotation = true" @mouseleave="pauseRotation = false">
            <div class="feature-card float-delay-1">
              <div class="card-glass"></div>
              <div class="card-content">
                <div class="card-icon-wrapper annotation">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div class="card-text">
                  <h3>智能标注</h3>
                  <p>即时释义与发音辅助</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Vocabulary -->
          <div class="card-wrapper" :class="getPositionClass(1)" @mouseenter="pauseRotation = true" @mouseleave="pauseRotation = false">
            <div class="feature-card float-delay-2">
              <div class="card-glass"></div>
              <div class="card-shine"></div>
              <div class="card-content">
                <div class="card-icon-wrapper vocab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div class="card-text">
                  <h3>生词管理</h3>
                  <p>记录你的学习轨迹</p>
                </div>
                <div class="mini-stats">
                  <div class="mini-stat">
                    <span class="value">1,240</span>
                    <span class="label">词汇</span>
                  </div>
                  <div class="mini-stat">
                    <span class="value">85%</span>
                    <span class="label">掌握率</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Translation -->
          <div class="card-wrapper" :class="getPositionClass(2)" @mouseenter="pauseRotation = true" @mouseleave="pauseRotation = false">
            <div class="feature-card float-delay-3">
              <div class="card-glass"></div>
              <div class="card-content">
                <div class="card-icon-wrapper trans">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 5h12M9 3v2m1.048 3.5A9 9 0 003 18m14-11.5l2 2m-2-2l-2 2m-5-2h12" />
                  </svg>
                </div>
                <div class="card-text">
                  <h3>长难句分析</h3>
                  <p>深度拆解句子结构</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';

const currentCycle = ref(0);
const pauseRotation = ref(false);
let rotationInterval: ReturnType<typeof setInterval> | null = null;

const getPositionClass = (index: number) => {
  // Calculate position index (0, 1, or 2) based on current cycle
  // We have 3 positions: 
  // 0: Top Right (was card-1)
  // 1: Center Left (Featured) (was card-2)
  // 2: Bottom Right (was card-3)
  
  // Logic: 
  // index 0 sequence: pos-0 -> pos-2 -> pos-1 -> pos-0
  // index 1 sequence: pos-1 -> pos-0 -> pos-2 -> pos-1
  // index 2 sequence: pos-2 -> pos-1 -> pos-0 -> pos-2
  
  // Simplified: (index + currentCycle) % 3
  // But we want a specific flow. Let's define the position indices:
  // pos-0: Top Right
  // pos-1: Featured (Left)
  // pos-2: Bottom Right
  
  // Let's map (index + cycle) % 3 to specific position classes
  const posIndex = (index + currentCycle.value) % 3;
  return `card-pos-${posIndex}`;
};

// Manage body class for scoped global styles
onMounted(() => {
  document.body.classList.add('landing-page-body');
  document.documentElement.classList.add('landing-page-body');
  
  // Start rotation
  rotationInterval = setInterval(() => {
    if (!pauseRotation.value) {
      currentCycle.value = (currentCycle.value + 1) % 3;
    }
  }, 6000); // Rotate every 6 seconds (slower for better UX)
});

onUnmounted(() => {
  document.body.classList.remove('landing-page-body');
  document.documentElement.classList.remove('landing-page-body');
  
  if (rotationInterval) {
    clearInterval(rotationInterval);
  }
});

const features = reactive([
  { label: 'AI 智能分析', icon: '🧠', desc: '深度理解上下文' },
  { label: '生词管理', icon: '📚', desc: '一键收藏复习' },
  { label: '双语阅读', icon: '🌐', desc: '中英对照学习' }
]);

// Generate styles ONCE to prevent re-calculation on every render
const particles = ref(Array.from({ length: 30 }, () => {
  const size = 6 + Math.random() * 20;
  const duration = 10 + Math.random() * 15;
  
  return {
    style: {
      width: `${size}px`,
      height: `${size}px`,
      left: `${Math.random() * 100}%`,
      animationDelay: `-${Math.random() * duration}s`,
      animationDuration: `${duration}s`,
      animationName: 'rise'
    }
  };
}));
</script>

<style lang="scss" scoped>
/* Variables */
$primary: #10b981;
$primary-dark: #059669;
$secondary: #6366f1;
$accent: #f472b6;
$dark-text: #1e293b;
$light-text: #64748b;
$glass-bg: rgba(255, 255, 255, 0.7);
$glass-border: rgba(255, 255, 255, 0.5);

.landing-page {
  position: fixed; /* Changed from relative to fixed */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  z-index: 10; /* Lower z-index to allow navbar (z-index 20) to show on top */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.main-layout {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  z-index: 10;
  
  @media (max-width: 960px) {
    flex-direction: column;
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
  }
}

/* Left Panel */
.left-panel {
  flex: 1;
  display: flex;
  align-items: center; /* Center vertically to align with cards */
  justify-content: center;
  padding: 0 4rem 0 8rem;
  
  @media (max-width: 960px) {
    padding: 4rem 2rem 2rem;
    align-items: flex-start;
  }
}

.hero-content {
  max-width: 700px;
  animation: slideInLeft 0.8s ease-out;
}

/* Hero Title Row - Logo | Divider | Title */
.hero-title-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.hero-logo {
  flex-shrink: 0;
  
  .logo-image {
    width: auto;
    height: 100px;
    max-width: 100%;
    object-fit: contain;
    /* Very soft breathing glow - single green color */
    filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.12))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.05));
    animation: fadeIn 1s ease-out, breathe 3s ease-in-out infinite, logoFloat 5s ease-in-out infinite;
    /* Non-selectable and non-draggable */
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
}

.title-divider {
  width: 1px;
  height: 80px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(16, 185, 129, 0.15) 20%,
    rgba(16, 185, 129, 0.25) 50%,
    rgba(16, 185, 129, 0.15) 80%,
    transparent
  );
  flex-shrink: 0;
}

/* Breathing animation - simple in/out glow */
@keyframes breathe {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.12))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.05));
  }
  50% {
    filter: drop-shadow(0 0 18px rgba(16, 185, 129, 0.22))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.05));
  }
}

/* Logo floating animation - gentle movement */
@keyframes logoFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 20px;
  background: rgba($primary, 0.1);
  border: 1px solid rgba($primary, 0.2);
  border-radius: 99px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba($primary, 0.15);
  margin-top: 0;
  
  .badge-icon { font-size: 1.25rem; }
  
  .badge-text {
    font-size: 1rem;
    font-weight: 600;
    color: $primary-dark;
  }
}

.hero-title {
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  font-weight: 800;
  line-height: 1.3;
  color: $dark-text;
  margin: 0;
  letter-spacing: -0.02em;
  
  .title-line {
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .gradient-text {
    background: linear-gradient(120deg, $primary, $secondary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    padding-bottom: 0.1rem; /* Avoid descender clipping */
  }
}

.hero-subtitle {
  font-size: 1.125rem;
  color: $light-text;
  line-height: 1.8;
  margin-bottom: 3rem;
  max-width: 600px; /* Widen to prevent bad wrapping */
  
  strong {
    font-weight: 600;
    color: $dark-text;
  }
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.cta-button {
  padding: 12px 28px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &.primary {
    background: $primary;
    color: white;
    box-shadow: 0 4px 12px rgba($primary, 0.3);
    position: relative;
    overflow: hidden;
    
    &:hover {
      background: $primary-dark;
      transform: translateY(-2px);
    }
  }
  
  &.secondary {
    background: white;
    color: $dark-text;
    border: 1px solid rgba(0,0,0,0.1);
    
    &:hover {
      background: #f8fafc;
      transform: translateY(-2px);
    }
  }
}

.stats-row {
  display: flex;
  gap: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0,0,0,0.05);
  
  .feature-item {
    display: flex;
    align-items: center; // Horizontal alignment for icon + text
    gap: 1rem;
    
    .feature-icon {
      font-size: 2.5rem; /* Larger icon */
      line-height: 1;
      filter: grayscale(0.2);
    }
    
    div {
      display: flex;
      flex-direction: column;
    }
    
    .feature-title {
      font-size: 1rem;
      font-weight: 700;
      color: $dark-text;
    }
    
    .stat-label {
      font-size: 0.8rem;
      color: $light-text;
    }
  }
}

/* Right Panel */
.right-panel {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: 960px) {
    min-height: 500px;
    padding-bottom: 4rem;
  }
}

.cards-container {
  position: relative;
  width: 100%;
  max-width: 600px; /* Cap width but allow shrinking */
  height: 600px; /* Keep height for positioning context */
  
  @media (max-width: 1200px) {
    /* Slightly smaller on laptops, but rely on responsive % positioning mostly */
    transform: scale(0.9);
  }
  
  @media (max-width: 960px) {
    width: 100%;
    height: auto; /* Allow container to grow with stacked cards */
    min-height: 500px;
    transform: scale(1);
    /* Stack cards on mobile if needed, or keep floating */
    /* Previous styles were stacking them, keep that behavior */
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 2rem;
    padding-bottom: 4rem; /* Add space at bottom */
    
    /* Reset absolute positioning for mobile stack */
    .card-wrapper {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      width: 90% !important; /* Slightly wider on mobile */
      height: auto !important; /* Allow content to dictate height */
      transform: none !important;
      opacity: 1 !important;
      margin-bottom: 1.5rem; /* More spacing between cards */
      
      .feature-card {
        height: auto !important;
        min-height: auto !important;
        animation: none; /* Disable float on mobile for better performance */
        
        /* 移动端也保持玻璃效果 */
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.95) 0%,
          rgba(255, 255, 255, 0.85) 100%
        ) !important;
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.06),
          0 12px 24px rgba(0, 0, 0, 0.08) !important;
      }
      
      /* 移动端显示所有卡片的 mini-stats */
      .mini-stats {
        display: flex !important;
        opacity: 1 !important;
        max-height: 100px !important;
        margin-top: 0.5rem !important;
        padding-top: 1rem !important;
      }
    }
  }
}

/* Feature Cards Styles */
.card-wrapper {
  position: absolute;
  /* 性能优化：使用更长的过渡时间实现平滑切换，GPU 加速 */
  transition: transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
              opacity 0.8s ease-out,
              z-index 0s 0.6s;
  cursor: pointer;
  will-change: transform, opacity;
  
  /* Provide hover targeting for inner card */
  &:hover {
    z-index: 20 !important;
  }
}

.feature-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 28px;
  padding: 1.75rem;
  
  /* 增强玻璃拟态效果 */
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.75) 40%,
    rgba(255, 255, 255, 0.85) 100%
  );
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  
  /* 多层阴影增加深度和立体感 */
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.04),
    0 16px 32px rgba(0, 0, 0, 0.06),
    0 32px 64px rgba(0, 0, 0, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 1),
    inset 0 -1px 2px rgba(255, 255, 255, 0.4);
  
  /* 渐变边框 */
  border: 1px solid transparent;
  background-clip: padding-box;
  
  /* Float animation - 更柔和 */
  animation: float 8s ease-in-out infinite;
  transition: box-shadow 0.5s ease, transform 0.4s ease;
  overflow: hidden;
  
  /* 渐变边框实现 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 28px;
    padding: 1.5px;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.3) 40%,
      rgba(255, 255, 255, 0.7) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  
  /* 光泽扫过动画 */
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 35%,
      rgba(255, 255, 255, 0.5) 50%,
      transparent 65%
    );
    transform: translateX(-100%) rotate(45deg);
    transition: transform 0.8s ease;
    pointer-events: none;
  }
  
  &:hover {
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.03),
      0 12px 24px rgba(0, 0, 0, 0.06),
      0 24px 48px rgba(0, 0, 0, 0.09),
      0 48px 96px rgba(0, 0, 0, 0.12),
      inset 0 1px 2px rgba(255, 255, 255, 1),
      inset 0 -1px 2px rgba(255, 255, 255, 0.6);
    transform: translateY(-6px);
    
    &::after {
      transform: translateX(100%) rotate(45deg);
    }
  }
}

/* Float Delays - 更长的周期 */
.float-delay-1 { animation-delay: 0s; }
.float-delay-2 { animation-delay: 2.5s; }
.float-delay-3 { animation-delay: 5s; }

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  pointer-events: none;
  position: relative;
  z-index: 1;
}

.card-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  
  /* 图标容器的玻璃效果 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background: inherit;
    filter: blur(10px);
    opacity: 0.6;
    z-index: -1;
  }
  
  &.annotation { 
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.28) 100%);
    color: $primary;
    box-shadow: 
      0 4px 16px rgba(16, 185, 129, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }
  &.vocab { 
    background: linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.28) 100%);
    color: $secondary;
    box-shadow: 
      0 4px 16px rgba(99, 102, 241, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }
  &.trans { 
    background: linear-gradient(145deg, rgba(244, 114, 182, 0.12) 0%, rgba(244, 114, 182, 0.28) 100%);
    color: $accent;
    box-shadow: 
      0 4px 16px rgba(244, 114, 182, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }
  
  svg { 
    width: 30px; 
    height: 30px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
  }
}

/* 卡片悬停时图标动画 */
.feature-card:hover .card-icon-wrapper {
  transform: scale(1.08) rotate(-3deg);
}

.card-text h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.35rem 0;
  color: $dark-text;
  letter-spacing: -0.01em;
}

.card-text p {
  font-size: 0.875rem;
  color: $light-text;
  margin: 0;
  line-height: 1.5;
}

/* Card Positioning Classes - 使用 transform 实现位置切换 */
/* 基础位置：所有卡片从中心点开始，通过 transform 移动到目标位置 */
/* Applied to .card-wrapper */
.card-pos-0 {
  /* Position: Top Right */
  top: 50%;
  left: 50%;
  width: 35%;
  min-width: 200px;
  z-index: 2;
  transform: translate(20%, -120%) scale(0.88);
  opacity: 0.88;
  
  .feature-card {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.88) 0%,
      rgba(255, 255, 255, 0.68) 100%
    );
  }
  
  &:hover {
    opacity: 1;
    transform: translate(20%, -120%) scale(0.92);
  }
}

.card-pos-1 {
  /* Position: Center Left (Featured) */
  top: 50%;
  left: 50%;
  width: 48%;
  min-width: 280px;
  z-index: 5;
  transform: translate(-80%, -50%) scale(1);
  
  /* Apply visual overrides to the inner card */
  .feature-card {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.98) 0%,
      rgba(255, 255, 255, 0.92) 40%,
      rgba(255, 255, 255, 0.96) 100%
    );
    box-shadow: 
      0 4px 8px rgba(16, 185, 129, 0.06),
      0 12px 24px rgba(0, 0, 0, 0.06),
      0 24px 48px rgba(0, 0, 0, 0.08),
      0 48px 96px rgba(0, 0, 0, 0.1),
      inset 0 1px 2px rgba(255, 255, 255, 1),
      inset 0 -1px 2px rgba(255, 255, 255, 0.6);
    
    /* 特色卡片的渐变边框 - 更明显的彩色边框 */
    &::before {
      padding: 2px;
      background: linear-gradient(
        145deg,
        rgba(16, 185, 129, 0.4) 0%,
        rgba(99, 102, 241, 0.3) 50%,
        rgba(244, 114, 182, 0.4) 100%
      );
    }
  }
  
  .mini-stats {
    display: flex;
    opacity: 1;
    max-height: 100px;
    margin-top: 0.5rem;
    padding-top: 1rem;
    transition: all 0.6s ease 0.3s;
  }
}

.card-pos-2 {
  /* Position: Bottom Right */
  top: 50%;
  left: 50%;
  width: 38%;
  min-width: 220px;
  z-index: 3;
  transform: translate(10%, 30%) scale(0.92);
  opacity: 0.92;
  
  .feature-card {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.72) 100%
    );
  }
  
  &:hover {
    opacity: 1;
    transform: translate(10%, 30%) scale(0.96);
  }
}

/* Base styles for transition elements */
.feature-card {
  /* Start with mini-stats hidden/collapsed for non-featured cards */
  .mini-stats {
    display: flex;
    gap: 1.5rem;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    margin-top: 0;
    padding-top: 0;
    transition: all 0.5s ease;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    
    .mini-stat {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0;
      
      .value { 
        font-size: 1.25rem;
        font-weight: 700; 
        background: linear-gradient(135deg, $secondary, $primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .label { 
        font-size: 0.75rem; 
        color: $light-text;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 0.15rem;
      }
    }
  }
}

/* Background */
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  
  &.orb-1 {
    top: -10%; left: -10%; width: 50vw; height: 50vw;
    background: rgba($primary, 0.2);
  }
  &.orb-2 {
    bottom: -10%; right: -10%; width: 40vw; height: 40vw;
    background: rgba($secondary, 0.2);
  }
}

.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  /* Realistic bubble gradient: transparent center, white rim */
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0.4) 100%);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.3), 0 0 5px rgba(255,255,255,0.1);
  border-radius: 50%;
  bottom: -40px; /* Start lower */
  z-index: 1;
  pointer-events: none;
  animation-name: rise; /* Use global keyframe */
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  /* Duration and Delay set via inline styles */
}


@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>

<!-- Global styles for keyframes to avoid scoping issues with inline animation names -->
<style>
@keyframes rise {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
    transform: translateY(-10vh) translateX(10px);
  }
  25% { transform: translateY(-30vh) translateX(-15px); }
  50% { transform: translateY(-50vh) translateX(10px); }
  75% { transform: translateY(-75vh) translateX(-15px); }
  
  100% {
    transform: translateY(-120vh) translateX(20px);
    opacity: 0;
  }
}
</style>
