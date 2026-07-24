# FocusMedia TVC Creative Director

面向分众电梯媒体的 AI TVC 导演 Skill。

它把一条已经确认的广告文案，或一份包含产品、受众、传播目标与素材的完整 Brief，推进为可执行的导演方案、音频、分镜、众小智生成任务和成片验收结果。

```text
广告信息锁定
→ 导演方案讨论
→ 广告歌 / 配音
→ 文字分镜 / 九宫格分镜
→ 观众理解风险审核
→ 众小智 Seedance 生成
→ 成片验收与定向重做
→ 案例复盘
```

## 能做什么

| 环节 | 能力 |
| --- | --- |
| 导演策划 | 从广告文案或完整 Brief 提炼传播任务，给出 2–4 条真正不同的导演路线，并在确认后锁定创意机制 |
| 音频 | 生成广告歌、Jingle、完整广告音频或普通配音；支持提示词审核、多版本同条件采样、音频节拍映射与锁定校验 |
| 分镜 | 输出完整文字分镜、镜头脚本、九宫格分镜提示词、分镜资产绑定和镜头密度校验 |
| 素材控制 | 明确产品、Logo、人物、场景、音频和分镜各自控制什么，避免同一要求在多处互相冲突 |
| 视频生成 | 通过内部 `zxz` 命令行接口提交众小智 Seedance 任务、轮询状态并下载结果 |
| 成片验收 | 检查文案、音频、产品、Logo、人物连续性、品牌归因、观众理解风险和技术规格 |
| 定向重做 | 区分继续抽样、后期修复、重新剪辑、重新生成和上游改写，避免无目的反复出片 |
| 案例学习 | 保存案例反馈与可复用经验，用回放测试判断新规则是否真的提升了能力 |

本仓库是正向创作一支新 TVC 的唯一入口，不需要另外安装分镜 Skill。

## 快速安装

将仓库克隆到 Codex 的 Skills 目录：

```bash
git clone https://github.com/JoeSangAI/focusmedia-director-video-generator.git \
  ~/.codex/skills/focusmedia-tvc-creative-director
```

如果已经安装，进入目录更新：

```bash
git pull
```

第一次使用前运行环境检查：

```bash
cd ~/.codex/skills/focusmedia-tvc-creative-director
python3 scripts/check_environment.py
```

检查结果为 `READY` 后，即可在 Codex 中调用：

```text
请使用 $focusmedia-tvc-creative-director，
把下面这条已确认的广告文案做成一支 15 秒分众电梯 TVC。
先给我导演方案，确认方向后再进入音频、分镜和众小智生成。

品牌：
产品：
广告文案：
目标受众：
传播目标：
已有素材：
必须保留：
不能出现：
```

也可以直接提供完整 Brief、产品图、Logo、参考片和已有音频。Skill 会保留原始上下文，只在真正阻塞执行时询问必要信息。

## 运行条件

基础工作流需要：

- Python 3.9 或更高版本
- Node.js 18 或更高版本
- FFmpeg / FFprobe
- Python NumPy
- 内部 `zxz` 0.2.0 或更高版本，并已完成众小智登录

按需使用：

- 生成广告歌或配音：需要已授权的豆包音频凭证
- 生成九宫格分镜图片：需要宿主 Agent 提供图片生成能力
- 实际生成视频：需要有效的众小智账号、模型权限和生成额度

仓库提供完整工作流、执行脚本和校验器，不包含第三方模型、公司账号、密钥或付费额度。缺少图片生成能力时，仍会输出完整文字分镜、分镜清单和九宫格生成提示词，不会伪称已经生成图片。

## 使用原则

- 先锁定广告信息，再讨论导演表达。
- 导演方向确认前，不消耗音频或视频生成额度。
- 广告歌、Rap、舞蹈或歌词驱动的影片，先确定音频，再按真实节拍完成分镜。
- 一镜只承担一个主要传播任务；新角度不等于新信息。
- 产品图和 Logo 作为身份参考使用，不把素材硬贴进 AI 背景。
- 成片必须经过文案、音频、品牌资产、观众理解和技术规格检查后才能交付。
- 视频生成只走 `zxz` 接口，不用浏览器作为日常替代路径。

## 主要产物

一次完整项目通常会形成：

- 导演方案与 `director_contract.json`
- `audio_prompt.md`、音频候选和 `audio_beat_map.json`
- `shot_script.json`
- `storyboard_manifest.json`
- 九宫格分镜提示词或生成后的分镜图
- `storyboard_asset_bindings.json`
- `audience_interpretation_review.json`
- `creative_prompt.md`
- `asset_manifest.json`
- `runtime_config.json`
- 众小智任务清单、生成结果和成片验收记录

## 仓库结构

```text
.
├── SKILL.md              # Agent 的主工作流与判断规则
├── agents/
│   └── openai.yaml       # Skill 的界面名称与默认调用提示
├── references/           # 导演、分镜、音频、Seedance 与审核规范
└── scripts/              # 环境检查、生成适配、质量校验与回放测试
```

## 发布前自检

```bash
python3 scripts/check_environment.py
python3 scripts/test_release_package.py
node scripts/test_case_loop_scripts.js
python3 scripts/seedance_job_adapter.py --self-test
```

更完整的工作流和执行规则请查看 [`SKILL.md`](./SKILL.md)。
