// Gemini documentation + the user's authenticated agy 1.4.12 recordings.
// The agent's view_file/read_file tool supplies media; stream-json stays text.
export const ANTIGRAVITY_INPUT_MIMES={
  image:['image/png','image/jpeg','image/webp'],
  audio:['audio/wav','audio/mpeg','audio/ogg','audio/flac'],
  video:['video/mp4','video/webm']
};
export const ANTIGRAVITY_MODALITY_SOURCE='Gemini 官方输入模态 + 2026-11-03 Bridge++ 用户环境实测（3.8 Flash 图片/音频/视频，4 Argon 图片）';
export const ANTIGRAVITY_TRANSPORT_SOURCE='agy 1.4.12 view_file/read_file + --add-dir；2026-11-03 .runtime/agy-probe/ 的 view-file-abs、audio、video、add-dir、ro-add-dir 实测';
export function antigravityModelMedia(){return {images:true,audio:true,video:true,inputMimeTypes:Object.values(ANTIGRAVITY_INPUT_MIMES).flat(),modalitySource:ANTIGRAVITY_MODALITY_SOURCE};}
