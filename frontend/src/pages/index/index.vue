<template>
  <view v-if="!authChecked" class="auth-loading">
    <view class="panel">
      <text class="state-text">正在校验登录状态...</text>
    </view>
  </view>

  <view v-else class="app-shell" :class="{ 'app-shell-collapsed': sidebarCollapsed }">
    <view class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <view class="brand">
        <text class="brand-title">宠物医生 AI 医助</text>
        <text class="brand-subtitle">MVP 工作台</text>
      </view>

      <view class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'nav-item-active': activeSection === item.key }"
          @click="switchSection(item.key)"
        >
          {{ item.label }}
        </button>
      </view>
    </view>

    <view class="main">
      <view class="topbar">
        <view>
          <text class="eyebrow">{{ activeEyebrow }}</text>
          <text class="page-title">{{ activePageTitle }}</text>
        </view>
        <view class="session">
          <button class="ghost-button compact sidebar-toggle" @click="toggleSidebar">
            {{ sidebarCollapsed ? '展开菜单' : '折叠菜单' }}
          </button>
          <text>{{ currentUserLabel }}</text>
          <button class="ghost-button" @click="refreshCurrentSection">刷新</button>
          <button class="ghost-button" @click="logout">退出</button>
        </view>
      </view>

      <view v-if="activeSection === 'memory' && loading" class="panel">
        <text class="state-text">正在读取 Memory...</text>
      </view>

      <view v-else-if="activeSection === 'memory' && error" class="panel state-error">
        <text>{{ error }}</text>
        <button class="primary-button compact" @click="loadMemory">重新加载</button>
      </view>

      <view v-else-if="activeSection === 'memory' && !memory" class="workspace">
        <view class="panel intro-panel">
          <text class="section-title">首次初始化</text>
          <text class="muted">填写长期有效的个人工作信息，系统会生成固定 Markdown 模板。</text>
        </view>

        <view class="panel form-grid">
          <label class="field">
            <text>城市</text>
            <input v-model="initForm.city" class="input" placeholder="例如：宁波" />
          </label>
          <label class="field">
            <text>门店</text>
            <input v-model="initForm.store" class="input" placeholder="例如：宠一科技测试门店" />
          </label>
          <label class="field">
            <text>岗位</text>
            <input v-model="initForm.position" class="input" placeholder="例如：主治医生" />
          </label>
          <label class="field field-wide">
            <text>个人背景</text>
            <textarea
              v-model="initForm.personalBackground"
              class="textarea"
              placeholder="例如：擅长皮肤病复诊、慢病沟通和宠主教育"
            />
          </label>
          <label class="field field-wide">
            <text>工作场景</text>
            <textarea
              v-model="initForm.workScenarios"
              class="textarea"
              placeholder="每行一条，例如：门诊复诊沟通"
            />
          </label>
          <label class="field field-wide">
            <text>常见任务</text>
            <textarea
              v-model="initForm.commonTasks"
              class="textarea"
              placeholder="每行一条，例如：生成病历草稿"
            />
          </label>
          <label class="field field-wide">
            <text>个人偏好</text>
            <textarea
              v-model="initForm.preferences"
              class="textarea"
              placeholder="例如：输出简洁、先结论后依据、避免过度承诺"
            />
          </label>

          <button class="primary-button field-wide" :disabled="saving" @click="initMemory">
            {{ saving ? '创建中...' : '创建 Memory' }}
          </button>
        </view>
      </view>

      <view v-else-if="activeSection === 'memory' && activeMemory" class="workspace">
        <view class="panel memory-toolbar">
          <view>
            <text class="section-title">个人 Memory</text>
            <text class="muted">用户 ID：{{ activeMemory.userId }}</text>
          </view>
          <view class="toolbar-actions">
            <button class="ghost-button" @click="openSuggestions">AI 建议更新</button>
            <button class="ghost-button" @click="toggleEdit">
              {{ editing ? '退出编辑' : '编辑 Markdown' }}
            </button>
            <button
              v-if="editing"
              class="primary-button compact"
              :disabled="saving"
              @click="saveMemory"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </view>
        </view>

        <view class="panel memory-panel">
          <textarea v-if="editing" v-model="draftMarkdown" class="markdown-editor" />
          <text v-else class="markdown-view">{{ activeMemory.contentText }}</text>
        </view>
      </view>

      <view v-else-if="activeSection === 'recordings'" class="workspace">
        <view v-if="recordingError" class="panel state-error">
          <text>{{ recordingError }}</text>
          <button
            v-if="recordingRetryAction"
            class="primary-button compact retry-button"
            :disabled="recordingActionBusy || recordingsLoading"
            @click="runRecordingRetryAction"
          >
            {{ recordingRetryAction.label }}
          </button>
        </view>

        <view class="panel recording-hero">
          <view>
            <text class="section-title">AI 录音 / 智能工牌</text>
            <text class="recording-consent"
              >请确认已获得沟通对象同意录音，并遵守所在门店及当地隐私要求。</text
            >
          </view>
          <view class="recording-controls">
            <button
              class="record-button"
              :class="{ 'record-button-active': recorderState === 'recording' }"
              :disabled="!canUseMediaRecorder || recordingActionBusy"
              @click="toggleRecording"
            >
              {{ recordButtonText }}
            </button>
            <label
              class="ghost-button upload-button file-picker-label"
              :class="{ 'file-picker-disabled': recordingActionBusy }"
            >
              <text>上传录音</text>
              <input
                ref="audioFileInputRef"
                class="file-input"
                type="file"
                :disabled="recordingActionBusy"
                accept=".mp3,.wav,.m4a,audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav,audio/mp4,audio/m4a,audio/x-m4a"
                @change="handleAudioFileSelected"
              />
            </label>
          </view>
          <view class="recording-hints">
            <text v-if="!canUseMediaRecorder" class="unsupported-hint"
              >当前浏览器不支持录音，仍可上传 MP3 / WAV / M4A 音频。</text
            >
            <text v-else class="muted">支持浏览器 MediaRecorder 录音，录音完成后会上传音频。</text>
            <text class="muted">支持上传 MP3 / WAV / M4A；不支持视频文件。</text>
            <text v-if="recordingTimerText" class="recording-timer">{{ recordingTimerText }}</text>
            <text v-if="recordingProcessMessage" class="muted">{{ recordingProcessMessage }}</text>
          </view>
        </view>

        <view class="panel recording-toolbar">
          <view>
            <text class="section-title">最近录音记录</text>
            <text class="muted"
              >上传成功后可转写并生成默认结果；第六、第七模块仍需在详情 Tab 主动生成。</text
            >
          </view>
          <button
            class="ghost-button compact"
            :disabled="recordingsLoading"
            @click="loadRecordings"
          >
            手动刷新状态
          </button>
        </view>

        <view v-if="recordingsLoading" class="panel">
          <text class="state-text">正在读取录音...</text>
        </view>

        <view v-else-if="recordings.length === 0" class="panel empty-state">
          <text>暂无录音记录。可点击“开始录音”或“上传录音”创建第一条记录。</text>
        </view>

        <view v-else class="recording-table">
          <view class="recording-table-head">
            <text>创建时间</text>
            <text>宠主名</text>
            <text>宠物名</text>
            <text>状态</text>
            <text>场景</text>
            <text>操作</text>
          </view>
          <view
            v-for="item in recordings"
            :key="item.id"
            class="recording-row"
            :class="{ 'recording-item-active': item.id === selectedRecordingId }"
          >
            <text>{{ formatRecordingCreatedAt(item.createdAt) }}</text>
            <text>{{ item.petOwnerName || '未识别宠主' }}</text>
            <text>{{ item.petName || '未识别宠物' }}</text>
            <text class="status-pill" :class="`status-${item.processingStatus}`">{{
              formatRecordingStatus(item.processingStatus)
            }}</text>
            <text>{{ item.aiDetectedScene || '未识别' }}</text>
            <view class="recording-row-actions">
              <button class="ghost-button compact" @click="selectRecording(item.id)">
                进入详情
              </button>
              <button
                v-if="item.processingStatus === 'failed'"
                class="ghost-button compact"
                :disabled="recordingActionBusy"
                @click="retryRecordingProcess(item.id)"
              >
                重新尝试
              </button>
            </view>
          </view>
        </view>

        <view v-if="recordingDetail" class="recording-detail">
          <view class="panel recording-summary">
            <view>
              <text class="section-title">录音结果详情</text>
              <text class="muted"
                >{{ recordingDetail.recording.petOwnerName || '未识别宠主' }} /
                {{ recordingDetail.recording.petName || '未识别宠物' }} ·
                {{ formatRecordingStatus(recordingDetail.recording.processingStatus) }}</text
              >
            </view>
            <button
              class="primary-button compact"
              :disabled="recordingsLoading"
              @click="generateDefaultResults"
            >
              生成默认结果
            </button>
          </view>

          <view class="detail-grid">
            <view class="panel detail-card">
              <view class="card-heading">
                <text class="section-title">录音基础信息</text>
              </view>
              <view class="meta-grid">
                <view class="meta-item">
                  <text class="meta-label">创建时间</text>
                  <text class="meta-value">{{
                    formatFullDateTime(recordingDetail.recording.createdAt)
                  }}</text>
                </view>
                <view class="meta-item">
                  <text class="meta-label">处理状态</text>
                  <text
                    class="status-pill"
                    :class="`status-${recordingDetail.recording.processingStatus}`"
                    >{{ formatRecordingStatus(recordingDetail.recording.processingStatus) }}</text
                  >
                </view>
                <view class="meta-item">
                  <text class="meta-label">录音格式</text>
                  <text class="meta-value">{{
                    recordingDetail.recording.audioFormat || '未识别'
                  }}</text>
                </view>
                <view class="meta-item">
                  <text class="meta-label">录音时长</text>
                  <text class="meta-value">{{
                    formatAudioDuration(recordingDetail.recording.audioDuration)
                  }}</text>
                </view>
              </view>
            </view>

            <view class="panel detail-card">
              <view class="card-heading">
                <view>
                  <text class="section-title">宠主 / 宠物绑定</text>
                  <text class="muted">可人工修正 AI 自动识别结果。</text>
                </view>
                <view class="toolbar-actions">
                  <button class="ghost-button compact" @click="toggleBindingEdit">
                    {{ editingBinding ? '取消编辑' : '编辑' }}
                  </button>
                  <button
                    v-if="editingBinding"
                    class="primary-button compact"
                    :disabled="recordingsLoading"
                    @click="saveRecordingBinding"
                  >
                    保存
                  </button>
                </view>
              </view>
              <view v-if="editingBinding" class="binding-edit-grid">
                <label class="field">
                  <text>宠主姓名</text>
                  <input v-model="bindingDraft.petOwnerName" class="input" placeholder="宠主姓名" />
                </label>
                <label class="field">
                  <text>宠物姓名</text>
                  <input v-model="bindingDraft.petName" class="input" placeholder="宠物姓名" />
                </label>
              </view>
              <view v-else class="meta-grid">
                <view class="meta-item">
                  <text class="meta-label">宠主姓名</text>
                  <text class="meta-value">{{
                    recordingDetail.recording.petOwnerName || '未绑定'
                  }}</text>
                </view>
                <view class="meta-item">
                  <text class="meta-label">宠物姓名</text>
                  <text class="meta-value">{{
                    recordingDetail.recording.petName || '未绑定'
                  }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="panel detail-card">
            <view class="card-heading">
              <view>
                <text class="section-title">转写文本</text>
                <text class="muted">展示 transcript_text，可编辑后保存。</text>
              </view>
              <view class="toolbar-actions">
                <button class="ghost-button compact" @click="toggleTranscriptEdit">
                  {{ editingTranscript ? '取消编辑' : '编辑' }}
                </button>
                <button
                  v-if="editingTranscript"
                  class="primary-button compact"
                  :disabled="recordingsLoading"
                  @click="saveTranscript"
                >
                  保存
                </button>
              </view>
            </view>
            <textarea
              v-if="editingTranscript"
              v-model="transcriptDraft"
              class="markdown-editor transcript-editor"
            />
            <text v-else class="markdown-view transcript-view">{{
              recordingDetail.transcriptText || '暂无转写文本。'
            }}</text>
          </view>

          <view class="panel detail-card summary-card">
            <view class="card-heading">
              <view>
                <text class="section-title">AI 总摘要区</text>
                <text class="muted">AI 生成内容仅供辅助，需人工确认。</text>
              </view>
              <text
                v-if="summaryResult"
                class="status-pill"
                :class="`status-${summaryModuleState}`"
              >
                {{ formatModuleState(summaryModuleState) }}
              </text>
            </view>
            <text v-if="summaryResult" class="markdown-view">{{
              summaryResult.contentText || '总摘要为空。'
            }}</text>
            <view v-else class="empty-state">
              <text>暂无 AI 总摘要，可点击“生成默认结果”。</text>
            </view>
          </view>

          <view class="tabs result-tabs">
            <button
              v-for="tab in generationTabs"
              :key="tab.type"
              class="tab-button result-tab-button"
              :class="{ 'tab-button-active': activeGenerationType === tab.type }"
              @click="selectGenerationTab(tab.type)"
            >
              <text>{{ tab.label }}</text>
              <text class="tab-state">{{
                formatModuleState(getGenerationTabState(tab.type))
              }}</text>
            </button>
          </view>

          <view class="panel result-panel">
            <view class="safety-alert">
              <text>AI 生成内容仅供辅助，需人工确认。</text>
            </view>
            <view v-if="requiresHumanConfirmation" class="risk-alert">
              <text>{{ humanConfirmationText }}</text>
            </view>

            <view class="result-header">
              <view>
                <text class="section-title">{{ activeGenerationLabel }}</text>
                <text class="muted">{{ activeGenerationDescription }}</text>
              </view>
            </view>

            <view v-if="recordingsLoading" class="module-state-box">
              <text class="section-title">正在处理</text>
              <text class="muted">当前模块正在加载，请稍候。</text>
            </view>

            <view v-else-if="currentGenerationResult" class="result-body">
              <view class="result-header">
                <view>
                  <text class="muted">
                    版本 v{{ currentGenerationResult.version }} ·
                    {{ formatModuleState(currentModuleState) }} ·
                    {{ formatGenerationStatus(currentGenerationResult.status) }} · 人工确认：{{
                      currentGenerationResult.confirmedByUser ? '已确认' : '未确认'
                    }}
                  </text>
                </view>
                <view class="toolbar-actions">
                  <button class="ghost-button compact" @click="toggleGenerationEdit">
                    {{ editingGeneration ? '退出编辑' : '编辑' }}
                  </button>
                  <button
                    class="ghost-button compact"
                    :disabled="recordingsLoading"
                    @click="saveGenerationResult"
                  >
                    保存
                  </button>
                  <button
                    class="primary-button compact"
                    :disabled="recordingsLoading"
                    @click="adoptGenerationResult"
                  >
                    采纳
                  </button>
                  <button
                    v-if="requiresHumanConfirmation"
                    class="primary-button compact"
                    :disabled="recordingsLoading"
                    @click="adoptGenerationResult"
                  >
                    人工确认
                  </button>
                  <button
                    class="ghost-button compact"
                    :disabled="recordingsLoading"
                    @click="rejectGenerationResult"
                  >
                    不采纳
                  </button>
                  <button
                    class="ghost-button compact"
                    :disabled="recordingsLoading"
                    @click="regenerateGenerationResult"
                  >
                    重新生成
                  </button>
                  <button
                    v-if="activeGenerationType === 'medical_record'"
                    class="ghost-button compact"
                    @click="exportCurrentResultAsPdf"
                  >
                    导出 PDF
                  </button>
                  <button
                    v-if="activeGenerationType === 'customer_profile'"
                    class="ghost-button compact"
                    @click="exportCurrentResultAsImage"
                  >
                    导出图片
                  </button>
                  <button
                    v-if="activeGenerationType === 'customer_profile'"
                    class="ghost-button compact"
                    @click="exportCurrentResultAsPdf"
                  >
                    导出 PDF
                  </button>
                  <button
                    v-if="activeGenerationType === 'smart_followup'"
                    class="primary-button compact"
                    :disabled="recordingsLoading"
                    @click="createTodoFromCurrentFollowup"
                  >
                    一键转成待办
                  </button>
                </view>
              </view>

              <view v-if="currentModuleState === 'error'" class="module-state-box state-error">
                <text>当前模块生成失败，可点击“重新生成”。</text>
                <button
                  class="primary-button compact retry-button"
                  :disabled="recordingsLoading"
                  @click="regenerateGenerationResult"
                >
                  重新尝试
                </button>
              </view>

              <view v-if="editingGeneration" class="generation-editors">
                <textarea v-model="generationDraft" class="markdown-editor result-editor" />
                <textarea
                  v-model="generationJsonDraft"
                  class="markdown-editor result-json-editor"
                />
              </view>
              <view v-else class="structured-result">
                <view
                  v-if="activeGenerationType === 'medical_record'"
                  class="structured-grid medical-record-grid"
                >
                  <view
                    v-for="section in medicalRecordSections"
                    :key="section.key"
                    class="structured-card"
                    :class="{ 'structured-card-highlight': section.highlight }"
                  >
                    <text class="structured-title">{{ section.label }}</text>
                    <view v-if="section.items.length > 0" class="structured-list">
                      <text
                        v-for="item in section.items"
                        :key="`${section.key}-${item}`"
                        class="structured-list-item"
                        >{{ item }}</text
                      >
                    </view>
                    <text v-else class="structured-value">{{ section.value || '待补充' }}</text>
                  </view>
                </view>

                <view
                  v-else-if="activeGenerationType === 'communication_review'"
                  class="structured-grid"
                >
                  <view
                    v-for="section in communicationReviewSections"
                    :key="section.key"
                    class="structured-card"
                    :class="{ 'structured-card-highlight': section.highlight }"
                  >
                    <text class="structured-title">{{ section.label }}</text>
                    <view v-if="section.items.length > 0" class="structured-list">
                      <text
                        v-for="item in section.items"
                        :key="`${section.key}-${item}`"
                        class="structured-list-item"
                        >{{ item }}</text
                      >
                    </view>
                    <text v-else class="structured-value">{{ section.value || '待补充' }}</text>
                  </view>
                </view>

                <view
                  v-else-if="activeGenerationType === 'customer_profile'"
                  class="structured-grid profile-grid"
                >
                  <view
                    v-for="section in customerProfileSections"
                    :key="section.key"
                    class="structured-card editable-structured-card"
                  >
                    <view class="structured-card-header">
                      <text class="structured-title">{{ section.label }}</text>
                      <button
                        class="ghost-button compact micro-button"
                        @click="toggleGenerationEdit"
                      >
                        修改
                      </button>
                    </view>
                    <view v-if="section.items.length > 0" class="structured-list">
                      <text
                        v-for="item in section.items"
                        :key="`${section.key}-${item}`"
                        class="structured-list-item"
                        >{{ item }}</text
                      >
                    </view>
                    <text v-else class="structured-value">{{ section.value || '待补充' }}</text>
                  </view>
                </view>

                <view
                  v-else-if="activeGenerationType === 'upsell_opportunities'"
                  class="opportunity-list"
                >
                  <view
                    v-for="opportunity in upsellOpportunityCards"
                    :key="opportunity.id"
                    class="opportunity-card"
                  >
                    <view class="structured-card-header">
                      <text class="structured-title">{{ opportunity.name }}</text>
                      <text
                        class="status-pill"
                        :class="
                          opportunity.requiresDoctorConfirmation
                            ? 'status-generating'
                            : 'status-completed'
                        "
                      >
                        {{ opportunity.requiresDoctorConfirmation ? '需医生确认' : '可直接跟进' }}
                      </text>
                    </view>
                    <view class="opportunity-fields">
                      <view
                        v-for="field in opportunity.fields"
                        :key="`${opportunity.id}-${field.label}`"
                        class="structured-field"
                      >
                        <text class="meta-label">{{ field.label }}</text>
                        <text class="structured-value">{{ field.value || '待补充' }}</text>
                      </view>
                    </view>
                  </view>
                </view>

                <view v-else-if="activeGenerationType === 'smart_followup'" class="followup-card">
                  <view class="structured-grid">
                    <view
                      v-for="section in smartFollowupSections"
                      :key="section.key"
                      class="structured-card"
                    >
                      <text class="structured-title">{{ section.label }}</text>
                      <view v-if="section.items.length > 0" class="structured-list">
                        <text
                          v-for="item in section.items"
                          :key="`${section.key}-${item}`"
                          class="structured-list-item"
                          >{{ item }}</text
                        >
                      </view>
                      <text v-else class="structured-value">{{ section.value || '待补充' }}</text>
                    </view>
                  </view>
                  <view class="script-box">
                    <view class="structured-card-header">
                      <text class="structured-title">回访话术</text>
                      <button class="ghost-button compact micro-button" @click="copyFollowupScript">
                        复制
                      </button>
                    </view>
                    <text class="script-text">{{ smartFollowupScript || '待补充' }}</text>
                  </view>
                </view>

                <view
                  v-else-if="activeGenerationType === 'medical_risk_control'"
                  class="risk-result"
                >
                  <view class="strong-confirmation-alert">
                    <text>强人工确认：此模块只能作为风险提醒，医生或负责人确认后方可使用。</text>
                  </view>
                  <view class="risk-list">
                    <view
                      v-for="risk in medicalRiskSections"
                      :key="risk.key"
                      class="risk-item"
                      :class="{ 'risk-item-highlight': risk.highlight }"
                    >
                      <text class="structured-title">{{ risk.label }}</text>
                      <view v-if="risk.items.length > 0" class="structured-list">
                        <text
                          v-for="item in risk.items"
                          :key="`${risk.key}-${item}`"
                          class="structured-list-item"
                          >{{ item }}</text
                        >
                      </view>
                      <text v-else class="structured-value">{{ risk.value || '待补充' }}</text>
                    </view>
                  </view>
                </view>

                <view v-else-if="activeGenerationType === 'team_knowledge'" class="structured-grid">
                  <view
                    v-for="section in teamKnowledgeSections"
                    :key="section.key"
                    class="structured-card"
                  >
                    <text class="structured-title">{{ section.label }}</text>
                    <view v-if="section.items.length > 0" class="structured-list">
                      <text
                        v-for="item in section.items"
                        :key="`${section.key}-${item}`"
                        class="structured-list-item"
                        >{{ item }}</text
                      >
                    </view>
                    <text v-else class="structured-value">{{ section.value || '待补充' }}</text>
                  </view>
                </view>

                <view v-else class="fallback-result">
                  <text class="markdown-view">{{
                    currentGenerationResult.contentText || '当前模块内容为空。'
                  }}</text>
                </view>

                <view class="fallback-result">
                  <view class="structured-card-header">
                    <text class="structured-title">兜底文本 / JSON</text>
                    <button class="ghost-button compact micro-button" @click="toggleGenerationEdit">
                      编辑 JSON/text
                    </button>
                  </view>
                  <text class="markdown-view compact-markdown">{{
                    currentGenerationResult.contentText || '当前模块内容为空。'
                  }}</text>
                </view>
              </view>
            </view>

            <view v-else class="module-state-box">
              <text class="section-title">{{ emptyModuleTitle }}</text>
              <text class="muted">{{ emptyModuleDescription }}</text>
              <button
                v-if="isProactiveTab"
                class="primary-button compact"
                :disabled="recordingsLoading"
                @click="generateActiveProactiveModule"
              >
                立即生成
              </button>
              <button
                v-else
                class="ghost-button compact"
                :disabled="recordingsLoading"
                @click="generateDefaultResults"
              >
                生成默认结果
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeSection === 'tools'" class="workspace">
        <view v-if="customToolError" class="panel state-error">
          <text>{{ customToolError }}</text>
        </view>

        <view class="panel tools-hero">
          <view>
            <text class="section-title">工具广场</text>
            <text class="muted"
              >先提供技能分类占位和自建工具需求沉淀，现成技能点击后会提示暂未开放。</text
            >
          </view>
          <button class="primary-button compact" @click="focusCustomToolInput">自建工具</button>
        </view>

        <view class="skill-grid">
          <button
            v-for="skill in skillCards"
            :key="skill.title"
            class="skill-card"
            @click="showSkillNotOpen(skill.title)"
          >
            <text class="skill-title">{{ skill.title }}</text>
            <text class="skill-desc">{{ skill.description }}</text>
            <text class="skill-status">暂未开放</text>
          </button>
        </view>

        <view class="custom-tool-layout">
          <view class="panel custom-tool-panel">
            <view class="custom-tool-header">
              <view>
                <text class="section-title">自建工具</text>
                <text class="muted">描述你想要的工具，AI 会追问并整理成结构化需求文档。</text>
              </view>
              <button
                class="ghost-button compact"
                :disabled="customToolLoading"
                @click="resetCustomToolFlow"
              >
                新建
              </button>
            </view>

            <view v-if="customToolMessages.length === 0" class="empty-state">
              <text>从一句话开始，例如：我想做一个复诊回访话术生成器。</text>
            </view>

            <view v-else class="custom-tool-chat">
              <view
                v-for="message in customToolMessages"
                :key="message.id"
                class="chat-message"
                :class="`chat-message-${message.role}`"
              >
                <text class="chat-role">{{ message.role === 'user' ? '我' : 'AI' }}</text>
                <text class="chat-content">{{ message.content }}</text>
              </view>
            </view>

            <textarea
              ref="customToolInputRef"
              v-model="customToolInput"
              class="textarea"
              placeholder="输入工具需求或回答 AI 的追问"
            />
            <view class="toolbar-actions">
              <button
                class="primary-button compact"
                :disabled="customToolLoading || !customToolInput.trim()"
                @click="submitCustomToolMessage"
              >
                {{ customToolConversationId ? '发送回答' : '开始追问' }}
              </button>
              <button
                class="ghost-button compact"
                :disabled="customToolLoading || !customToolConversationId"
                @click="generateCustomToolRequirement"
              >
                生成需求文档
              </button>
            </view>
          </view>

          <view class="panel custom-tool-panel">
            <view class="custom-tool-header">
              <view>
                <text class="section-title">需求文档</text>
                <text class="muted">生成后可编辑并保存，右侧列表可再次查看。</text>
              </view>
              <button
                class="primary-button compact"
                :disabled="customToolLoading || !activeCustomRequirement"
                @click="saveCustomToolRequirement"
              >
                保存需求文档
              </button>
            </view>

            <input v-model="customRequirementTitle" class="input" placeholder="需求文档标题" />
            <textarea
              v-model="customRequirementDraft"
              class="markdown-editor requirement-editor"
              placeholder="生成后的 Markdown 需求文档会出现在这里"
            />
          </view>
        </view>

        <view class="panel custom-requirement-list">
          <view class="custom-tool-header">
            <view>
              <text class="section-title">已保存需求</text>
              <text class="muted">只展示当前登录用户自己的自建工具需求文档。</text>
            </view>
            <button
              class="ghost-button compact"
              :disabled="customToolLoading"
              @click="loadCustomRequirements"
            >
              刷新
            </button>
          </view>

          <view v-if="customToolLoading && customRequirements.length === 0" class="empty-state">
            <text>正在读取需求文档...</text>
          </view>
          <view v-else-if="customRequirements.length === 0" class="empty-state">
            <text>暂无需求文档。完成一次自建工具流程后可保存查看。</text>
          </view>
          <view v-else class="requirement-list">
            <button
              v-for="requirement in customRequirements"
              :key="requirement.id"
              class="requirement-item"
              :class="{ 'requirement-item-active': activeCustomRequirement?.id === requirement.id }"
              @click="selectCustomRequirement(requirement.id)"
            >
              <text class="requirement-title">{{ requirement.title }}</text>
              <text class="muted"
                >{{ requirement.status }} · {{ formatDateTime(requirement.updatedAt) }}</text
              >
            </button>
          </view>
        </view>
      </view>

      <view v-else-if="activeSection === 'resources'" class="workspace">
        <view class="panel module-placeholder-hero">
          <view>
            <text class="placeholder-status">占位模块</text>
            <text class="section-title">资源库</text>
            <text class="muted">资源库暂未开放，未来用于存放工具生成内容。</text>
          </view>
        </view>

        <view class="panel">
          <view class="placeholder-section-header">
            <text class="section-title">未来资源类型</text>
            <text class="muted">当前仅保留 resources 数据结构和入口，不提供真实业务操作。</text>
          </view>
          <view class="resource-type-grid">
            <view v-for="type in futureResourceTypes" :key="type" class="resource-type-card">
              <text class="resource-type-title">{{ type }}</text>
              <text class="muted">待后续工具生成流程接入</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeSection === 'projects'" class="workspace">
        <view class="panel module-placeholder-hero">
          <view>
            <text class="placeholder-status">占位模块</text>
            <text class="section-title">项目空间</text>
            <text class="muted">未来可关联录音、对话、文件、工具生成物、待办和 Memory。</text>
          </view>
          <button class="primary-button compact" @click="showProjectCreateReserved">
            新建项目
          </button>
        </view>

        <view class="project-placeholder-layout">
          <view class="panel project-list-panel">
            <view class="placeholder-section-header">
              <text class="section-title">项目列表占位</text>
              <text class="muted">接口已预留 GET /api/projects 和 POST /api/projects。</text>
            </view>
            <view class="project-list-placeholder">
              <button
                v-for="project in projectPlaceholders"
                :key="project.id"
                class="project-placeholder-item"
                :class="{
                  'project-placeholder-item-active': selectedProjectPlaceholderId === project.id,
                }"
                @click="selectedProjectPlaceholderId = project.id"
              >
                <text class="requirement-title">{{ project.name }}</text>
                <text class="muted">{{ project.description }}</text>
              </button>
            </view>
          </view>

          <view class="panel project-detail-panel">
            <view class="placeholder-section-header">
              <text class="section-title">项目详情页占位</text>
              <text class="muted"
                >接口已预留 GET /api/projects/{id} 和 PUT /api/projects/{id}。</text
              >
            </view>
            <view class="project-detail-placeholder">
              <text class="structured-title">{{ activeProjectPlaceholder.name }}</text>
              <text class="structured-value">{{ activeProjectPlaceholder.detail }}</text>
              <view class="future-association-list">
                <text
                  v-for="item in futureProjectAssociations"
                  :key="item"
                  class="status-pill status-uploaded"
                  >{{ item }}</text
                >
              </view>
              <text class="muted"
                >项目条目接口已预留 POST /api/projects/{id}/items 和 GET
                /api/projects/{id}/items。</text
              >
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeSection === 'director'" class="workspace">
        <view class="panel module-placeholder-hero">
          <view>
            <text class="placeholder-status">占位模块</text>
            <text class="section-title">院长看板</text>
            <text class="muted">数据统计能力即将上线。</text>
          </view>
        </view>

        <view class="director-metric-grid">
          <view
            v-for="metric in directorMetricCards"
            :key="metric.key"
            class="director-metric-card"
          >
            <text class="meta-label">{{ metric.label }}</text>
            <text class="director-metric-value">--</text>
            <text class="muted">暂不展示真实统计数据</text>
          </view>
        </view>
      </view>

      <view v-else-if="activeSection === 'todos'" class="workspace">
        <view v-if="todoError" class="panel state-error">
          <text>{{ todoError }}</text>
          <button
            class="primary-button compact retry-button"
            :disabled="todosLoading"
            @click="loadTodos"
          >
            重新加载
          </button>
        </view>

        <view class="panel todo-toolbar">
          <view>
            <text class="section-title">任务 / 待办</text>
            <text class="muted">只展示当前登录用户自己的待办，dueTime 第一版仅用于结构预留。</text>
          </view>
          <button class="ghost-button compact" :disabled="todosLoading" @click="loadTodos">
            刷新待办
          </button>
        </view>

        <view v-if="todosLoading" class="panel">
          <text class="state-text">正在读取待办...</text>
        </view>

        <view v-else-if="todos.length === 0" class="panel empty-state">
          <text>暂无待办。打开“AI 录音 / 智能工牌”的智能回访结果后，可一键转成待办。</text>
        </view>

        <view v-else class="todo-list">
          <view v-for="todo in todos" :key="todo.id" class="todo-item">
            <view class="todo-main">
              <checkbox
                :checked="todo.status === 'completed'"
                :disabled="todo.status === 'completed'"
                @click.stop="completeTodo(todo.id)"
              />
              <view class="todo-content">
                <text
                  class="todo-title"
                  :class="{ 'todo-title-done': todo.status === 'completed' }"
                >
                  {{ todo.title }}
                </text>
                <text class="muted">
                  {{ todo.petOwnerName || '未识别宠主' }} / {{ todo.petName || '未识别宠物' }} ·
                  {{ todo.status }} · {{ formatTodoDueTime(todo.dueTime) }}
                </text>
                <text class="todo-description">{{ todo.description || '无描述' }}</text>
                <text class="muted">
                  录音：{{ todo.recordingId || '未关联' }} · 结果：{{
                    todo.generationResultId || '未关联'
                  }}
                </text>
              </view>
            </view>

            <view v-if="editingTodoId === todo.id" class="todo-edit">
              <input v-model="todoDraft.title" class="input" placeholder="待办标题" />
              <textarea v-model="todoDraft.description" class="textarea" placeholder="待办描述" />
              <view class="todo-edit-grid">
                <input v-model="todoDraft.petOwnerName" class="input" placeholder="宠主姓名" />
                <input v-model="todoDraft.petName" class="input" placeholder="宠物名" />
                <input
                  v-model="todoDraft.dueTime"
                  class="input"
                  type="datetime-local"
                  placeholder="回访时间"
                />
              </view>
              <view class="toolbar-actions">
                <button class="ghost-button compact" @click="cancelTodoEdit">取消</button>
                <button class="primary-button compact" :disabled="todosLoading" @click="saveTodo">
                  保存待办
                </button>
              </view>
            </view>

            <view class="todo-actions">
              <button class="ghost-button compact" @click="startTodoEdit(todo)">编辑</button>
              <button
                class="ghost-button compact"
                :disabled="todo.status === 'completed'"
                @click="completeTodo(todo.id)"
              >
                完成
              </button>
              <button class="ghost-button compact" @click="deleteTodo(todo.id)">删除</button>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="workspace">
        <view class="panel placeholder-panel">
          <text class="section-title">{{ activePageTitle }}</text>
          <text class="muted">{{ activePlaceholderText }}</text>
        </view>

        <view v-if="activeSection === 'settings'" class="panel settings-panel">
          <view class="profile-row">
            <text class="profile-label">当前用户</text>
            <text class="profile-value">{{ currentUserLabel }}</text>
          </view>
          <view class="profile-row">
            <text class="profile-label">账号</text>
            <text class="profile-value">{{ currentUser?.username || '未获取' }}</text>
          </view>
          <view class="profile-row">
            <text class="profile-label">岗位</text>
            <text class="profile-value">{{ currentUser?.position || '未设置' }}</text>
          </view>
          <view class="profile-row">
            <text class="profile-label">城市</text>
            <text class="profile-value">{{ currentUser?.city || '未设置' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="suggestionModalVisible" class="modal-mask" @click="closeSuggestions">
      <view class="modal" @click.stop>
        <view class="modal-header">
          <view>
            <text class="section-title">AI 建议更新</text>
            <text class="muted">只有接受后才会写入 Memory。</text>
          </view>
          <button class="ghost-button compact" @click="closeSuggestions">关闭</button>
        </view>

        <view class="suggestion-create">
          <textarea
            v-model="suggestionInput"
            class="textarea"
            placeholder="输入明确长期有效的信息，例如：长期偏好先给宠主结论，再列风险提醒。"
          />
          <button
            class="primary-button compact"
            :disabled="suggestionSaving"
            @click="createSuggestion"
          >
            {{ suggestionSaving ? '识别中...' : '生成建议' }}
          </button>
        </view>

        <view v-if="pendingSuggestions.length === 0" class="empty-state">
          <text>暂无待处理建议。</text>
        </view>

        <view v-for="suggestion in pendingSuggestions" :key="suggestion.id" class="suggestion-card">
          <text class="suggestion-reason">{{ suggestion.reason }}</text>
          <text class="suggestion-content">{{ extractSuggestionText(suggestion) }}</text>
          <view class="suggestion-actions">
            <button class="ghost-button compact" @click="rejectSuggestion(suggestion.id)">
              拒绝
            </button>
            <button class="primary-button compact" @click="acceptSuggestion(suggestion.id)">
              接受并写入
            </button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="privacyModalVisible" class="modal-mask privacy-mask">
      <view class="modal privacy-modal">
        <view class="privacy-header">
          <text class="section-title">录音授权与隐私提示</text>
          <text class="muted">首次登录需确认后继续使用工作台。</text>
        </view>

        <view class="privacy-content">
          <text class="privacy-item">本产品涉及录音与 AI 生成。</text>
          <text class="privacy-item">用户应遵守所在门店和当地隐私要求。</text>
          <text class="privacy-item">录音内容仅用于生成辅助结果和业务记录。</text>
          <text class="privacy-item">医疗相关内容需人工确认。</text>
          <text class="privacy-note">
            使用录音功能时，请先获得必要沟通授权；浏览器或小程序可能会在录音开始时请求麦克风权限。
          </text>
        </view>

        <view class="privacy-actions">
          <button class="primary-button" @click="confirmPrivacyAuthorization">
            我已知晓并确认
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import {
  API_BASE_URL,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type UserProfile,
  goLogin,
  hasAcknowledgedPrivacy,
  readStoredToken,
  writePrivacyAcknowledgement,
  writeStoredToken,
} from '../../utils/auth';

type ActiveSection =
  | 'memory'
  | 'recordings'
  | 'tools'
  | 'resources'
  | 'projects'
  | 'todos'
  | 'director'
  | 'settings';
type GenerationResultType =
  | 'summary'
  | 'medical_record'
  | 'communication_review'
  | 'customer_profile'
  | 'upsell_opportunities'
  | 'smart_followup'
  | 'medical_risk_control'
  | 'team_knowledge';
type RecorderState = 'idle' | 'recording' | 'stopping';
type RecordingRetryAction = {
  label: string;
  run: () => Promise<void> | void;
};

class AppRequestError extends Error {
  public readonly code: string;
  public readonly status: number | null;

  constructor(message: string, options: { code: string; status?: number | null }) {
    super(message);
    this.code = options.code;
    this.status = options.status ?? null;
  }
}

interface MemoryResponse {
  id: string;
  userId: string;
  storeId: string | null;
  memoryType: string;
  title: string | null;
  contentText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MemorySuggestionResponse {
  id: string;
  memoryId: string | null;
  userId: string;
  beforeData: unknown;
  afterData: unknown;
  reason: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MemoryDetailResponse {
  memory: MemoryResponse | null;
  pendingSuggestions: MemorySuggestionResponse[];
}

interface MemorySuggestionsResponse {
  created: boolean;
  suggestion: MemorySuggestionResponse | null;
  pendingSuggestions: MemorySuggestionResponse[];
}

interface RecordingResponse {
  id: string;
  userId: string;
  storeId: string | null;
  audioUrl: string;
  audioFormat: string | null;
  audioDuration: number | null;
  uploadType: string;
  transcriptText: string | null;
  aiDetectedScene: string | null;
  processingStatus: string;
  petOwnerName: string | null;
  petName: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GenerationResultResponse {
  id: string;
  recordingId: string;
  userId: string;
  resultType: GenerationResultType;
  title: string;
  contentJson: unknown;
  contentText: string | null;
  moduleStatus: string;
  status: string;
  isDefaultGenerated: boolean;
  version: number;
  confirmedByUser: boolean;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RecordingDetailResponse {
  recording: RecordingResponse;
  transcriptText: string | null;
  petBinding?: {
    petOwnerName: string | null;
    petName: string | null;
  };
  generationResults: GenerationResultResponse[];
}

interface RecordingBindingUpdateResponse {
  recording: RecordingResponse;
  petBinding: {
    petOwnerName: string | null;
    petName: string | null;
  };
}

interface RecordingDefaultGenerationResponse {
  recording: RecordingResponse;
  generationResults: GenerationResultResponse[];
}

interface RecordingProactiveGenerationResponse {
  generationResult: GenerationResultResponse;
}

interface TodoResponse {
  id: string;
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
  title: string;
  description: string | null;
  petOwnerName: string | null;
  petName: string | null;
  dueTime: string | null;
  status: 'pending' | 'completed' | 'cancelled' | string;
  createdAt: string;
  updatedAt: string;
}

interface CustomToolMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface CustomToolConversationResponse {
  id: string;
  userId: string;
  messages: CustomToolMessage[];
  createdAt: string;
  updatedAt: string;
}

interface CustomToolMessageResponse {
  conversationId: string;
  userMessage: CustomToolMessage;
  assistantMessage: CustomToolMessage;
  messages: CustomToolMessage[];
}

interface CustomToolRequirementResponse {
  id: string;
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
  title: string;
  description: string | null;
  requirementJson: unknown;
  requirementText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface StructuredSection {
  key: string;
  label: string;
  value: string;
  items: string[];
  highlight?: boolean;
}

interface OpportunityCard {
  id: string;
  name: string;
  requiresDoctorConfirmation: boolean;
  fields: Array<{
    label: string;
    value: string;
  }>;
}

const activeSection = ref<ActiveSection>('memory');
const authChecked = ref(false);
const sidebarCollapsed = ref(false);
const loading = ref(false);
const saving = ref(false);
const suggestionSaving = ref(false);
const error = ref('');
const token = ref('');
const currentUser = ref<UserProfile | null>(null);
const memory = ref<MemoryResponse | null>(null);
const pendingSuggestions = ref<MemorySuggestionResponse[]>([]);
const editing = ref(false);
const draftMarkdown = ref('');
const suggestionModalVisible = ref(false);
const suggestionInput = ref('');
const recordingsLoading = ref(false);
const recordingError = ref('');
const recordingRetryAction = ref<RecordingRetryAction | null>(null);
const recordings = ref<RecordingResponse[]>([]);
const selectedRecordingId = ref('');
const recordingDetail = ref<RecordingDetailResponse | null>(null);
const activeGenerationType = ref<GenerationResultType>('medical_record');
const editingGeneration = ref(false);
const generationDraft = ref('');
const generationJsonDraft = ref('');
const editingBinding = ref(false);
const editingTranscript = ref(false);
const transcriptDraft = ref('');
const todosLoading = ref(false);
const todoError = ref('');
const todos = ref<TodoResponse[]>([]);
const editingTodoId = ref('');
const customToolLoading = ref(false);
const customToolError = ref('');
const customToolConversationId = ref('');
const customToolInput = ref('');
const customToolMessages = ref<CustomToolMessage[]>([]);
const customRequirements = ref<CustomToolRequirementResponse[]>([]);
const activeCustomRequirement = ref<CustomToolRequirementResponse | null>(null);
const customRequirementTitle = ref('');
const customRequirementDraft = ref('');
const selectedProjectPlaceholderId = ref('sample-followup');
const privacyModalVisible = ref(false);
const canUseMediaRecorder = ref(false);
const recorderState = ref<RecorderState>('idle');
const recordingActionBusy = ref(false);
const recordingProcessMessage = ref('');
const recordingStartedAt = ref<number | null>(null);
const recordingTimerText = ref('');
const audioFileInputRef = ref<HTMLInputElement | null>(null);
const customToolInputRef = ref<HTMLTextAreaElement | null>(null);
const mediaRecorderRef = ref<MediaRecorder | null>(null);
const recordingStreamRef = ref<MediaStream | null>(null);
const recordingChunksRef = ref<Blob[]>([]);
let recordingTimer: ReturnType<typeof setInterval> | null = null;

const todoDraft = reactive({
  title: '',
  description: '',
  petOwnerName: '',
  petName: '',
  dueTime: '',
});

const bindingDraft = reactive({
  petOwnerName: '',
  petName: '',
});

const generationRejectReasons = [
  '内容不准确',
  '信息不完整',
  '表达不符合医院习惯',
  '医疗判断不可靠',
  '话术不适合客户',
  '格式不符合预期',
  '其他',
] as const;

const initForm = reactive({
  city: '宁波',
  store: '宠一科技测试门店',
  position: '主治医生',
  personalBackground: '',
  workScenarios: '',
  commonTasks: '',
  preferences: '',
});

const navItems: Array<{
  key: ActiveSection;
  label: string;
  eyebrow: string;
  title: string;
  emptyText?: string;
}> = [
  {
    key: 'memory',
    label: 'AI 搭档 / Memory',
    eyebrow: '个人长期记忆',
    title: 'AI 搭档 / Memory',
  },
  {
    key: 'recordings',
    label: 'AI 录音 / 智能工牌',
    eyebrow: '接诊录音与生成结果',
    title: 'AI 录音 / 智能工牌',
  },
  {
    key: 'tools',
    label: '工具广场',
    eyebrow: '自建工具入口',
    title: '工具广场',
  },
  {
    key: 'resources',
    label: '资源库',
    eyebrow: '资料与素材沉淀',
    title: '资源库',
    emptyText: '资源库页面暂未接入业务接口。后续会集中管理病例资料、沟通话术和门店知识素材。',
  },
  {
    key: 'projects',
    label: '项目空间',
    eyebrow: '项目化资料与事项',
    title: '项目空间',
    emptyText: '项目空间页面暂未接入业务接口。后续会用于承载专项项目、条目和相关资料。',
  },
  {
    key: 'todos',
    label: '任务 / 待办',
    eyebrow: '智能回访与人工跟进',
    title: '任务 / 待办',
  },
  {
    key: 'director',
    label: '院长看板',
    eyebrow: '管理视角',
    title: '院长看板',
    emptyText: '院长看板页面暂未接入统计接口。后续会展示门店接诊、AI 使用和待办完成情况。',
  },
  {
    key: 'settings',
    label: '设置 / 个人中心',
    eyebrow: '账号与个人信息',
    title: '设置 / 个人中心',
    emptyText: '设置页面第一版仅展示当前登录用户信息。后续会接入账号、门店和偏好配置。',
  },
];

const skillCards = [
  {
    title: '接诊效率',
    description: '病历草稿、复诊总结、检查建议等一线高频工具。',
  },
  {
    title: '客户沟通',
    description: '异议处理、回访话术、价格解释和客户教育工具。',
  },
  {
    title: '门店运营',
    description: '项目复盘、任务拆解、培训沉淀和经营分析工具。',
  },
  {
    title: '知识资料',
    description: '病例资料、SOP、团队经验和资源库调用工具。',
  },
] as const;

const futureResourceTypes = ['文案', '图片', '报告', '工具生成物', '技能包输出结果'] as const;

const futureProjectAssociations = ['录音', '对话', '文件', '工具生成物', '待办', 'Memory'] as const;

const projectPlaceholders = [
  {
    id: 'sample-followup',
    name: '复诊回访项目',
    description: '用于展示项目列表占位，不代表真实项目数据。',
    detail: '后续可把录音、智能回访结果、待办和客户 Memory 归集到同一个复诊项目中。',
  },
  {
    id: 'sample-training',
    name: '团队培训项目',
    description: '用于预留项目详情页结构。',
    detail: '后续可沉淀团队经验共享、文件、技能包输出和培训待办。',
  },
] as const;

const directorMetricCards = [
  { key: 'recordingCount', label: '录音次数' },
  { key: 'medicalRecordGenerationCount', label: '病历生成次数' },
  { key: 'followupSuggestionCount', label: '回访建议数' },
  { key: 'upsellOpportunityCount', label: '升单机会数' },
  { key: 'todoCount', label: '待办事项数' },
  { key: 'pendingFollowupCustomerCount', label: '待回访客户数' },
] as const;

const generationTabs: Array<{
  type: GenerationResultType;
  label: string;
  description: string;
}> = [
  { type: 'medical_record', label: '病历自动生成', description: '默认生成的病历草稿。' },
  { type: 'communication_review', label: '沟通复盘', description: '默认生成的沟通复盘。' },
  { type: 'customer_profile', label: '客户全景画像', description: '默认生成的客户画像。' },
  { type: 'upsell_opportunities', label: '升单机会挖掘', description: '默认生成的服务机会。' },
  { type: 'smart_followup', label: '智能回访', description: '默认生成的智能回访建议。' },
  {
    type: 'medical_risk_control',
    label: '医疗风险防控',
    description: '点击确认后主动生成，用于辅助识别和提醒医疗风险，必须人工确认。',
  },
  {
    type: 'team_knowledge',
    label: '团队经验共享',
    description: '点击确认后主动生成，可用于沉淀脱敏后的病例经验和优秀话术。',
  },
];

const activeNavItem = computed(
  () => navItems.find((item) => item.key === activeSection.value) ?? navItems[0],
);
const activeEyebrow = computed(() => activeNavItem.value.eyebrow);
const activePageTitle = computed(() => activeNavItem.value.title);
const activePlaceholderText = computed(() => activeNavItem.value.emptyText ?? '该页面暂未开放。');
const activeMemory = computed(() => memory.value);
const activeProjectPlaceholder = computed(
  () =>
    projectPlaceholders.find((project) => project.id === selectedProjectPlaceholderId.value) ??
    projectPlaceholders[0],
);

const currentUserLabel = computed(() => {
  if (!currentUser.value) {
    return '未登录';
  }

  return currentUser.value.nickname ?? currentUser.value.username;
});

const currentGenerationResult = computed(() => {
  const results = recordingDetail.value?.generationResults ?? [];
  return (
    [...results]
      .filter((result) => result.resultType === activeGenerationType.value)
      .sort((left, right) => right.version - left.version)[0] ?? null
  );
});

const summaryResult = computed(() => {
  const results = recordingDetail.value?.generationResults ?? [];
  return (
    [...results]
      .filter((result) => result.resultType === 'summary')
      .sort((left, right) => right.version - left.version)[0] ?? null
  );
});

const isProactiveTab = computed(
  () =>
    activeGenerationType.value === 'medical_risk_control' ||
    activeGenerationType.value === 'team_knowledge',
);

const requiresHumanConfirmation = computed(() => {
  if (
    activeGenerationType.value === 'medical_record' ||
    activeGenerationType.value === 'medical_risk_control'
  ) {
    return true;
  }

  const text = `${currentGenerationResult.value?.title ?? ''}\n${
    currentGenerationResult.value?.contentText ?? ''
  }\n${JSON.stringify(currentGenerationResult.value?.contentJson ?? {})}`;
  return /用药|药物|剂量|处方|禁忌/.test(text);
});

const humanConfirmationText = computed(() =>
  activeGenerationType.value === 'medical_risk_control'
    ? '该内容涉及医疗风险识别，只能作为风险提醒，请由具备资质的兽医或负责人确认后使用。'
    : '该内容涉及病历、风险或用药相关判断，请由具备资质的兽医或负责人确认后使用。',
);

const activeGenerationLabel = computed(
  () => generationTabs.find((tab) => tab.type === activeGenerationType.value)?.label ?? '生成结果',
);

const activeGenerationDescription = computed(
  () =>
    generationTabs.find((tab) => tab.type === activeGenerationType.value)?.description ??
    '当前模块暂无说明。',
);

type ModuleUiState = 'loading' | 'empty' | 'error' | 'completed';

const currentModuleState = computed<ModuleUiState>(() =>
  getGenerationResultState(currentGenerationResult.value),
);

const summaryModuleState = computed<ModuleUiState>(() =>
  getGenerationResultState(summaryResult.value),
);

const emptyModuleTitle = computed(() =>
  isProactiveTab.value ? '该模块需主动生成' : '当前模块暂无结果',
);

const emptyModuleDescription = computed(() =>
  isProactiveTab.value
    ? '风险防控和团队经验共享不会默认生成，请按需点击立即生成。'
    : '当前默认模块尚未生成，可先生成默认结果。',
);

function formatAppErrorMessage(currentError: unknown, fallback: string): string {
  if (currentError instanceof AppRequestError) {
    if (currentError.code === 'NETWORK_INTERRUPTED') {
      return '网络中断，请检查网络连接后重新尝试。';
    }

    if (currentError.code === 'UNAUTHORIZED') {
      return '登录已过期，请重新登录后再继续处理。';
    }

    if (
      currentError.code === 'UNSUPPORTED_AUDIO_FORMAT' ||
      currentError.code === 'VIDEO_FILE_NOT_SUPPORTED'
    ) {
      return '文件格式不支持，请上传 MP3 / WAV / M4A 音频文件。';
    }

    return currentError.message;
  }

  if (currentError instanceof Error && currentError.message.trim()) {
    return currentError.message;
  }

  return fallback;
}

function setRecordingError(message: string, retryAction: RecordingRetryAction | null = null): void {
  recordingError.value = message;
  recordingRetryAction.value = retryAction;
}

function clearRecordingError(): void {
  recordingError.value = '';
  recordingRetryAction.value = null;
}

async function runRecordingRetryAction(): Promise<void> {
  const action = recordingRetryAction.value;
  if (!action) {
    return;
  }

  await action.run();
}

const recordButtonText = computed(() => {
  if (recordingActionBusy.value && recorderState.value !== 'recording') {
    return '处理中...';
  }

  if (recorderState.value === 'recording') {
    return '结束录音';
  }

  if (recorderState.value === 'stopping') {
    return '保存录音中...';
  }

  return '开始录音';
});

const activeContentJson = computed(() => asPlainRecord(currentGenerationResult.value?.contentJson));

const medicalRecordSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'chiefComplaint', '主诉', ['chief_complaint', '主诉']),
    buildSection(source, 'presentIllness', '现病史', ['present_illness', '现病史']),
    buildSection(source, 'pastHistory', '既往史', ['past_history', '既往史']),
    buildSection(source, 'physicalExam', '体格检查', ['physical_exam', '体格检查']),
    buildSection(source, 'preliminaryAssessment', '初步判断', [
      'preliminary_assessment',
      '初步判断',
      '初步诊断',
    ]),
    buildSection(source, 'examinationSuggestions', '检查建议', [
      'examination_suggestions',
      '检查建议',
    ]),
    buildSection(source, 'treatmentSuggestions', '治疗建议', ['treatment_suggestions', '治疗建议']),
    buildSection(source, 'doctorAdvice', '医嘱', ['doctor_advice', '医嘱']),
    buildSection(source, 'revisitSuggestion', '复诊建议', ['revisit_suggestion', '复诊建议']),
    buildSection(
      source,
      'doctorConfirmationItems',
      '待医生确认事项',
      ['doctor_confirmation_items', 'confirmationItems', 'confirmation_items', '待医生确认事项'],
      true,
    ),
  ];
});

const communicationReviewSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'communicationCompleteness', '沟通完整度', [
      'communication_completeness',
      '沟通完整度',
    ]),
    buildSection(source, 'followUpQuestions', '追问充分度', [
      'follow_up_questions',
      '是否充分追问',
    ]),
    buildSection(source, 'ownerConcerns', '宠主疑虑点', ['owner_concerns', '宠主疑虑点']),
    buildSection(source, 'priceSensitivity', '价格敏感点', ['price_sensitivity', '价格敏感点']),
    buildSection(source, 'riskDisclosure', '风险告知', ['risk_disclosure', '风险告知']),
    buildSection(source, 'objectionHandling', '异议处理', ['objection_handling', '异议处理']),
    buildSection(source, 'clarity', '表达清晰度', ['表达清晰度']),
    buildSection(source, 'improvedScripts', '可改进话术', ['improved_scripts', '可改进话术'], true),
  ];
});

const customerProfileSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'petOwnerName', '宠主姓名', ['pet_owner_name', '宠主姓名']),
    buildSection(source, 'petName', '宠物姓名', ['pet_name', '宠物姓名', '宠物名']),
    buildSection(source, 'breed', '品种', ['品种']),
    buildSection(source, 'age', '年龄', ['年龄']),
    buildSection(source, 'mainMedicalHistory', '主要病史', ['main_medical_history', '主要病史']),
    buildSection(source, 'medicationContraindications', '用药禁忌', [
      'medication_contraindications',
      '用药禁忌',
    ]),
    buildSection(source, 'carePhilosophy', '养护理念', ['care_philosophy', '养护理念']),
    buildSection(source, 'priceSensitivity', '价格敏感度', ['price_sensitivity', '价格敏感度']),
    buildSection(source, 'examinationAcceptance', '检查接受度', [
      'examination_acceptance',
      '检查接受度',
    ]),
    buildSection(source, 'communicationPreference', '沟通偏好', [
      'communication_preference',
      '沟通偏好',
    ]),
    buildSection(source, 'potentialNeeds', '潜在需求', ['potential_needs', '潜在需求']),
    buildSection(source, 'followUpFocus', '回访关注点', ['follow_up_focus', '回访关注点']),
  ];
});

