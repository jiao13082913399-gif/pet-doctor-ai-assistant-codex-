<template>
  <view class="page">
    <view class="header">
      <text class="eyebrow">工具广场</text>
      <text class="title">选择接诊场景工具</text>
      <text class="subtitle">小程序端保留与 Web 工具广场一致的技能分类和自建工具入口。</text>
    </view>

    <view class="section">
      <text class="section-title">技能分类</text>
      <view class="category-grid">
        <button
          v-for="category in skillCategories"
          :key="category.title"
          class="category-card"
          @click="showUnavailable(category.title)"
        >
          <text class="category-title">{{ category.title }}</text>
          <text class="category-desc">{{ category.description }}</text>
          <text class="category-status">现成技能暂未开放</text>
        </button>
      </view>
    </view>

    <view class="section">
      <text class="section-title">现成技能</text>
      <view class="skill-list">
        <button
          v-for="skill in readySkills"
          :key="skill"
          class="skill-row"
          @click="showUnavailable(skill)"
        >
          <text>{{ skill }}</text>
          <text class="skill-status">暂未开放</text>
        </button>
      </view>
    </view>

    <view class="section">
      <text class="section-title">自建工具</text>
      <button class="builder-entry" @click="openBuilderEntry">
        <text class="builder-title">口述一个工具需求</text>
        <text class="builder-desc"
          >沿用 Web 自建工具的“AI 追问 -> 需求文档”逻辑，第一版小程序端保留入口。</text
        >
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
const skillCategories = [
  {
    title: '接诊沟通',
    description: '复盘沟通、识别宠主疑虑、整理回访重点。',
  },
  {
    title: '医疗文书',
    description: '病历草稿、风险提醒、检查建议结构化。',
  },
  {
    title: '客户经营',
    description: '客户画像、升单机会、复诊触达建议。',
  },
  {
    title: '团队沉淀',
    description: '优秀话术、典型病例、团队经验共享。',
  },
];

const readySkills = ['病历自动生成', '客户全景画像', '升单机会挖掘', '医疗风险防控'];

function showUnavailable(skillName: string): void {
  uni.showToast({
    title: `${skillName}暂未开放`,
    icon: 'none',
  });
}

function openBuilderEntry(): void {
  uni.showModal({
    title: '自建工具入口',
    content: '小程序第一版先保留入口，后续会复用 Web 工具广场的 AI 追问和需求文档生成流程。',
    showCancel: false,
  });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 18px;
  background: #f6f8fb;
}

.header,
.section {
  margin-bottom: 16px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eyebrow {
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
}

.title {
  color: #101828;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}

.subtitle,
.category-desc,
.builder-desc {
  color: #667085;
  font-size: 13px;
  line-height: 21px;
}

.section-title {
  display: block;
  margin-bottom: 10px;
  color: #344054;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
}

.category-grid,
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-card,
.skill-row,
.builder-entry {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
}

.category-card,
.builder-entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 15px;
}

.category-title,
.builder-title {
  color: #101828;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}

.category-status,
.skill-status {
  color: #b54708;
  font-size: 12px;
  line-height: 18px;
}

.skill-row {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  color: #101828;
  font-size: 14px;
  line-height: 22px;
}
</style>
