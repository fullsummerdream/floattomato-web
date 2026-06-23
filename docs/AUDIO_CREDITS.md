# 音频致谢 / AUDIO_CREDITS

飘悠番茄 Web V1.1 的 15 段白噪音音轨**全部源自开源项目 [moodist](https://github.com/remvze/moodist)**（作者 MAZE，MIT License）。

我们感谢 moodist 项目对高质量氛围音频的整理与策展工作。我们的实现复用了 moodist 的音频资产，但不复用其代码（UI 与播放逻辑均为本项目自有实现）。

> **音频随仓库分发** — `public/audio/` 目录纳入 git，clone 即可使用。后续若扩展白噪音混合（V1.2+ 候选）需要更多音轨，从 moodist 同源拉取新文件并更新 [scripts/audio-manifest.json](../scripts/audio-manifest.json) 与本文件映射表即可。

## 文件来源与映射

| 飘悠番茄音轨 | moodist 源文件 | 分类 |
|---|---|---|
| rain-light.mp3 | [rain/light-rain.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/rain/light-rain.mp3) | 雨声 |
| rain-medium.mp3 | [rain/rain-on-window.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/rain/rain-on-window.mp3) | 雨声 |
| rain-storm.mp3 | [rain/heavy-rain.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/rain/heavy-rain.mp3) | 雨声 |
| thunder.mp3 | [rain/thunder.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/rain/thunder.mp3) | 雨声 |
| ocean.mp3 | [nature/waves.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/nature/waves.mp3) | 自然 |
| stream.mp3 | [nature/river.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/nature/river.mp3) | 自然 |
| forest.mp3 | [nature/jungle.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/nature/jungle.mp3) | 自然 |
| fire.mp3 | [nature/campfire.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/nature/campfire.mp3) | 自然 |
| wind.mp3 | [nature/wind.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/nature/wind.mp3) | 自然 |
| cafe.mp3 | [places/cafe.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/places/cafe.mp3) | 环境 |
| library.mp3 | [places/library.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/places/library.mp3) | 环境 |
| train.mp3 | [places/subway-station.mp3](https://github.com/remvze/moodist/blob/main/public/sounds/places/subway-station.mp3) | 环境 |
| white-noise.wav | [noise/white-noise.wav](https://github.com/remvze/moodist/blob/main/public/sounds/noise/white-noise.wav) | 噪音 |
| pink-noise.wav | [noise/pink-noise.wav](https://github.com/remvze/moodist/blob/main/public/sounds/noise/pink-noise.wav) | 噪音 |
| brown-noise.wav | [noise/brown-noise.wav](https://github.com/remvze/moodist/blob/main/public/sounds/noise/brown-noise.wav) | 噪音 |

## License

moodist 在其 [README](https://github.com/remvze/moodist#third-party-assets) 中声明音频资产采用两种 license 之一（按文件区分）：

- **[Pixabay Content License](https://pixabay.com/service/license-summary/)** — 免费、可商用、无须署名，但禁止「以独立形式重新分发音频本体」（不可作为音效素材库再出售）；嵌入到应用中使用合法。
- **[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)** — 公有领域，无任何限制。

**飘悠番茄的使用属于嵌入式（embedded）应用场景，符合两种 license。**

## 法律边界

| 允许 | 禁止 |
|---|---|
| ✅ 嵌入到飘悠番茄 App 内播放（包括商业版本） | ❌ 改包成「飘悠番茄音效素材包」单独发售 |
| ✅ 音频文件随源码仓库分发（与 moodist 同模式） | ❌ 声明音频本身的版权归属本项目 |
| ✅ 无需在 UI 中显示署名（license 不强制） | |

我们仍在本文档中标明 moodist 来源——这是我们对开源整理工作的自愿致敬，而非 license 强制要求。

## moodist 项目原始 LICENSE

moodist 代码采用 **MIT License**（Copyright © 2023 MAZE）。本项目未复用 moodist 代码，故 MIT 条款仅约束代码层面（不适用）；但作为致敬，本文档保留对 moodist 的清晰指引。