const upsellOpportunityCards = computed<OpportunityCard[]>(() => {
  const source = activeContentJson.value;
  const rawOpportunities =
    readArrayValue(source, 'opportunities', 'opportunityList', 'opportunity_list', '机会列表') ??
    [];
  const records = rawOpportunities.map(asPlainRecord).filter((item) => Object.keys(item).length);

  if (records.length === 0 && currentGenerationResult.value?.contentText) {
    return [
      {
        id: 'fallback-opportunity',
        name: '服务机会',
        requiresDoctorConfirmation: false,
        fields: [
          {
            label: '原始内容',
            value: currentGenerationResult.value.contentText,
          },
        ],
      },
    ];
  }

  return records.map((item, index) => {
    const requiresDoctorConfirmation = readBooleanValue(
      item,
      'requiresDoctorConfirmation',
      'requires_doctor_confirmation',
      '是否需要医生确认',
    );
    return {
      id: `opportunity-${index}`,
      name:
        readStringValue(item, 'opportunityName', 'opportunity_name', '机会名称') ||
        `机会 ${index + 1}`,
      requiresDoctorConfirmation,
      fields: [
        {
          label: '触发依据',
          value: readStringValue(item, 'triggerEvidence', 'trigger_evidence', '触发依据'),
        },
        {
          label: '推荐理由',
          value: readStringValue(item, 'recommendationReason', 'recommendation_reason', '推荐理由'),
        },
        {
          label: '推荐话术',
          value: readStringValue(item, 'recommendationScript', 'recommendation_script', '推荐话术'),
        },
        {
          label: '注意事项',
          value: readStringValue(item, 'cautions', '注意事项'),
        },
        {
          label: '是否需要医生确认',
          value: requiresDoctorConfirmation ? '是' : '否',
        },
      ],
    };
  });
});

const smartFollowupSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'followUpTarget', '回访对象', [
      'follow_up_target',
      'petOwnerName',
      'pet_owner_name',
      '回访对象',
    ]),
    buildSection(source, 'petName', '宠物名', ['pet_name', '宠物名']),
    buildSection(source, 'followUpNode', '回访节点', ['follow_up_node', '回访节点']),
    buildSection(source, 'followUpReason', '回访原因', ['follow_up_reason', '回访原因']),
    buildSection(source, 'suggestedFollowUpTime', '建议回访时间', [
      'suggested_follow_up_time',
      '建议回访时间',
    ]),
    buildSection(source, 'cautions', '注意事项', ['注意事项']),
    buildSection(source, 'needsRevisitReminder', '是否需要复诊提醒', [
      'needs_revisit_reminder',
      '是否需要复诊提醒',
    ]),
  ];
});

const smartFollowupScript = computed(() =>
  readStringValue(activeContentJson.value, 'followUpScript', 'follow_up_script', '回访话术'),
);

const medicalRiskSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'anesthesiaRisk', '麻醉风险', ['anesthesia_risk', '麻醉风险']),
    buildSection(source, 'surgeryRisk', '手术风险', ['surgery_risk', '手术风险']),
    buildSection(source, 'criticalCareRisk', '重症风险', ['critical_care_risk', '重症风险']),
    buildSection(source, 'transfusionRisk', '输血风险', ['transfusion_risk', '输血风险']),
    buildSection(source, 'invasiveExamRisk', '侵入性检查风险', [
      'invasive_exam_risk',
      '侵入性检查风险',
    ]),
    buildSection(source, 'feeDisputeRisk', '费用争议风险', ['fee_dispute_risk', '费用争议风险']),
    buildSection(source, 'ownerUnderstandingRisk', '宠主未充分理解风险', [
      'owner_understanding_risk',
      '宠主未充分理解的风险',
    ]),
    buildSection(source, 'riskDisclosureCompleteness', '风险告知完整性', [
      'risk_disclosure_completeness',
      '风险告知是否完整',
    ]),
    buildSection(
      source,
      'confirmationItems',
      '待补充确认内容',
      ['confirmation_items', '待补充确认内容', '需要补充确认的内容'],
      true,
    ),
  ];
});

const teamKnowledgeSections = computed<StructuredSection[]>(() => {
  const source = activeContentJson.value;
  return [
    buildSection(source, 'caseSummary', '典型病例', ['case_summary', '典型病例摘要', '典型病例']),
    buildSection(source, 'excellentScripts', '优秀话术', ['excellent_scripts', '优秀话术']),
    buildSection(source, 'handlingPath', '处置路径', ['handling_path', '处置路径']),
    buildSection(source, 'communicationTips', '沟通技巧', ['communication_tips', '沟通技巧']),
    buildSection(source, 'reusableExperience', '可沉淀经验', ['reusable_experience', '可沉淀经验']),
    buildSection(source, 'desensitizationSuggestions', '脱敏建议', [
      'desensitization_suggestions',
      '脱敏建议',
    ]),
  ];
});

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token.value) {
    headers.set('Authorization', `Bearer ${token.value}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new AppRequestError('网络中断，请检查网络连接后重新尝试。', {
      code: 'NETWORK_INTERRUPTED',
    });
  }

  const result = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      token.value = '';
      currentUser.value = null;
      writeStoredToken('');
      goLogin();
    }
    throw new AppRequestError(result.success ? `HTTP ${response.status}` : result.error.message, {
      code: result.success ? `HTTP_${response.status}` : result.error.code,
      status: response.status,
    });
  }

  return result.data;
}

async function apiUploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();

  if (token.value) {
    headers.set('Authorization', `Bearer ${token.value}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new AppRequestError('网络中断，请检查网络连接后重新尝试。', {
      code: 'NETWORK_INTERRUPTED',
    });
  }

  const result = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      token.value = '';
      currentUser.value = null;
      writeStoredToken('');
      goLogin();
    }
    throw new AppRequestError(result.success ? `HTTP ${response.status}` : result.error.message, {
      code: result.success ? `HTTP_${response.status}` : result.error.code,
      status: response.status,
    });
  }

  return result.data;
}

async function ensureAuthenticated(): Promise<void> {
  token.value = readStoredToken();
  if (!token.value) {
    goLogin();
    throw new Error('请先登录');
  }
}

async function loadCurrentUser(): Promise<void> {
  try {
    await ensureAuthenticated();
    currentUser.value = await apiRequest<UserProfile>('/auth/me');
    syncPrivacyAuthorization();
  } catch {
    token.value = '';
    writeStoredToken('');
    currentUser.value = null;
    privacyModalVisible.value = false;
    goLogin();
    throw new Error('登录状态已失效，请重新登录');
  }
}

function syncPrivacyAuthorization(): void {
  privacyModalVisible.value = Boolean(
    currentUser.value && !hasAcknowledgedPrivacy(currentUser.value.id),
  );
}

function confirmPrivacyAuthorization(): void {
  if (!currentUser.value) {
    return;
  }

  writePrivacyAcknowledgement(currentUser.value.id);
  privacyModalVisible.value = false;
}

