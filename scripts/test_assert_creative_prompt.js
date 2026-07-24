#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'assert_creative_prompt.js');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function runAssert(contract, prompt, assetManifest = null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creative-prompt-assert-'));
  const contractPath = path.join(dir, 'story_contract.json');
  const promptPath = path.join(dir, 'creative_prompt.md');
  const outPath = path.join(dir, 'assertion_report.json');
  const effectiveContract = Object.prototype.hasOwnProperty.call(contract, 'audience_interpretation_review')
    ? contract
    : {
      ...contract,
      audience_interpretation_review: {
        required: true,
        status: 'pass',
        unresolved_blockers: []
      }
    };
  writeJson(contractPath, effectiveContract);
  fs.writeFileSync(promptPath, prompt, 'utf8');
  const args = [SCRIPT, '--contract', contractPath, '--prompt', promptPath, '--out-json', outPath];
  if (assetManifest) {
    const assetManifestPath = path.join(dir, 'asset_manifest.json');
    writeJson(assetManifestPath, assetManifest);
    args.push('--asset-manifest', assetManifestPath);
  }
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`assert_creative_prompt exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

const contract = {
  case_id: 'hujihua-smoke',
  brand: '胡姬花',
  product: '古法小榨花生油',
  required_copy: [
    '不是所有的香，都叫古法香。',
    '胡姬花，只做花生油。',
    '坚守非遗古法。',
    '拒绝科技狠活。',
    '胡姬花，古法小榨花生油。',
    '百年非遗古法香。',
    '好的花生油，就认古法香。',
    '胡姬花。'
  ],
  required_closing_copy: ['胡姬花。'],
  required_assets: [
    { name: '卖油郎', terms: ['卖油郎'] },
    { name: '胡姬花产品瓶', terms: ['胡姬花', '产品瓶'] },
    { name: '古法香大字', terms: ['古法香'] }
  ],
  required_shots: 4,
  forbidden_terms: ['二维码', '竞品', '化学瓶', '实验室恐吓画面']
};

const goodPrompt = `
全片目标：手绘动画风的胡姬花花生油广告，用卖油郎和金色书法大字强化古法香。

必读口播脚本：以下八句必须按顺序逐句完整读出，不改字、不调换顺序：
1. 不是所有的香，都叫古法香。
2. 胡姬花，只做花生油。
3. 坚守非遗古法。
4. 拒绝科技狠活。
5. 胡姬花，古法小榨花生油。
6. 百年非遗古法香。
7. 好的花生油，就认古法香。
8. 胡姬花。

主体定义：卖油郎是圆脸中年男性，红色头巾，棕色传统衣衫；胡姬花产品瓶是红金色花生油瓶，始终和古法香绑定。

声音计划：中文男声，有北方老字号吆喝感。按必读口播脚本逐句读出，句间有短气口，不能把两句吞成一句。

文字计划：古法香作为最大金色毛笔字反复出现；坚守非遗古法、拒绝科技狠活、好的花生油 就认古法香作为大字出现。

镜头1：老作坊暖光中，固定中景切入，卖油郎捧出胡姬花产品瓶，右侧落下巨大金色毛笔字古法香。
镜头2：镜头切到花生和产品瓶近景，卖油郎端着簸箕走过，花生在金光中轻轻滚动。
镜头3：镜头切到木榨工艺，卖油郎用力推压木杆，金色花生油从木槽流下。
镜头4：镜头切到产品收口，胡姬花产品瓶和古法香大字定格，男声收尾说胡姬花。

