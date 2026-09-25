// butterchurn ships no types; only what we call is declared here
declare module 'butterchurn' {
  export interface Visualizer {
    connectAudio(node: AudioNode): void;
    disconnectAudio(node: AudioNode): void;
    loadPreset(preset: object, blendTime?: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
    launchSongTitleAnim(text: string): void;
  }
  const butterchurn: {
    createVisualizer(ctx: AudioContext, canvas: HTMLCanvasElement, opts: {
      width: number; height: number; pixelRatio?: number; textureRatio?: number;
      meshWidth?: number; meshHeight?: number; onlyUseWASM?: boolean;
    }): Visualizer;
  };
  export default butterchurn;
}
declare module 'butterchurn-presets' {
  const presets: { getPresets(): Record<string, object> };
  export default presets;
}
