export {
  getDevices,
  LocalStream,
  LocalDisplayStream,
  LocalSystemAudioStream,
  LocalStreamEventNames,
  StreamEventNames,
  type ServerMuteReason,
  LocalMicrophoneStreamEventNames,
  LocalCameraStreamEventNames,
  LocalMicrophoneStream,
  LocalCameraStream,
  createMicrophoneStream,
  createCameraStream,
  createDisplayStream,
  createDisplayStreamWithAudio,
} from './webrtc-core';

export {NoiseReductionEffect, VirtualBackgroundEffect} from '@webex/web-media-effects';
export type {
  NoiseReductionEffectOptions,
  VirtualBackgroundEffectOptions,
} from '@webex/web-media-effects';

export {FacingMode, DisplaySurface, PresetCameraConstraints} from './constants';