必要约束：不要水印，不要随机英文，不要二维码，不要无关Logo，不要竞品包装或竞品标识。
`;

const passReport = runAssert(contract, goodPrompt);
assert.equal(passReport.status, 'pass');
assert.equal(passReport.issues.length, 0);

const badPrompt = `
全片目标：生成一支 15 秒 16:9 720p 的 Seedance 视频，完成后返回 mp4 下载链接。
主体定义：卖油郎讲古法香。
声音计划：不是所有的香，都叫古法香。胡姬花，只做花生油。坚守非遗古法。拒绝科技狠活。胡姬花，古法小榨花生油。百年非遗古法香。好的花生油，就认古法香。
文字计划：古法香。
镜头1：卖油郎拿着化学瓶出现，旁边摆着竞品包装。
镜头2：木榨出油。
必要约束：不要水印。
`;

const failReport = runAssert(contract, badPrompt);
assert.equal(failReport.status, 'fail');
const codes = failReport.issues.map((issue) => issue.code);
assert(codes.includes('missing_voiceover_script_section'), 'should catch buried required VO script');
assert(codes.includes('missing_closing_copy'), 'should catch missing final brand copy');
assert(codes.includes('process_term_in_prompt'), 'should catch Seedance/mp4 process terms');
assert(codes.includes('runtime_term_in_prompt'), 'should catch 15s/16:9/720p runtime pollution');
assert(codes.includes('missing_shot_sequence'), 'should catch missing shots');
assert(codes.includes('forbidden_term_present'), 'should catch non-negated forbidden terms');

const shotDensityContract = {
  case_id: 'shot-density-smoke',
  brand: '胡姬花',
  product: '古法小榨花生油',
  required_copy: ['胡姬花。'],
  required_closing_copy: ['胡姬花。'],
  required_assets: [],
  min_meaningful_shots: 8
};

const sparsePrompt = `
全片目标：手绘动画风的胡姬花广告。
必读口播脚本：
1. 胡姬花。
主体定义：卖油郎和胡姬花产品瓶。
声音计划：胡姬花。
文字计划：古法香。
镜头1：卖油郎出场。
镜头2：木榨出油。
镜头3：产品瓶出现。
镜头4：收尾说胡姬花。
必要约束：不要水印。
`;

const sparseReport = runAssert(shotDensityContract, sparsePrompt);
assert.equal(sparseReport.status, 'fail');
assert(
  sparseReport.issues.map((issue) => issue.code).includes('insufficient_shot_count'),
  'should catch a 15s Focus Media prompt with too few shots'
);

const detailPlanContract = {
  case_id: 'director-detail-smoke',
  brand: '胡姬花',
  product: '古法小榨花生油',
  required_copy: ['胡姬花。'],
  required_closing_copy: ['胡姬花。'],
  required_assets: [],
  required_prompt_terms: ['音乐床', '音效', '道具逻辑', '最后一帧']
};

const thinPrompt = `
全片目标：胡姬花广告。
必读口播脚本：
1. 胡姬花。
主体定义：卖油郎和胡姬花古法小榨花生油产品瓶。
声音计划：男声读胡姬花。
文字计划：胡姬花。
镜头1：产品瓶出现，男声说胡姬花。
必要约束：不要水印。
`;

const detailFailReport = runAssert(detailPlanContract, thinPrompt);
assert.equal(detailFailReport.status, 'fail');
assert(
  detailFailReport.issues.map((issue) => issue.code).includes('missing_required_prompt_term'),
  'should catch missing director-detail prompt terms'
);

const detailedPrompt = `
全片目标：胡姬花广告。
必读口播脚本：
1. 胡姬花。
主体定义：卖油郎和胡姬花古法小榨花生油产品瓶。
声音计划：全片有连续音乐床，关键转场有音效，品牌落版音乐尾音延续到最后一帧。
文字计划：胡姬花。
动作与道具逻辑：花生、木榨、油流和产品瓶都有道具逻辑，分别承担原料证明、工艺证明、香气记忆和品牌收口。
镜头1：产品瓶出现，男声说胡姬花。
必要约束：不要水印。
`;

const detailPassReport = runAssert(detailPlanContract, detailedPrompt);
assert.equal(detailPassReport.status, 'pass');

const assetPromptTermsContract = {
  case_id: 'asset-prompt-terms-smoke',
  brand: '红牡丹',
  product: '大米/放心粮油',
  required_copy: ['红牡丹。'],
  required_closing_copy: ['红牡丹。'],
  required_assets: [
    {
      name: 'selected_audio_v1b',
      prompt_terms: ['已上传广告歌音频', '完整成片音频'],
      internal_terms: ['版本一B', 'selected_audio_v1b'],
      path: 'assets/audio/01_selected_v1b_magic_ad_song.mp3'
    }
  ],
  forbidden_process_terms: ['版本一B', 'selected_audio_v1b', '01_selected_v1b_magic_ad_song.mp3']
};

const cleanAssetPrompt = `
全片目标：红牡丹大米/放心粮油广告，画面按已上传广告歌音频的完整成片音频做口型、动作卡点和收尾。
必读口播脚本：
1. 红牡丹。
主体定义：广州家庭饭点，红牡丹大米。
声音计划：使用已上传广告歌音频作为完整成片音频，不另写歌词。
文字计划：红牡丹。
镜头1：红牡丹大米产品收口，男声说红牡丹。
必要约束：不要水印。
`;

const cleanAssetReport = runAssert(assetPromptTermsContract, cleanAssetPrompt);
assert.equal(cleanAssetReport.status, 'pass');

const processAssetPrompt = cleanAssetPrompt.replace('完整成片音频，不另写歌词', '完整成片音频，版本一B，不另写歌词');
const processAssetReport = runAssert(assetPromptTermsContract, processAssetPrompt);
assert.equal(processAssetReport.status, 'fail');
assert(
  processAssetReport.issues.map((issue) => issue.code).includes('process_term_in_prompt'),
  'should catch internal asset version labels in final prompt'
);

const completeMixContract = {
  case_id: 'complete-mix-control-smoke',
  brand: '红牡丹',
  product: '大米/放心粮油',
  required_copy: ['食饭啦！', '红牡丹 广府人自己的放心米'],
  required_closing_copy: ['红牡丹 广府人自己的放心米'],
  required_assets: [],
  audio_control_contract: {
    complete_mix: true,
    allow_additional_audio: false,
    required_prompt_terms: ['唯一完整声轨', '不重新演唱', '标准普通话直接念白', '按音频重拍和停顿切换'],
    forbidden_prompt_terms: ['允许增加环境音', '新增转场音效', '另配背景音乐']
  }
};

const completeMixPrompt = `
全片目标：红牡丹大米/放心粮油家庭广告。
必读口播脚本：
1. 食饭啦！
2. 红牡丹 广府人自己的放心米
声音计划：已上传完整音频是唯一完整声轨，不重新演唱。第2句保持标准普通话直接念白。画面按音频重拍和停顿切换，不新增转场音效，不另配背景音乐。
主体定义：广州家庭和红牡丹大米。
文字计划：红牡丹。
镜头1：妈妈随第1句喊开饭。
镜头2：产品全家福承接第2句，标准普通话说“红牡丹 广府人自己的放心米”。
必要约束：不要水印。
`;

const completeMixPassReport = runAssert(completeMixContract, completeMixPrompt);
assert.equal(completeMixPassReport.status, 'pass');

const conflictingMixPrompt = completeMixPrompt.replace(
  '不新增转场音效，不另配背景音乐',
  '允许增加环境音，新增转场音效，另配背景音乐'
);
const conflictingMixReport = runAssert(completeMixContract, conflictingMixPrompt);
assert.equal(conflictingMixReport.status, 'fail');
assert(
  conflictingMixReport.issues.map((issue) => issue.code).includes('conflicting_audio_instruction'),
  'should catch extra sound requests when a complete uploaded mix already exists'
);

const thinMixPrompt = completeMixPrompt.replace(
  '第2句保持标准普通话直接念白。画面按音频重拍和停顿切换，',
  '第2句收尾。画面跟随音乐，'
);
const thinMixReport = runAssert(completeMixContract, thinMixPrompt);
assert.equal(thinMixReport.status, 'fail');
assert(
  thinMixReport.issues.map((issue) => issue.code).includes('missing_audio_control_term'),
  'should catch missing complete-audio control terms'
);

const assetDrivenContract = {
  case_id: 'asset-driven-smoke',
  brand: '红牡丹',
  product: '大米',
  prompt_mode: 'asset_driven',
  required_copy: ['食饭啦！', '红牡丹，广府人自己的放心米。'],
  required_closing_copy: ['红牡丹，广府人自己的放心米。'],
  required_assets: [],
  audio_control_contract: {
    complete_mix: true,
    required_prompt_terms: ['唯一成片声轨', '镜头时长由音频决定']
  }
};

const assetDrivenPrompt = `
@Audio 1 是唯一成片声轨，镜头时长由音频决定。
@Image 1 是红牡丹 Logo 标准；@Image 2-6 是产品包装标准。