async function loadMemory(): Promise<void> {
  loading.value = true;
  error.value = '';

  try {
    await loadCurrentUser();
    const result = await apiRequest<MemoryDetailResponse>('/memory');
    memory.value = result.memory;
    pendingSuggestions.value = result.pendingSuggestions;
    draftMarkdown.value = result.memory?.contentText ?? '';
    editing.value = false;
  } catch (currentError) {
    error.value = `无法读取 Memory：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    loading.value = false;
  }
}

async function refreshCurrentSection(): Promise<void> {
  if (activeSection.value === 'memory') {
    await loadMemory();
    return;
  }

  if (activeSection.value === 'todos') {
    await loadTodos();
    return;
  }

  if (activeSection.value === 'tools') {
    await loadCustomRequirements();
    return;
  }

  await loadRecordings();
}

async function switchSection(section: ActiveSection): Promise<void> {
  activeSection.value = section;
  sidebarCollapsed.value = false;
  if (section === 'recordings' && recordings.value.length === 0) {
    await loadRecordings();
  }

  if (section === 'todos') {
    await loadTodos();
  }

  if (section === 'tools') {
    await loadCustomRequirements();
  }
}

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

async function logout(): Promise<void> {
  try {
    if (token.value) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    }
  } catch {
    // Stateless JWT logout can continue locally even if the API is unavailable.
  } finally {
    token.value = '';
    currentUser.value = null;
    writeStoredToken('');
    goLogin();
  }
}

async function initMemory(): Promise<void> {
  saving.value = true;
  error.value = '';

  try {
    const result = await apiRequest<MemoryResponse>('/memory/init', {
      method: 'POST',
      body: JSON.stringify(initForm),
    });
    memory.value = result;
    draftMarkdown.value = result.contentText ?? '';
  } catch (currentError) {
    error.value = `创建 Memory 失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    saving.value = false;
  }
}

function toggleEdit(): void {
  editing.value = !editing.value;
  draftMarkdown.value = memory.value?.contentText ?? '';
}

async function saveMemory(): Promise<void> {
  saving.value = true;
  error.value = '';

  try {
    const result = await apiRequest<MemoryResponse>('/memory', {
      method: 'PUT',
      body: JSON.stringify({
        contentText: draftMarkdown.value,
      }),
    });
    memory.value = result;
    draftMarkdown.value = result.contentText ?? '';
    editing.value = false;
  } catch (currentError) {
    error.value = `保存 Memory 失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    saving.value = false;
  }
}

async function openSuggestions(): Promise<void> {
  suggestionModalVisible.value = true;
  await refreshSuggestions();
}

function closeSuggestions(): void {
  suggestionModalVisible.value = false;
}

async function refreshSuggestions(): Promise<void> {
  const result = await apiRequest<MemorySuggestionsResponse>('/memory/suggestions', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  pendingSuggestions.value = result.pendingSuggestions;
}

async function createSuggestion(): Promise<void> {
  suggestionSaving.value = true;

  try {
    const result = await apiRequest<MemorySuggestionsResponse>('/memory/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        longTermInfo: suggestionInput.value,
      }),
    });
    pendingSuggestions.value = result.pendingSuggestions;
    suggestionInput.value = '';
  } catch (currentError) {
    error.value = `生成建议失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    suggestionSaving.value = false;
  }
}