“食饭啦！”：第一帧电饭煲热气升起，妈妈喊饭。
“红牡丹，广府人自己的放心米。”：最终产品阵列和红牡丹 Logo 稳定收口。

写实广州家庭食品广告。除包装和 Logo 自带文字外，不生成字幕。
`;

const assetDrivenManifest = {
  assets: [
    { slot: '@Audio 1', type: 'complete_audio', required: true, platform_eligible: true },
    { slot: '@Image 1', type: 'logo', required: true, platform_eligible: true },
    { slot: '@Image 2-6', type: 'product', required: true, platform_eligible: true }
  ]
};

const assetDrivenReport = runAssert(assetDrivenContract, assetDrivenPrompt, assetDrivenManifest);
assert.equal(assetDrivenReport.status, 'pass');

const characterContract = {
  case_id: 'character-continuity-smoke',
  brand: '红牡丹',
  product: '大米',
  required_copy: ['红牡丹。'],
  required_closing_copy: ['红牡丹。'],
  required_assets: [],
  required_shots: 2,
  character_bible: {
    cast_count: 3,
    required_prompt_terms: ['全片固定三人'],
    roles: [
      { role_id: '人物A', required_prompt_terms: ['妈妈', '肩长黑发', '米白上衣'] },
      { role_id: '人物B', required_prompt_terms: ['爸爸', '短黑发', '浅蓝衬衫'] },
      { role_id: '人物C', required_prompt_terms: ['儿子', '黑色齐刘海', '白色T恤'] }
    ],
    relationship_terms: ['人物A和人物B是夫妻', '人物C是人物A和人物B的儿子']
  },
  shot_cast_plan: [
    { shot: 1, role_ids: ['人物A'] },
    { shot: 2, role_ids: ['人物A', '人物B', '人物C'] }
  ]
};

const characterPrompt = `
全片目标：红牡丹大米家庭广告。
必读口播脚本：
1. 红牡丹。
主体定义：全片固定三人。人物A是妈妈，肩长黑发，穿米白上衣。人物B是爸爸，短黑发，穿浅蓝衬衫。人物C是儿子，黑色齐刘海，穿白色T恤。人物A和人物B是夫妻；人物C是人物A和人物B的儿子。
声音计划：最后读红牡丹。
文字计划：红牡丹。
镜头1：人物A端饭入场。
镜头2：人物A、人物B、人物C同桌，最后说红牡丹。
必要约束：不要水印。
`;

const characterPassReport = runAssert(characterContract, characterPrompt);
assert.equal(characterPassReport.status, 'pass');

const audienceReviewContract = {
  case_id: 'audience-interpretation-smoke',
  brand: '红牡丹',
  product: '大米',
  required_copy: ['红牡丹。'],
  required_closing_copy: ['红牡丹。'],
  required_assets: [],
  audience_interpretation_review: {
    required: true,
    status: 'pass_after_revision',
    unresolved_blockers: []
  }
};

const audienceReviewPassReport = runAssert(audienceReviewContract, `
全片目标：红牡丹大米广告。
必读口播脚本：
1. 红牡丹。
主体定义：红牡丹大米。
声音计划：最后读红牡丹。
文字计划：红牡丹。
镜头1：产品落版，最后说红牡丹。
必要约束：不要水印。
`);
assert.equal(audienceReviewPassReport.status, 'pass');

const blockedAudienceContract = {
  ...audienceReviewContract,
  audience_interpretation_review: {
    required: true,
    status: 'needs_revision',
    unresolved_blockers: ['shot 4 wrong spouse inference']
  }
};
const blockedAudienceReport = runAssert(blockedAudienceContract, `
全片目标：红牡丹大米广告。
必读口播脚本：
1. 红牡丹。
主体定义：红牡丹大米。
声音计划：最后读红牡丹。
文字计划：红牡丹。
镜头1：产品落版，最后说红牡丹。
必要约束：不要水印。
`);
assert.equal(blockedAudienceReport.status, 'fail');
const blockedAudienceCodes = blockedAudienceReport.issues.map((issue) => issue.code);
assert(blockedAudienceCodes.includes('audience_interpretation_review_not_passed'), 'should block generation before audience review passes');
assert(blockedAudienceCodes.includes('audience_interpretation_blockers_unresolved'), 'should catch unresolved audience-interpretation blockers');

const missingAudienceReviewReport = runAssert({
  case_id: 'audience-interpretation-missing',
  brand: '红牡丹',
  product: '大米',
  required_copy: ['红牡丹。'],
  required_closing_copy: ['红牡丹。'],
  required_assets: [],
  audience_interpretation_review: null
}, `
全片目标：红牡丹大米广告。
必读口播脚本：
1. 红牡丹。
主体定义：红牡丹大米。
声音计划：最后读红牡丹。
文字计划：红牡丹。
镜头1：产品落版，最后说红牡丹。
必要约束：不要水印。
`);
assert.equal(missingAudienceReviewReport.status, 'fail');
assert(
  missingAudienceReviewReport.issues.some(issue => issue.code === 'audience_interpretation_review_missing'),
  'should block prompt assembly when the independent risk review is missing'
);

const textLayerContract = {
  case_id: 'text-layer-smoke',
  brand: '红牡丹',
  product: '大米',
  required_copy: ['食饭啦！', '红牡丹 广府人自己的放心米'],
  required_closing_copy: ['红牡丹 广府人自己的放心米'],
  required_assets: [],
  text_generation_contract: {
    mode: 'flower_text_only',
    allowed_generated_text: ['食饭啦'],
    post_overlay_text: ['放心粮油 红牡丹', '红牡丹 广府人自己的放心米'],
    required_prompt_terms: ['只保留开场花字', '不生成广告语字幕', '预留干净字幕安全区'],
    forbidden_positive_cues: ['画面大字', '屏幕字幕', '逐句字幕']
  }
};

const textLayerPassPrompt = `
全片目标：红牡丹大米广告。
必读口播脚本：
1. 食饭啦！
2. 红牡丹 广府人自己的放心米
主体定义：红牡丹大米。
声音计划：保留完整音频。
文字计划：生成阶段只保留开场花字“食饭啦”；第2句不生成广告语字幕，并为后期预留干净字幕安全区。
镜头1：妈妈喊开饭，花字与热气一起出现。
镜头2：产品落版并保留干净下方区域，音频原样读“红牡丹 广府人自己的放心米”。
必要约束：不要自动字幕和随机文字。
`;
const textLayerPassReport = runAssert(textLayerContract, textLayerPassPrompt);
assert.equal(textLayerPassReport.status, 'pass');

const textLayerFailPrompt = textLayerPassPrompt.replace(
  '生成阶段只保留开场花字“食饭啦”；第2句不生成广告语字幕，并为后期预留干净字幕安全区。',
  '开场画面大字“食饭啦”，随后逐句字幕“放心粮油 红牡丹”，结尾屏幕字幕“红牡丹 广府人自己的放心米”。'
);
const textLayerFailReport = runAssert(textLayerContract, textLayerFailPrompt);
assert.equal(textLayerFailReport.status, 'fail');
const textLayerFailCodes = textLayerFailReport.issues.map((issue) => issue.code);
assert(textLayerFailCodes.includes('post_overlay_text_requested_in_generation'), 'should keep deterministic subtitles out of generation text plan');
assert(textLayerFailCodes.includes('plain_subtitle_generation_cue'), 'should catch positive plain-subtitle generation cues');

const genericFamilyPrompt = characterPrompt
  .replace('全片固定三人。人物A是妈妈，肩长黑发，穿米白上衣。人物B是爸爸，短黑发，穿浅蓝衬衫。人物C是儿子，黑色齐刘海，穿白色T恤。人物A和人物B是夫妻；人物C是人物A和人物B的儿子。', '一家三口，妈妈、爸爸和儿子。')
  .replace('人物A端饭入场', '妈妈端饭入场')
  .replace('人物A、人物B、人物C同桌', '全家同桌');
const genericFamilyReport = runAssert(characterContract, genericFamilyPrompt);
assert.equal(genericFamilyReport.status, 'fail');
const genericFamilyCodes = genericFamilyReport.issues.map((issue) => issue.code);
assert(genericFamilyCodes.includes('missing_character_role_term'), 'should catch generic role nouns without stable character ids');
assert(genericFamilyCodes.includes('missing_relationship_term'), 'should catch missing explicit relationship map');
assert(genericFamilyCodes.includes('missing_shot_cast_role'), 'should catch shots that omit assigned role ids');

const noRequiredVoiceContract = {
  case_id: 'no-required-voice-smoke',
  brand: '胡姬花',
  product: '古法小榨花生油',
  required_assets: []
};

const noRequiredVoicePrompt = `
全片目标：胡姬花广告。
主体定义：胡姬花古法小榨花生油产品瓶。
声音计划：轻快音乐床和简短环境音。
文字计划：古法香。
镜头1：产品瓶出现。
必要约束：不要水印。
`;

const noRequiredVoiceReport = runAssert(noRequiredVoiceContract, noRequiredVoicePrompt);
assert.equal(noRequiredVoiceReport.status, 'pass');

const voiceoverScriptOnlyContract = {
  case_id: 'voiceover-script-only-smoke',
  brand: '胡姬花',
  product: '古法小榨花生油',
  voiceover_script: ['胡姬花。'],
  required_assets: []
};

const voiceoverScriptOnlyPrompt = `
全片目标：胡姬花古法小榨花生油广告。
主体定义：胡姬花古法小榨花生油产品瓶。
声音计划：男声最后说胡姬花。
文字计划：胡姬花。
镜头1：产品瓶出现，男声说胡姬花。
必要约束：不要水印。
`;

const voiceoverScriptOnlyReport = runAssert(voiceoverScriptOnlyContract, voiceoverScriptOnlyPrompt);
assert.equal(voiceoverScriptOnlyReport.status, 'fail');
assert(
  voiceoverScriptOnlyReport.issues.map((issue) => issue.code).includes('missing_voiceover_script_section'),
  'should require a first-class VO script when story_contract.voiceover_script exists'
);

const buriedVoiceoverPrompt = `
全片目标：胡姬花广告。
主体定义：卖油郎和胡姬花产品瓶。
声音计划：男声读出胡姬花。不是所有的香，都叫古法香。胡姬花，只做花生油。坚守非遗古法。拒绝科技狠活。胡姬花，古法小榨花生油。百年非遗古法香。好的花生油，就认古法香。胡姬花。
文字计划：古法香。
镜头1：卖油郎出场。
镜头2：木榨出油。
镜头3：产品瓶出现。
镜头4：最终说胡姬花。
必要约束：不要水印。
`;

const buriedVoiceoverReport = runAssert(contract, buriedVoiceoverPrompt);
assert.equal(buriedVoiceoverReport.status, 'fail');
assert(
  buriedVoiceoverReport.issues.map((issue) => issue.code).includes('missing_voiceover_script_section'),
  'should fail when ad copy is buried in sound plan instead of a first-class VO script'
);

const reorderedVoiceoverPrompt = `
全片目标：胡姬花广告。
必读口播脚本：
1. 不是所有的香，都叫古法香。
2. 只做花生油，胡姬花。
3. 坚守非遗古法。
4. 拒绝科技狠活。
5. 胡姬花，古法小榨花生油。
6. 百年非遗古法香。
7. 好的花生油，就认古法香。
8. 胡姬花。
主体定义：卖油郎和胡姬花产品瓶。
声音计划：按必读口播脚本读出。
文字计划：古法香。
镜头1：卖油郎出场。
镜头2：木榨出油。
镜头3：产品瓶出现。
镜头4：最终说胡姬花。
必要约束：不要水印。
`;

const reorderedVoiceoverReport = runAssert(contract, reorderedVoiceoverPrompt);
assert.equal(reorderedVoiceoverReport.status, 'fail');
assert(
  reorderedVoiceoverReport.issues.map((issue) => issue.code).includes('required_copy_not_in_voiceover_script'),
  'should fail when a required VO line is rewritten or order-reversed inside the script'
);

console.log('test_assert_creative_prompt passed');