async function acceptSuggestion(id: string): Promise<void> {
  const result = await apiRequest<{ memory: MemoryResponse; suggestion: MemorySuggestionResponse }>(
    `/memory/suggestions/${id}/accept`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  memory.value = result.memory;
  draftMarkdown.value = result.memory.contentText ?? '';
  pendingSuggestions.value = pendingSuggestions.value.filter((item) => item.id !== id);
}

async function rejectSuggestion(id: string): Promise<void> {
  await apiRequest<MemorySuggestionResponse>(`/memory/suggestions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  pendingSuggestions.value = pendingSuggestions.value.filter((item) => item.id !== id);
}

function checkMediaRecorderSupport(): void {
  canUseMediaRecorder.value = Boolean(
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    'MediaRecorder' in window,
  );
}

function getPreferredRecorderMimeType(): string | undefined {
  const candidates = [
    'audio/mp4',
    'audio/m4a',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function startRecordingTimer(): void {
  recordingStartedAt.value = Date.now();
  recordingTimerText.value = '录音中 00:00';
  if (recordingTimer) {
    clearInterval(recordingTimer);
  }

  recordingTimer = setInterval(() => {
    if (!recordingStartedAt.value) {
      recordingTimerText.value = '';
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - recordingStartedAt.value) / 1000));
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    recordingTimerText.value = `录音中 ${minutes}:${seconds}`;
  }, 1000);
}

function stopRecordingTimer(): void {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function cleanupRecordingStream(): void {
  recordingStreamRef.value?.getTracks().forEach((track) => track.stop());
  recordingStreamRef.value = null;
}

async function toggleRecording(): Promise<void> {
  if (recorderState.value === 'recording') {
    stopRecording();
    return;
  }

  await startRecording();
}

async function startRecording(): Promise<void> {
  if (!canUseMediaRecorder.value) {
    setRecordingError('当前浏览器不支持录音，请改用上传 MP3 / WAV / M4A 音频。');
    return;
  }

  const consentConfirmed = await confirmModal(
    '录音同意确认',
    '开始录音前，请确认已取得沟通对象同意，并会遵守门店及当地隐私要求。是否继续？',
  );
  if (!consentConfirmed) {
    return;
  }

  recordingActionBusy.value = true;
  clearRecordingError();
  recordingProcessMessage.value = '正在请求麦克风权限...';

  try {
    await ensureAuthenticated();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredMimeType = getPreferredRecorderMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    recordingChunksRef.value = [];
    recordingStreamRef.value = stream;
    mediaRecorderRef.value = recorder;
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordingChunksRef.value.push(event.data);
      }
    };
    recorder.onerror = () => {
      setRecordingError('录音失败：录音过程中发生错误，请重新尝试或改为上传音频。', {
        label: '重新尝试录音',
        run: startRecording,
      });
      stopRecordingTimer();
      cleanupRecordingStream();
      recorderState.value = 'idle';
      recordingActionBusy.value = false;
    };
    recorder.onstop = () => {
      void handleRecordingStopped(recorder.mimeType || preferredMimeType || 'audio/webm');
    };

    recorder.start();
    recorderState.value = 'recording';
    recordingProcessMessage.value = '正在录音，结束后会自动上传并生成结果。';
    startRecordingTimer();
  } catch (currentError) {
    setRecordingError(
      `录音失败：${formatAppErrorMessage(currentError, '请检查浏览器麦克风权限后重新尝试。')}`,
      {
        label: '重新尝试录音',
        run: startRecording,
      },
    );
    cleanupRecordingStream();
    recorderState.value = 'idle';
  } finally {
    recordingActionBusy.value = false;
  }
}

function stopRecording(): void {
  const recorder = mediaRecorderRef.value;
  if (!recorder || recorder.state === 'inactive') {
    return;
  }

  recorderState.value = 'stopping';
  recordingProcessMessage.value = '正在保存录音...';
  recorder.stop();
}

async function handleRecordingStopped(mimeType: string): Promise<void> {
  stopRecordingTimer();
  cleanupRecordingStream();
  recordingActionBusy.value = true;
  recordingProcessMessage.value = '正在转换录音并上传...';

  try {
    const durationSeconds = recordingStartedAt.value
      ? Math.max(1, Math.round((Date.now() - recordingStartedAt.value) / 1000))
      : null;
    const recordedBlob = new Blob(recordingChunksRef.value, { type: mimeType });
    if (recordedBlob.size === 0) {
      throw new Error('录音文件为空，请重新录制');
    }

    const audioFile = await convertRecordedBlobToWavFile(recordedBlob);
    const recording = await uploadAudioFile(audioFile, {
      durationSeconds,
      uploadType: 'web_recording',
    });
    await processUploadedRecording(recording.id);
    uni.showToast({ title: '录音已上传', icon: 'success' });
  } catch (currentError) {
    const existingError = recordingError.value;
    const existingRetryAction = recordingRetryAction.value;
    await loadRecordings();
    if (existingRetryAction) {
      recordingError.value = existingError;
      recordingRetryAction.value = existingRetryAction;
    } else if (!recordingError.value) {
      setRecordingError(`上传失败：${formatAppErrorMessage(currentError, '录音上传失败。')}`, {
        label: '重新尝试录音',
        run: startRecording,
      });
    }
  } finally {
    mediaRecorderRef.value = null;
    recordingChunksRef.value = [];
    recordingStartedAt.value = null;
    recordingTimerText.value = '';
    recorderState.value = 'idle';
    recordingActionBusy.value = false;
    recordingProcessMessage.value = '';
  }
}

async function convertRecordedBlobToWavFile(blob: Blob): Promise<File> {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error('当前浏览器无法转换录音格式，请改用上传音频');
  }

  const audioContext = new AudioContextConstructor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const wavBuffer = encodeAudioBufferToWav(audioBuffer);
    return new File([wavBuffer], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

function writeWavString(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeAudioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels = Array.from({ length: channelCount }, (_, index) =>
    audioBuffer.getChannelData(index),
  );
  for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channelIndex][sampleIndex] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return buffer;
}

function openAudioFilePicker(): void {
  audioFileInputRef.value?.click();
}

async function handleAudioFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;
  if (input) {
    input.value = '';
  }
  if (!file) {
    return;
  }

  await handleLocalAudioUpload(file);
}

function isSupportedAudioFile(file: File): boolean {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  const supportedExtensions = ['.mp3', '.wav', '.m4a'];
  const supportedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
  ];

  return supportedExtensions.includes(extension) || supportedMimeTypes.includes(file.type);
}

async function handleLocalAudioUpload(file: File): Promise<void> {
  clearRecordingError();
  if (file.type.startsWith('video/')) {
    setRecordingError('文件格式不支持：不支持视频文件，请上传 MP3 / WAV / M4A 音频。', {
      label: '重新选择文件',
      run: openAudioFilePicker,
    });
    return;
  }

  if (!isSupportedAudioFile(file)) {
    setRecordingError('文件格式不支持：仅支持上传 MP3 / WAV / M4A 音频文件。', {
      label: '重新选择文件',
      run: openAudioFilePicker,
    });
    return;
  }

  recordingActionBusy.value = true;
  recordingProcessMessage.value = '正在上传本地音频...';

  try {
    await ensureAuthenticated();
    const recording = await uploadAudioFile(file, {
      durationSeconds: null,
      uploadType: 'web_upload',
    });
    await processUploadedRecording(recording.id);
    uni.showToast({ title: '音频已上传', icon: 'success' });
  } catch (currentError) {
    const existingError = recordingError.value;
    const existingRetryAction = recordingRetryAction.value;
    await loadRecordings();
    if (existingRetryAction) {
      recordingError.value = existingError;
      recordingRetryAction.value = existingRetryAction;
    } else if (!recordingError.value) {
      setRecordingError(`上传失败：${formatAppErrorMessage(currentError, '音频上传失败。')}`, {
        label: '重新选择文件',
        run: openAudioFilePicker,
      });
    }
  } finally {
    recordingActionBusy.value = false;
    recordingProcessMessage.value = '';
  }
}

async function uploadAudioFile(
  file: File,
  options: { durationSeconds: number | null; uploadType: 'web_recording' | 'web_upload' },
): Promise<RecordingResponse> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('uploadType', options.uploadType);
  if (options.durationSeconds !== null) {
    formData.append('durationSeconds', String(options.durationSeconds));
  }

  return apiUploadRequest<RecordingResponse>('/recordings/upload', formData);
}

async function processUploadedRecording(recordingId: string): Promise<void> {
  selectedRecordingId.value = recordingId;
  recordingProcessMessage.value = '上传成功，正在转写...';
  try {
    await apiRequest(`/recordings/${recordingId}/transcribe`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } catch (currentError) {
    await loadRecordings();
    setRecordingError(
      `转写失败：${formatAppErrorMessage(currentError, '语音转写失败，请重新尝试。')}`,
      {
        label: '重新处理',
        run: () => retryRecordingProcess(recordingId),
      },
    );
    throw currentError;
  }

  recordingProcessMessage.value = '转写完成，正在生成默认结果...';
  try {
    await apiRequest<RecordingDefaultGenerationResponse>(
      `/recordings/${recordingId}/generate-default-results`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  } catch (currentError) {
    await loadRecordings();
    selectedRecordingId.value = recordingId;
    await loadRecordingDetail();
    setRecordingError(
      `AI 生成失败：${formatAppErrorMessage(currentError, 'AI 生成失败，请重新处理。')}`,
      {
        label: '重新处理',
        run: () => retryRecordingProcess(recordingId),
      },
    );
    throw currentError;
  }
  await loadRecordings();
  selectedRecordingId.value = recordingId;
  await loadRecordingDetail();
  activeGenerationType.value = 'medical_record';
  syncGenerationDraft();
}

async function retryRecordingProcess(recordingId: string): Promise<void> {
  recordingActionBusy.value = true;
  clearRecordingError();
  recordingProcessMessage.value = '正在重新尝试...';

  try {
    await apiRequest<RecordingResponse>(`/recordings/${recordingId}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const detail = await apiRequest<RecordingDetailResponse>(`/recordings/${recordingId}`);
    if (!detail.transcriptText?.trim()) {
      recordingProcessMessage.value = '正在重新转写...';
      await apiRequest(`/recordings/${recordingId}/transcribe`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    }

    recordingProcessMessage.value = '正在重新生成默认结果...';
    await apiRequest<RecordingDefaultGenerationResponse>(
      `/recordings/${recordingId}/generate-default-results`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    await loadRecordings();
    selectedRecordingId.value = recordingId;
    await loadRecordingDetail();
    activeGenerationType.value = 'medical_record';
    syncGenerationDraft();
  } catch (currentError) {
    await loadRecordings();
    setRecordingError(
      `重新处理失败：${formatAppErrorMessage(currentError, '重新处理失败，请稍后再试。')}`,
      {
        label: '再次重新处理',
        run: () => retryRecordingProcess(recordingId),
      },
    );
  } finally {
    recordingActionBusy.value = false;
    recordingProcessMessage.value = '';
  }
}

function formatRecordingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    uploading: '上传中',
    uploaded: '已上传',
    transcribing: '转写中',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };

  return statusMap[status] ?? status;
}

function formatRecordingCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间异常';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFullDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间异常';
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAudioDuration(value: number | null): string {
  if (!value || value <= 0) {
    return '未记录';
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

function formatGenerationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    saved: '已保存',
    adopted: '已采纳',
    rejected: '未采纳',
    regenerated: '已重新生成',
    confirmed: '已确认',
  };

  return statusMap[status] ?? status;
}

function getGenerationResultState(result: GenerationResultResponse | null): ModuleUiState {
  if (!result) {
    return 'empty';
  }

  if (result.moduleStatus === 'generating' || result.moduleStatus === 'pending') {
    return 'loading';
  }

  if (result.moduleStatus === 'failed') {
    return 'error';
  }

  if (!result.contentText?.trim()) {
    return 'empty';
  }

  return 'completed';
}

function getGenerationTabState(type: GenerationResultType): ModuleUiState {
  const result =
    [...(recordingDetail.value?.generationResults ?? [])]
      .filter((item) => item.resultType === type)
      .sort((left, right) => right.version - left.version)[0] ?? null;

  return getGenerationResultState(result);
}

function formatModuleState(state: ModuleUiState): string {
  const stateMap: Record<ModuleUiState, string> = {
    loading: 'loading',
    empty: 'empty',
    error: 'error',
    completed: 'completed',
  };

  return stateMap[state];
}

function syncGenerationDraft(): void {
  generationDraft.value = currentGenerationResult.value?.contentText ?? '';
  generationJsonDraft.value = currentGenerationResult.value
    ? JSON.stringify(currentGenerationResult.value.contentJson ?? {}, null, 2)
    : '';
  editingGeneration.value = false;
}

function syncRecordingDrafts(): void {
  bindingDraft.petOwnerName = recordingDetail.value?.recording.petOwnerName ?? '';
  bindingDraft.petName = recordingDetail.value?.recording.petName ?? '';
  transcriptDraft.value = recordingDetail.value?.transcriptText ?? '';
  editingBinding.value = false;
  editingTranscript.value = false;
}

async function loadRecordings(): Promise<void> {
  recordingsLoading.value = true;
  clearRecordingError();

  try {
    await loadCurrentUser();
    recordings.value = await apiRequest<RecordingResponse[]>('/recordings');
    if (!selectedRecordingId.value && recordings.value[0]) {
      selectedRecordingId.value = recordings.value[0].id;
    }
    if (selectedRecordingId.value) {
      await loadRecordingDetail();
    }
  } catch (currentError) {
    setRecordingError(`无法读取录音：${formatAppErrorMessage(currentError, '读取录音失败。')}`, {
      label: '重新加载',
      run: loadRecordings,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

async function loadRecordingDetail(): Promise<void> {
  if (!selectedRecordingId.value.trim()) {
    setRecordingError('请先输入或选择录音 ID。');
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    recordingDetail.value = await apiRequest<RecordingDetailResponse>(
      `/recordings/${selectedRecordingId.value.trim()}`,
    );
    syncRecordingDrafts();
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(
      `无法读取录音详情：${formatAppErrorMessage(currentError, '读取录音详情失败。')}`,
      {
        label: '重新加载详情',
        run: loadRecordingDetail,
      },
    );
  } finally {
    recordingsLoading.value = false;
  }
}

async function selectRecording(id: string): Promise<void> {
  selectedRecordingId.value = id;
  await loadRecordingDetail();
}

function selectGenerationTab(type: GenerationResultType): void {
  activeGenerationType.value = type;
  syncGenerationDraft();
}

async function generateDefaultResults(): Promise<void> {
  if (!recordingDetail.value) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    const result = await apiRequest<RecordingDefaultGenerationResponse>(
      `/recordings/${recordingDetail.value.recording.id}/generate-default-results`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    await loadRecordingDetail();
    activeGenerationType.value =
      (result.generationResults.find((item) => item.resultType !== 'summary')?.resultType as
        | GenerationResultType
        | undefined) ?? 'medical_record';
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(`AI 生成失败：${formatAppErrorMessage(currentError, '默认生成失败。')}`, {
      label: '重新生成默认结果',
      run: generateDefaultResults,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

function toggleBindingEdit(): void {
  editingBinding.value = !editingBinding.value;
  bindingDraft.petOwnerName = recordingDetail.value?.recording.petOwnerName ?? '';
  bindingDraft.petName = recordingDetail.value?.recording.petName ?? '';
}

async function saveRecordingBinding(): Promise<void> {
  if (!recordingDetail.value) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    const result = await apiRequest<RecordingBindingUpdateResponse>(
      `/recordings/${recordingDetail.value.recording.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          petOwnerName: bindingDraft.petOwnerName,
          petName: bindingDraft.petName,
        }),
      },
    );
    recordingDetail.value = {
      ...recordingDetail.value,
      recording: result.recording,
      petBinding: result.petBinding,
      transcriptText: result.recording.transcriptText,
    };
    const index = recordings.value.findIndex((item) => item.id === result.recording.id);
    if (index >= 0) {
      recordings.value[index] = result.recording;
    }
    syncRecordingDrafts();
    uni.showToast({ title: '绑定已保存', icon: 'success' });
  } catch (currentError) {
    setRecordingError(`保存宠主 / 宠物失败：${formatAppErrorMessage(currentError, '保存失败。')}`, {
      label: '重新保存',
      run: saveRecordingBinding,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

function toggleTranscriptEdit(): void {
  editingTranscript.value = !editingTranscript.value;
  transcriptDraft.value = recordingDetail.value?.transcriptText ?? '';
}

async function saveTranscript(): Promise<void> {
  if (!recordingDetail.value) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    await apiRequest(`/recordings/${recordingDetail.value.recording.id}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({
        transcriptText: transcriptDraft.value,
      }),
    });
    await loadRecordingDetail();
    uni.showToast({ title: '转写已保存', icon: 'success' });
  } catch (currentError) {
    setRecordingError(`保存转写文本失败：${formatAppErrorMessage(currentError, '保存失败。')}`, {
      label: '重新保存',
      run: saveTranscript,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

function confirmModal(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false),
    });
  });
}

async function generateActiveProactiveModule(): Promise<void> {
  if (!recordingDetail.value || !isProactiveTab.value) {
    return;
  }

  const confirmed = await confirmModal(
    '确认主动生成',
    activeGenerationType.value === 'medical_risk_control'
      ? '该模块仅用于 AI 辅助识别和提醒医疗风险，生成后仍需医生人工确认。是否继续？'
      : '该模块会生成可供团队复盘的脱敏经验内容。是否继续？',
  );
  if (!confirmed) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    const path =
      activeGenerationType.value === 'medical_risk_control'
        ? `/recordings/${recordingDetail.value.recording.id}/generate-risk-control`
        : `/recordings/${recordingDetail.value.recording.id}/generate-team-knowledge`;
    await apiRequest<RecordingProactiveGenerationResponse>(path, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await loadRecordingDetail();
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(`AI 生成失败：${formatAppErrorMessage(currentError, '主动生成失败。')}`, {
      label: '重新生成',
      run: generateActiveProactiveModule,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

function toggleGenerationEdit(): void {
  editingGeneration.value = !editingGeneration.value;
  generationDraft.value = currentGenerationResult.value?.contentText ?? '';
  generationJsonDraft.value = currentGenerationResult.value
    ? JSON.stringify(currentGenerationResult.value.contentJson ?? {}, null, 2)
    : '';
}

async function saveGenerationResult(): Promise<void> {
  if (!recordingDetail.value || !currentGenerationResult.value) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    let parsedContentJson: unknown = currentGenerationResult.value.contentJson;
    if (generationJsonDraft.value.trim()) {
      parsedContentJson = JSON.parse(generationJsonDraft.value);
    }

    await apiRequest<GenerationResultResponse>(
      `/generation-results/${currentGenerationResult.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: currentGenerationResult.value.title,
          contentText: generationDraft.value,
          contentJson: parsedContentJson,
          confirmedByUser: currentGenerationResult.value.confirmedByUser,
        }),
      },
    );
    await loadRecordingDetail();
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(`保存生成结果失败：${formatAppErrorMessage(currentError, '保存失败。')}`, {
      label: '重新保存',
      run: saveGenerationResult,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

async function adoptGenerationResult(): Promise<void> {
  await updateGenerationFeedback('adopt', null);
}

async function rejectGenerationResult(): Promise<void> {
  const reason = await chooseRejectReason();
  if (!reason) {
    return;
  }

  await updateGenerationFeedback('reject', reason);
}

function chooseRejectReason(): Promise<string | null> {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList: [...generationRejectReasons],
      success: (result) => resolve(generationRejectReasons[result.tapIndex] ?? null),
      fail: () => resolve(null),
    });
  });
}

async function regenerateGenerationResult(): Promise<void> {
  if (!recordingDetail.value || !currentGenerationResult.value) {
    return;
  }

  const confirmed = await confirmModal(
    '确认重新生成',
    requiresHumanConfirmation.value
      ? '重新生成后会覆盖当前内容并增加版本号，医疗相关内容仍需医生人工确认。是否继续？'
      : '重新生成后会覆盖当前内容并增加版本号。是否继续？',
  );
  if (!confirmed) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    await apiRequest<GenerationResultResponse>(
      `/generation-results/${currentGenerationResult.value.id}/regenerate`,
      {
        method: 'POST',
        body: JSON.stringify({
          reason: '重新生成',
        }),
      },
    );
    await loadRecordingDetail();
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(`AI 生成失败：${formatAppErrorMessage(currentError, '重新生成失败。')}`, {
      label: '重新尝试',
      run: regenerateGenerationResult,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

async function updateGenerationFeedback(
  action: 'adopt' | 'reject',
  reason: string | null,
): Promise<void> {
  if (!recordingDetail.value || !currentGenerationResult.value) {
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    await apiRequest<GenerationResultResponse>(
      `/generation-results/${currentGenerationResult.value.id}/${action}`,
      {
        method: 'POST',
        body: JSON.stringify({
          reason,
        }),
      },
    );
    await loadRecordingDetail();
    syncGenerationDraft();
  } catch (currentError) {
    setRecordingError(
      `更新采纳状态失败：${formatAppErrorMessage(currentError, '更新采纳状态失败。')}`,
      {
        label: '重新提交',
        run: () => updateGenerationFeedback(action, reason),
      },
    );
  } finally {
    recordingsLoading.value = false;
  }
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readUnknownValue(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
}

function stringifyStructuredValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(stringifyStructuredValue).filter(Boolean).join('；');
  }

  return JSON.stringify(value, null, 2);
}

function readStringValue(source: Record<string, unknown>, ...keys: string[]): string {
  return stringifyStructuredValue(readUnknownValue(source, ...keys));
}

function readArrayValue(source: Record<string, unknown>, ...keys: string[]): unknown[] | null {
  const value = readUnknownValue(source, ...keys);
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[；;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return null;
}

function readBooleanValue(source: Record<string, unknown>, ...keys: string[]): boolean {
  const value = readUnknownValue(source, ...keys);
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '是', '需要', '需确认', 'yes'].includes(value.trim().toLowerCase());
  }

  return false;
}

function buildSection(
  source: Record<string, unknown>,
  key: string,
  label: string,
  aliases: string[] = [],
  highlight = false,
): StructuredSection {
  const keys = [key, ...aliases];
  const arrayValue = readArrayValue(source, ...keys);
  const items = arrayValue?.map(stringifyStructuredValue).filter(Boolean) ?? [];

  return {
    key,
    label,
    value: items.length > 0 ? '' : readStringValue(source, ...keys),
    items,
    highlight,
  };
}

function readJsonString(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function flattenSectionsForExport(sections: StructuredSection[]): string {
  return sections
    .map((section) => {
      const content =
        section.items.length > 0
          ? section.items.map((item) => `- ${item}`).join('\n')
          : section.value;
      return `${section.label}\n${content || '待补充'}`;
    })
    .join('\n\n');
}

function getCurrentResultExportText(): string {
  if (!currentGenerationResult.value) {
    return '';
  }

  switch (activeGenerationType.value) {
    case 'medical_record':
      return flattenSectionsForExport(medicalRecordSections.value);
    case 'communication_review':
      return flattenSectionsForExport(communicationReviewSections.value);
    case 'customer_profile':
      return flattenSectionsForExport(customerProfileSections.value);
    case 'smart_followup':
      return `${flattenSectionsForExport(smartFollowupSections.value)}\n\n回访话术\n${
        smartFollowupScript.value || '待补充'
      }`;
    case 'medical_risk_control':
      return flattenSectionsForExport(medicalRiskSections.value);
    case 'team_knowledge':
      return flattenSectionsForExport(teamKnowledgeSections.value);
    case 'upsell_opportunities':
      return upsellOpportunityCards.value
        .map((opportunity) =>
          [
            opportunity.name,
            ...opportunity.fields.map((field) => `${field.label}：${field.value || '待补充'}`),
          ].join('\n'),
        )
        .join('\n\n');
    default:
      return currentGenerationResult.value.contentText ?? '';
  }
}

interface ExportSection {
  label: string;
  content: string;
  highlight?: boolean;
}

interface ExportDocument {
  title: string;
  subtitle: string;
  metas: Array<{ label: string; value: string }>;
  notices: string[];
  sections: ExportSection[];
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildExportFileName(extension: string): string {
  const label = activeGenerationLabel.value.replace(/[\\/:*?"<>|]/g, '');
  return `${label || '生成结果'}-${Date.now()}.${extension}`;
}

function sectionToExportContent(section: StructuredSection): string {
  return section.items.length > 0 ? section.items.join('\n') : section.value || '待补充';
}

function sectionsToExportSections(sections: StructuredSection[]): ExportSection[] {
  return sections.map((section) => ({
    label: section.label,
    content: sectionToExportContent(section),
    highlight: section.highlight,
  }));
}

function readRecordingPetOwnerName(): string {
  const recording = recordingDetail.value?.recording;
  const profileOwner = customerProfileSections.value.find(
    (section) => section.key === 'petOwnerName',
  );
  return recording?.petOwnerName || profileOwner?.value || '未填写';
}

function readRecordingPetName(): string {
  const recording = recordingDetail.value?.recording;
  const profilePet = customerProfileSections.value.find((section) => section.key === 'petName');
  return recording?.petName || profilePet?.value || '未填写';
}

function maskPersonalName(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue === '未填写') {
    return '未填写';
  }

  if (trimmedValue.length <= 1) {
    return `${trimmedValue}某`;
  }

  return `${trimmedValue[0]}某`;
}

function buildMedicalRecordExportDocument(): ExportDocument {
  return {
    title: '病历 PDF',
    subtitle: '宠物医生 AI 医助 · 标准病历结构',
    metas: [
      { label: '宠主姓名', value: readRecordingPetOwnerName() },
      { label: '宠物姓名', value: readRecordingPetName() },
      { label: '医生/用户信息', value: currentUserLabel.value },
      { label: '生成时间', value: formatFullDateTime(new Date().toISOString()) },
    ],
    notices: ['AI 生成内容仅供辅助，需人工确认。', humanConfirmationText.value],
    sections: sectionsToExportSections(medicalRecordSections.value),
  };
}

function buildCustomerProfileExportDocument(): ExportDocument {
  const profileSections = customerProfileSections.value.filter(
    (section) => section.key !== 'petOwnerName',
  );
  return {
    title: '客户画像',
    subtitle: '门店内部查看 · 第一版脱敏导出',
    metas: [
      { label: '宠主', value: maskPersonalName(readRecordingPetOwnerName()) },
      { label: '宠物', value: readRecordingPetName() },
      { label: '整理人', value: currentUserLabel.value },
      { label: '生成时间', value: formatFullDateTime(new Date().toISOString()) },
    ],
    notices: [
      '仅供门店内部查看，请勿默认外发或作为公开资料使用。',
      'AI 生成内容仅供辅助，需人工确认。',
      '画像用于辅助服务沟通和回访安排，不应替代医生判断或客户真实意愿确认。',
    ],
    sections: sectionsToExportSections(profileSections),
  };
}

function buildCurrentExportDocument(): ExportDocument | null {
  if (!currentGenerationResult.value) {
    return null;
  }

  if (activeGenerationType.value === 'medical_record') {
    return buildMedicalRecordExportDocument();
  }

  if (activeGenerationType.value === 'customer_profile') {
    return buildCustomerProfileExportDocument();
  }

  return {
    title: activeGenerationLabel.value,
    subtitle: '宠物医生 AI 医助',
    metas: [
      { label: '医生/用户信息', value: currentUserLabel.value },
      { label: '生成时间', value: formatFullDateTime(new Date().toISOString()) },
    ],
    notices: ['AI 生成内容仅供辅助，需人工确认。'],
    sections: getCurrentResultExportText()
      .split('\n\n')
      .filter(Boolean)
      .map((block, index) => {
        const [label, ...content] = block.split('\n');
        return {
          label: label || `内容 ${index + 1}`,
          content: content.join('\n') || '待补充',
        };
      }),
  };
}

function validateExportDocument(
  documentData: ExportDocument | null,
): documentData is ExportDocument {
  if (!documentData || documentData.sections.length === 0) {
    setRecordingError('导出失败：当前模块暂无可导出的内容。');
    return false;
  }

  return true;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = text.split('\n').flatMap((line) => wrapCanvasText(context, line || ' ', maxWidth));
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function measureExportSectionHeight(
  context: CanvasRenderingContext2D,
  section: ExportSection,
  contentWidth: number,
): number {
  context.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const titleLines = wrapCanvasText(context, section.label, contentWidth);
  context.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const contentLines = section.content
    .split('\n')
    .flatMap((line) => wrapCanvasText(context, line || ' ', contentWidth));
  return 34 + titleLines.length * 30 + contentLines.length * 32;
}

function renderExportDocumentToCanvas(documentData: ExportDocument): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持导出渲染');
  }

  const width = 1200;
  const padding = 56;
  const contentWidth = width - padding * 2;
  const cardWidth = (contentWidth - 24) / 2;
  const sectionHeights = documentData.sections.map((section) =>
    measureExportSectionHeight(context, section, cardWidth - 36),
  );
  const metaRows = Math.ceil(documentData.metas.length / 2);
  const noticeHeight = documentData.notices.length * 36 + 34;
  const gridHeight = sectionHeights.reduce((height, sectionHeight, index) => {
    if (index % 2 === 0) {
      return height + Math.max(sectionHeight, sectionHeights[index + 1] ?? 0) + 20;
    }
    return height;
  }, 0);

  canvas.width = width;
  canvas.height = Math.max(760, padding * 2 + 98 + metaRows * 58 + noticeHeight + gridHeight + 64);

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f6f8fb';
  context.fillRect(0, 0, canvas.width, 182);

  context.fillStyle = '#101828';
  context.font = '700 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(documentData.title, padding, 72);
  context.fillStyle = '#475467';
  context.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(documentData.subtitle, padding, 114);

  let cursorY = 206;
  documentData.metas.forEach((meta, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = padding + column * (cardWidth + 24);
    const y = cursorY + row * 58;
    context.fillStyle = '#667085';
    context.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(meta.label, x, y);
    context.fillStyle = '#101828';
    context.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    drawWrappedText(context, meta.value || '未填写', x, y + 32, cardWidth, 28);
  });
  cursorY += metaRows * 58 + 28;

  context.fillStyle = '#fff7e6';
  roundRect(context, padding, cursorY, contentWidth, noticeHeight, 8);
  context.fill();
  context.fillStyle = '#7a4b00';
  context.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText('AI 辅助提示', padding + 24, cursorY + 32);
  context.font = '21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  documentData.notices.forEach((notice, index) => {
    context.fillText(notice, padding + 24, cursorY + 70 + index * 36);
  });
  cursorY += noticeHeight + 26;

  documentData.sections.forEach((section, index) => {
    const column = index % 2;
    const rowStart = index % 2 === 0;
    const pairHeight = Math.max(
      sectionHeights[index],
      sectionHeights[index + (rowStart ? 1 : -1)] ?? 0,
    );
    const x = padding + column * (cardWidth + 24);
    const y = cursorY;
    const height = pairHeight;

    context.fillStyle = section.highlight ? '#fffaf0' : '#ffffff';
    roundRect(context, x, y, cardWidth, height, 8);
    context.fill();
    context.strokeStyle = section.highlight ? '#f6d7a8' : '#d8dee9';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = '#101828';
    context.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const titleBottom = drawWrappedText(context, section.label, x + 18, y + 38, cardWidth - 36, 30);
    context.fillStyle = '#344054';
    context.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    drawWrappedText(
      context,
      section.content || '待补充',
      x + 18,
      titleBottom + 16,
      cardWidth - 36,
      32,
    );

    if (!rowStart) {
      cursorY += pairHeight + 20;
    }
  });

  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出文件生成失败'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeAscii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function buildPdfFromJpegPages(
  pages: Array<{ bytes: Uint8Array; width: number; height: number }>,
): Blob {
  const chunks: Array<string | ArrayBuffer> = [];
  const offsets: number[] = [0];
  let byteOffset = 0;

  const append = (chunk: string | Uint8Array): void => {
    const bytes = typeof chunk === 'string' ? encodeAscii(chunk) : chunk;
    chunks.push(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );
    byteOffset += bytes.byteLength;
  };

  const appendObject = (id: number, content: string | Uint8Array): void => {
    offsets[id] = byteOffset;
    append(`${id} 0 obj\n`);
    append(content);
    append('\nendobj\n');
  };

  const pageCount = pages.length;
  append('%PDF-1.4\n');
  appendObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  appendObject(
    2,
    `<< /Type /Pages /Kids ${pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ')} /Count ${pageCount} >>`,
  );

  pages.forEach((page, index) => {
    const pageObjectId = 3 + index * 3;
    const imageObjectId = pageObjectId + 1;
    const contentObjectId = pageObjectId + 2;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const imageRatio = page.width / page.height;
    const availableWidth = pageWidth - 48;
    const availableHeight = pageHeight - 48;
    const drawWidth =
      imageRatio > availableWidth / availableHeight ? availableWidth : availableHeight * imageRatio;
    const drawHeight = drawWidth / imageRatio;
    const x = (pageWidth - drawWidth) / 2;
    const y = pageHeight - drawHeight - 24;
    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(
      2,
    )} cm\n/Im${index + 1} Do\nQ`;

    appendObject(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${
        index + 1
      } ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    offsets[imageObjectId] = byteOffset;
    append(`${imageObjectId} 0 obj\n`);
    append(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.byteLength} >>\nstream\n`,
    );
    append(page.bytes);
    append('\nendstream');
    append('\nendobj\n');
    appendObject(contentObjectId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  const xrefOffset = byteOffset;
  const maxObjectId = 2 + pageCount * 3;
  append(`xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= maxObjectId; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: 'application/pdf' });
}

function createPdfBlobFromCanvas(canvas: HTMLCanvasElement): Blob {
  const pageWidth = 1200;
  const pageHeight = Math.floor((pageWidth * 841.89) / 595.28);
  const pages: Array<{ bytes: Uint8Array; width: number; height: number }> = [];

  for (let top = 0; top < canvas.height; top += pageHeight) {
    const sliceHeight = Math.min(pageHeight, canvas.height - top);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = pageWidth;
    pageCanvas.height = sliceHeight;
    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) {
      throw new Error('当前浏览器不支持 PDF 导出');
    }

    pageContext.fillStyle = '#ffffff';
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(canvas, 0, top, pageWidth, sliceHeight, 0, 0, pageWidth, sliceHeight);
    pages.push({
      bytes: dataUrlToBytes(pageCanvas.toDataURL('image/jpeg', 0.92)),
      width: pageCanvas.width,
      height: pageCanvas.height,
    });
  }

  return buildPdfFromJpegPages(pages);
}

function ensureH5ExportSupport(): boolean {
  // 小程序后续建议改用 uni.canvasToTempFilePath + saveFile，或接入服务端导出接口统一生成 PDF。
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    setRecordingError('导出失败：当前端暂只支持 H5 导出，小程序导出方案已在代码中预留。');
    return false;
  }

  return true;
}

async function exportCurrentResultAsPdf(): Promise<void> {
  if (!ensureH5ExportSupport()) {
    return;
  }

  const documentData = buildCurrentExportDocument();
  if (!validateExportDocument(documentData)) {
    return;
  }

  try {
    const canvas = renderExportDocumentToCanvas(documentData);
    const pdfBlob = createPdfBlobFromCanvas(canvas);
    downloadBlob(pdfBlob, buildExportFileName('pdf'));
    uni.showToast({ title: 'PDF 已下载', icon: 'success' });
  } catch (error) {
    setRecordingError(`导出失败：${formatAppErrorMessage(error, 'PDF 导出失败。')}`, {
      label: '重新导出 PDF',
      run: exportCurrentResultAsPdf,
    });
  }
}

async function exportCurrentResultAsImage(): Promise<void> {
  if (!ensureH5ExportSupport()) {
    return;
  }

  const documentData = buildCurrentExportDocument();
  if (!validateExportDocument(documentData)) {
    return;
  }

  try {
    const canvas = renderExportDocumentToCanvas(documentData);
    const blob = await canvasToBlob(canvas, 'image/png');
    downloadBlob(blob, buildExportFileName('png'));
    uni.showToast({ title: '图片已下载', icon: 'success' });
  } catch (error) {
    setRecordingError(`导出失败：${formatAppErrorMessage(error, '图片导出失败。')}`, {
      label: '重新导出图片',
      run: exportCurrentResultAsImage,
    });
  }
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';

  for (const char of text) {
    const testLine = `${line}${char}`;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  }

  lines.push(line);
  return lines;
}

async function copyFollowupScript(): Promise<void> {
  const script = smartFollowupScript.value;
  if (!script) {
    setRecordingError('当前暂无可复制的回访话术。');
    return;
  }

  try {
    await navigator.clipboard.writeText(script);
    uni.showToast({ title: '话术已复制', icon: 'success' });
  } catch {
    uni.setClipboardData({
      data: script,
      success: () => uni.showToast({ title: '话术已复制', icon: 'success' }),
    });
  }
}

function showSkillNotOpen(title: string): void {
  uni.showToast({
    title: `${title}暂未开放`,
    icon: 'none',
  });
}

function showProjectCreateReserved(): void {
  uni.showToast({
    title: '新建项目入口已预留',
    icon: 'none',
  });
}

function focusCustomToolInput(): void {
  customToolInputRef.value?.focus();
}

function resetCustomToolFlow(): void {
  customToolConversationId.value = '';
  customToolInput.value = '';
  customToolMessages.value = [];
  activeCustomRequirement.value = null;
  customRequirementTitle.value = '';
  customRequirementDraft.value = '';
  customToolError.value = '';
}

async function submitCustomToolMessage(): Promise<void> {
  const content = customToolInput.value.trim();
  if (!content) {
    return;
  }

  customToolLoading.value = true;
  customToolError.value = '';

  try {
    if (!customToolConversationId.value) {
      const conversation = await apiRequest<CustomToolConversationResponse>(
        '/custom-tools/conversations',
        {
          method: 'POST',
          body: JSON.stringify({
            initialMessage: content,
          }),
        },
      );
      customToolConversationId.value = conversation.id;
      customToolMessages.value = conversation.messages;
    } else {
      const messageResponse = await apiRequest<CustomToolMessageResponse>(
        `/custom-tools/conversations/${customToolConversationId.value}/message`,
        {
          method: 'POST',
          body: JSON.stringify({
            content,
          }),
        },
      );
      customToolMessages.value = messageResponse.messages;
    }

    customToolInput.value = '';
  } catch (currentError) {
    customToolError.value = `自建工具对话失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    customToolLoading.value = false;
  }
}

async function generateCustomToolRequirement(): Promise<void> {
  if (!customToolConversationId.value) {
    return;
  }

  customToolLoading.value = true;
  customToolError.value = '';

  try {
    const requirement = await apiRequest<CustomToolRequirementResponse>(
      `/custom-tools/conversations/${customToolConversationId.value}/generate-requirement`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    activeCustomRequirement.value = requirement;
    customRequirementTitle.value = requirement.title;
    customRequirementDraft.value = requirement.requirementText ?? '';
    await loadCustomRequirements();
  } catch (currentError) {
    customToolError.value = `生成需求文档失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    customToolLoading.value = false;
  }
}

async function loadCustomRequirements(): Promise<void> {
  customToolLoading.value = true;
  customToolError.value = '';

  try {
    await loadCurrentUser();
    customRequirements.value = await apiRequest<CustomToolRequirementResponse[]>(
      '/custom-tools/requirements',
    );
  } catch (currentError) {
    customToolError.value = `无法读取需求文档：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    customToolLoading.value = false;
  }
}

async function selectCustomRequirement(requirementId: string): Promise<void> {
  customToolLoading.value = true;
  customToolError.value = '';

  try {
    const requirement = await apiRequest<CustomToolRequirementResponse>(
      `/custom-tools/requirements/${requirementId}`,
    );
    activeCustomRequirement.value = requirement;
    customRequirementTitle.value = requirement.title;
    customRequirementDraft.value = requirement.requirementText ?? '';
  } catch (currentError) {
    customToolError.value = `无法读取需求文档：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    customToolLoading.value = false;
  }
}

async function saveCustomToolRequirement(): Promise<void> {
  if (!activeCustomRequirement.value) {
    return;
  }

  customToolLoading.value = true;
  customToolError.value = '';

  try {
    const requirement = await apiRequest<CustomToolRequirementResponse>(
      `/custom-tools/requirements/${activeCustomRequirement.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: customRequirementTitle.value,
          requirementText: customRequirementDraft.value,
        }),
      },
    );
    activeCustomRequirement.value = requirement;
    customRequirementTitle.value = requirement.title;
    customRequirementDraft.value = requirement.requirementText ?? '';
    await loadCustomRequirements();
    uni.showToast({ title: '需求已保存', icon: 'success' });
  } catch (currentError) {
    customToolError.value = `保存需求文档失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    customToolLoading.value = false;
  }
}

function parseSuggestedDueTime(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const dayMatch = trimmedValue.match(/(\d+)\s*天后/);
  const hourMatch = trimmedValue.match(/(\d+)\s*小时后/);
  const dueDate = new Date();

  if (dayMatch) {
    dueDate.setDate(dueDate.getDate() + Number(dayMatch[1]));
    return dueDate.toISOString();
  }

  if (hourMatch) {
    dueDate.setHours(dueDate.getHours() + Number(hourMatch[1]));
    return dueDate.toISOString();
  }

  if (trimmedValue.includes('明天')) {
    dueDate.setDate(dueDate.getDate() + 1);
    return dueDate.toISOString();
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTodoDueTime(value: string | null): string {
  if (!value) {
    return '未设置时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间格式异常';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value: string): string {
  return formatFullDateTime(value);
}

async function createTodoFromCurrentFollowup(): Promise<void> {
  if (!recordingDetail.value || !currentGenerationResult.value) {
    return;
  }

  if (currentGenerationResult.value.resultType !== 'smart_followup') {
    setRecordingError('只有智能回访结果可以一键转成待办。');
    return;
  }

  recordingsLoading.value = true;
  clearRecordingError();

  try {
    const contentJson = asPlainRecord(currentGenerationResult.value.contentJson);
    const petOwnerName =
      readJsonString(contentJson, 'followUpTarget', 'petOwnerName', 'pet_owner_name') ||
      recordingDetail.value.recording.petOwnerName ||
      '';
    const petName =
      readJsonString(contentJson, 'petName', 'pet_name') ||
      recordingDetail.value.recording.petName ||
      '';
    const followUpReason = readJsonString(contentJson, 'followUpReason', 'follow_up_reason');
    const followUpScript = readJsonString(contentJson, 'followUpScript', 'follow_up_script');
    const suggestedFollowUpTime = readJsonString(
      contentJson,
      'suggestedFollowUpTime',
      'suggested_follow_up_time',
    );
    const descriptionParts = [
      followUpReason ? `回访原因：${followUpReason}` : '',
      followUpScript ? `回访话术：${followUpScript}` : '',
      currentGenerationResult.value.contentText ?? '',
    ].filter(Boolean);

    const todo = await apiRequest<TodoResponse>('/todos', {
      method: 'POST',
      body: JSON.stringify({
        title: `回访 ${petOwnerName || '宠主'}${petName ? ` / ${petName}` : ''}`,
        description: descriptionParts.join('\n\n'),
        petOwnerName,
        petName,
        dueTime: parseSuggestedDueTime(suggestedFollowUpTime),
        recordingId: currentGenerationResult.value.recordingId,
        generationResultId: currentGenerationResult.value.id,
      }),
    });

    await loadTodos();
    activeSection.value = 'todos';
    editingTodoId.value = todo.id;
    startTodoEdit(todo);
    uni.showToast({ title: '已生成待办', icon: 'success' });
  } catch (currentError) {
    setRecordingError(`生成待办失败：${formatAppErrorMessage(currentError, '生成待办失败。')}`, {
      label: '重新生成待办',
      run: createTodoFromCurrentFollowup,
    });
  } finally {
    recordingsLoading.value = false;
  }
}

async function loadTodos(): Promise<void> {
  todosLoading.value = true;
  todoError.value = '';

  try {
    await loadCurrentUser();
    todos.value = await apiRequest<TodoResponse[]>('/todos');
  } catch (currentError) {
    todoError.value = `无法读取待办：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    todosLoading.value = false;
  }
}

function startTodoEdit(todo: TodoResponse): void {
  editingTodoId.value = todo.id;
  todoDraft.title = todo.title;
  todoDraft.description = todo.description ?? '';
  todoDraft.petOwnerName = todo.petOwnerName ?? '';
  todoDraft.petName = todo.petName ?? '';
  todoDraft.dueTime = toDatetimeLocalValue(todo.dueTime);
}

function cancelTodoEdit(): void {
  editingTodoId.value = '';
  todoDraft.title = '';
  todoDraft.description = '';
  todoDraft.petOwnerName = '';
  todoDraft.petName = '';
  todoDraft.dueTime = '';
}

async function saveTodo(): Promise<void> {
  if (!editingTodoId.value) {
    return;
  }

  todosLoading.value = true;
  todoError.value = '';

  try {
    await apiRequest<TodoResponse>(`/todos/${editingTodoId.value}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: todoDraft.title,
        description: todoDraft.description,
        petOwnerName: todoDraft.petOwnerName,
        petName: todoDraft.petName,
        dueTime: fromDatetimeLocalValue(todoDraft.dueTime),
      }),
    });
    cancelTodoEdit();
    await loadTodos();
  } catch (currentError) {
    todoError.value = `保存待办失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    todosLoading.value = false;
  }
}

async function completeTodo(id: string): Promise<void> {
  const todo = todos.value.find((item) => item.id === id);
  if (todo?.status === 'completed') {
    return;
  }

  todosLoading.value = true;
  todoError.value = '';

  try {
    await apiRequest<TodoResponse>(`/todos/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await loadTodos();
  } catch (currentError) {
    todoError.value = `完成待办失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    todosLoading.value = false;
  }
}

async function deleteTodo(id: string): Promise<void> {
  const confirmed = await confirmModal('确认删除待办', '删除后会写入审计日志，是否继续？');
  if (!confirmed) {
    return;
  }

  todosLoading.value = true;
  todoError.value = '';

  try {
    await apiRequest(`/todos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    if (editingTodoId.value === id) {
      cancelTodoEdit();
    }
    await loadTodos();
  } catch (currentError) {
    todoError.value = `删除待办失败：${
      currentError instanceof Error ? currentError.message : '未知错误'
    }`;
  } finally {
    todosLoading.value = false;
  }
}

function extractSuggestionText(suggestion: MemorySuggestionResponse): string {
  if (!suggestion.afterData || typeof suggestion.afterData !== 'object') {
    return '建议内容为空';
  }

  const afterData = suggestion.afterData as Record<string, unknown>;
  const longTermInfo = afterData.longTermInfo;

  if (typeof longTermInfo === 'string' && longTermInfo.trim()) {
    return longTermInfo;
  }

  const contentText = afterData.contentText;
  return typeof contentText === 'string' ? contentText : '建议内容为空';
}

onMounted(async () => {
  checkMediaRecorderSupport();
  try {
    await ensureAuthenticated();
    await loadMemory();
    authChecked.value = true;
  } catch {
    authChecked.value = false;
  }
});

onUnmounted(() => {
  stopRecordingTimer();
  cleanupRecordingStream();
});
</script>

<style scoped lang="scss">
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f5f7fb;
}

.auth-loading {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f7fb;
}

.sidebar {
  overflow: hidden;
  width: 248px;
  padding: 22px 16px;
  border-right: 1px solid #d8dee9;
  background: #ffffff;
  transition:
    width 0.16s ease,
    padding 0.16s ease;
}

.sidebar-collapsed {
  width: 0;
  padding-right: 0;
  padding-left: 0;
  border-right: 0;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 22px;
}

.brand-title {
  color: #101828;
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
}

.brand-subtitle,
.muted {
  color: #667085;
  font-size: 13px;
  line-height: 20px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  margin: 0;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  color: #475467;
  font-size: 14px;
  line-height: 38px;
  text-align: left;
  background: transparent;
}

.nav-item-active {
  color: #0f3d3e;
  font-weight: 700;
  background: #e9f6f2;
}

.main {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

.topbar,
.memory-toolbar,
.recording-toolbar,
.recording-summary,
.modal-header,
.suggestion-actions,
.toolbar-actions,
.session {
  display: flex;
  align-items: center;
}

.topbar,
.memory-toolbar,
.recording-toolbar,
.recording-summary,
.todo-toolbar,
.modal-header {
  justify-content: space-between;
  gap: 16px;
}

.topbar {
  margin-bottom: 18px;
}

.eyebrow {
  display: block;
  color: #146c60;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
}

.page-title {
  display: block;
  color: #101828;
  font-size: 28px;
  font-weight: 700;
  line-height: 36px;
}

.session,
.toolbar-actions,
.suggestion-actions,
.recording-picker {
  gap: 10px;
}

.recording-picker {
  display: flex;
  align-items: center;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  padding: 18px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.intro-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  display: block;
  color: #101828;
  font-size: 17px;
  font-weight: 700;
  line-height: 25px;
}

.state-text,
.state-error {
  color: #344054;
  font-size: 15px;
  line-height: 24px;
}

.state-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #b42318;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #344054;
  font-size: 14px;
  line-height: 22px;
}

.field-wide {
  grid-column: 1 / -1;
}

.input,
.textarea,
.markdown-editor {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  color: #101828;
  font-size: 14px;
  line-height: 22px;
  background: #ffffff;
}

.input {
  height: 40px;
  padding: 0 12px;
}

.textarea {
  min-height: 96px;
  padding: 10px 12px;
}

.memory-panel {
  min-height: 520px;
}

.markdown-view {
  display: block;
  color: #1d2939;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  line-height: 24px;
  white-space: pre-wrap;
}

.markdown-editor {
  min-height: 520px;
  padding: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.primary-button,
.ghost-button {
  margin: 0;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 38px;
}

.primary-button {
  border: 0;
  color: #ffffff;
  background: #0f766e;
}

.ghost-button {
  border: 1px solid #cfd7e3;
  color: #344054;
  background: #ffffff;
}

.compact {
  line-height: 34px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.38);
}

.modal {
  width: min(760px, 100%);
  max-height: 86vh;
  overflow: auto;
  padding: 18px;
  border-radius: 8px;
  background: #ffffff;
}

.privacy-mask {
  z-index: 30;
}

.privacy-modal {
  width: min(560px, 100%);
}

.privacy-header,
.privacy-content {
  display: flex;
  flex-direction: column;
}

.privacy-header {
  gap: 6px;
  margin-bottom: 16px;
}

.privacy-content {
  gap: 10px;
}

.privacy-item {
  display: block;
  padding: 11px 12px;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  color: #1d2939;
  font-size: 14px;
  line-height: 22px;
  background: #fbfcfe;
}

.privacy-note {
  display: block;
  color: #667085;
  font-size: 13px;
  line-height: 21px;
}

.privacy-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.suggestion-create {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}

.empty-state {
  padding: 16px;
  border: 1px dashed #cfd7e3;
  border-radius: 8px;
  color: #667085;
  font-size: 14px;
  line-height: 22px;
}

.placeholder-panel,
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-placeholder-hero,
.placeholder-section-header,
.project-detail-placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-placeholder-hero {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.placeholder-status {
  display: block;
  width: fit-content;
  margin-bottom: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #6941c6;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  background: #f4ebff;
}

.resource-type-grid,
.director-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.resource-type-card,
.director-metric-card,
.project-placeholder-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.resource-type-title {
  color: #101828;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
}

.project-placeholder-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.project-list-panel,
.project-detail-panel {
  min-width: 0;
}

.project-list-placeholder,
.future-association-list {
  display: flex;
  gap: 10px;
}

.project-list-placeholder {
  flex-direction: column;
  margin-top: 12px;
}

.project-placeholder-item {
  width: 100%;
  margin: 0;
  text-align: left;
}

.project-placeholder-item-active {
  border-color: #0f766e;
  background: #f0fdfa;
}

.project-detail-placeholder {
  margin-top: 12px;
}

.future-association-list {
  flex-wrap: wrap;
}

.director-metric-card {
  min-height: 132px;
}

.director-metric-value {
  color: #101828;
  font-size: 30px;
  font-weight: 800;
  line-height: 38px;
}

.profile-row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #eaecf0;
}

.profile-row:last-child {
  border-bottom: 0;
}

.profile-label {
  color: #667085;
  font-size: 14px;
  line-height: 22px;
}

.profile-value {
  color: #101828;
  font-size: 14px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.suggestion-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #eaecf0;
}

.suggestion-reason {
  color: #344054;
  font-size: 14px;
  line-height: 22px;
}

.suggestion-content {
  padding: 10px 12px;
  border-radius: 6px;
  color: #1d2939;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
  background: #f5f7fb;
}

.recording-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 26px 18px;
  text-align: center;
}

.recording-consent {
  display: block;
  max-width: 720px;
  margin-top: 8px;
  color: #344054;
  font-size: 15px;
  line-height: 24px;
}

.recording-controls,
.recording-hints {
  display: flex;
  align-items: center;
}

.recording-controls {
  gap: 12px;
}

.recording-hints {
  flex-direction: column;
  gap: 6px;
}

.record-button {
  width: 168px;
  height: 168px;
  margin: 0;
  padding: 0 16px;
  border: 0;
  border-radius: 50%;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  background: #0f766e;
  box-shadow: 0 14px 32px rgba(15, 118, 110, 0.24);
}

.record-button-active {
  background: #b42318;
  box-shadow: 0 14px 32px rgba(180, 35, 24, 0.22);
}

.upload-button {
  min-width: 112px;
}

.file-picker-label {
  position: relative;
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.file-picker-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.unsupported-hint {
  display: block;
  color: #b42318;
  font-size: 14px;
  line-height: 22px;
}

.recording-timer {
  display: block;
  color: #0f3d3e;
  font-size: 15px;
  font-weight: 700;
  line-height: 24px;
}

.recording-table {
  overflow: hidden;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.recording-table-head,
.recording-row {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr 0.85fr 0.75fr 0.85fr 1.25fr;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
}

.recording-table-head {
  color: #667085;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  background: #f8fafc;
}

.recording-row {
  border-top: 1px solid #eaecf0;
  color: #344054;
  font-size: 14px;
  line-height: 22px;
}

.recording-item-active {
  background: #eefaf7;
}

.recording-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.detail-card,
.card-heading,
.binding-edit-grid,
.meta-item {
  display: flex;
  flex-direction: column;
}

.detail-card {
  gap: 14px;
}

.card-heading {
  gap: 8px;
}

.card-heading {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-item {
  gap: 5px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #eaecf0;
  border-radius: 6px;
  background: #fbfcfe;
}

.meta-label,
.tab-state {
  color: #667085;
  font-size: 12px;
  line-height: 18px;
}

.meta-value {
  color: #101828;
  font-size: 14px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.binding-edit-grid {
  gap: 12px;
}

.transcript-view {
  min-height: 160px;
}

.transcript-editor {
  min-height: 240px;
}

.summary-card {
  background: #fcfffe;
}

.recording-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-pill {
  display: inline-flex;
  width: fit-content;
  min-width: 64px;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  background: #eef2f6;
}

.status-uploading,
.status-transcribing,
.status-generating {
  color: #7a4b00;
  background: #fff7e6;
}

.status-uploaded {
  color: #175cd3;
  background: #eff8ff;
}

.status-completed {
  color: #027a48;
  background: #ecfdf3;
}

.status-failed {
  color: #b42318;
  background: #fef3f2;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-button {
  margin: 0;
  padding: 0 12px;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  color: #344054;
  font-size: 13px;
  line-height: 34px;
  background: #ffffff;
}

.tab-button-active {
  border-color: #0f766e;
  color: #0f3d3e;
  font-weight: 700;
  background: #e9f6f2;
}

.result-tabs {
  align-items: stretch;
}

.result-tab-button {
  display: flex;
  min-height: 58px;
  min-width: 136px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 8px 12px;
  line-height: 20px;
  text-align: left;
}

.result-panel,
.result-body,
.result-header,
.proactive-empty,
.module-state-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result-header {
  flex-direction: row;
  justify-content: space-between;
}

.generation-editors {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 12px;
}

.result-editor {
  min-height: 360px;
}

.result-json-editor {
  min-height: 360px;
}

.risk-alert {
  padding: 12px;
  border: 1px solid #f6d7a8;
  border-radius: 8px;
  color: #7a4b00;
  font-size: 14px;
  line-height: 22px;
  background: #fff7e6;
}

.safety-alert {
  padding: 12px;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #075985;
  font-size: 14px;
  line-height: 22px;
  background: #f0f9ff;
}

.structured-result,
.structured-grid,
.structured-card,
.structured-list,
.opportunity-list,
.opportunity-card,
.opportunity-fields,
.followup-card,
.script-box,
.risk-result,
.risk-list,
.risk-item,
.fallback-result {
  display: flex;
  flex-direction: column;
}

.structured-result {
  gap: 14px;
}

.structured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.medical-record-grid,
.profile-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.structured-card,
.opportunity-card,
.script-box,
.risk-item,
.fallback-result {
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.structured-card-highlight,
.risk-item-highlight {
  border-color: #f6d7a8;
  background: #fffaf0;
}

.structured-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.structured-title {
  display: block;
  color: #101828;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
}

.structured-value,
.structured-list-item,
.script-text {
  display: block;
  color: #344054;
  font-size: 14px;
  line-height: 23px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.structured-list {
  gap: 7px;
}

.structured-list-item {
  position: relative;
  padding-left: 14px;
}

.structured-list-item::before {
  position: absolute;
  top: 10px;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #0f766e;
  content: '';
}

.editable-structured-card {
  background: #fcfffe;
}

.micro-button {
  padding: 0 10px;
  font-size: 12px;
  line-height: 28px;
  white-space: nowrap;
}

.opportunity-list,
.risk-list,
.followup-card {
  gap: 12px;
}

.opportunity-card {
  border-color: #cde7e1;
  background: #fcfffe;
}

.opportunity-fields {
  gap: 10px;
}

.structured-field {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #eaecf0;
}

.structured-field:first-child {
  border-top: 0;
}

.script-box {
  border-color: #bae6fd;
  background: #f8fcff;
}

.script-text {
  padding: 12px;
  border-radius: 6px;
  background: #ffffff;
}

.strong-confirmation-alert {
  padding: 13px 14px;
  border: 1px solid #fda29b;
  border-radius: 8px;
  color: #912018;
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  background: #fef3f2;
}

.compact-markdown {
  max-height: 180px;
  overflow: auto;
  padding-top: 10px;
  border-top: 1px solid #eaecf0;
  color: #667085;
  font-size: 13px;
  line-height: 21px;
}

.proactive-empty,
.module-state-box {
  align-items: flex-start;
  padding: 18px;
  border: 1px dashed #cfd7e3;
  border-radius: 8px;
  background: #fbfcfe;
}

.todo-toolbar,
.todo-main,
.todo-actions {
  display: flex;
  align-items: center;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.todo-main {
  align-items: flex-start;
  gap: 12px;
}

.todo-content,
.todo-edit {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.todo-title {
  color: #101828;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}

.todo-title-done {
  color: #667085;
  text-decoration: line-through;
}

.todo-description {
  color: #344054;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
}

.todo-edit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.todo-actions {
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 800px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
    border-right: 0;
    border-bottom: 1px solid #d8dee9;
  }

  .sidebar-collapsed {
    width: auto;
    height: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .nav-list {
    flex-direction: row;
    overflow-x: auto;
  }

  .main {
    padding: 18px 14px;
  }

  .topbar,
  .memory-toolbar,
  .recording-toolbar,
  .recording-summary,
  .module-placeholder-hero,
  .todo-toolbar,
  .result-header,
  .card-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid,
  .detail-grid,
  .meta-grid,
  .structured-grid,
  .medical-record-grid,
  .profile-grid,
  .project-placeholder-layout,
  .structured-field {
    grid-template-columns: 1fr;
  }

  .toolbar-actions,
  .recording-picker {
    flex-wrap: wrap;
  }

  .generation-editors {
    grid-template-columns: 1fr;
  }

  .todo-edit-grid {
    grid-template-columns: 1fr;
  }

  .todo-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .recording-controls {
    flex-direction: column;
  }

  .record-button {
    width: 140px;
    height: 140px;
    font-size: 18px;
  }

  .recording-table {
    border: 0;
    background: transparent;
  }

  .recording-table-head {
    display: none;
  }

  .recording-row {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 10px;
    border: 1px solid #d8dee9;
    border-radius: 8px;
    background: #ffffff;
  }

  .session {
    flex-wrap: wrap;
  }

  .profile-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
