// types.cef.d.ts

export interface CEFRoot {
  render(element: React.ReactElement): void;
}

export interface CEFInterface {
  /** Array of available component names */
  components: string[];
  
  /** Mapping of component names to their constructor functions */
  componentConstructors: Record<string, string>;
  
  /** Current visibility state of all components */
  visibilityState: Record<string, boolean>;
  
  /** React roots for each component */
  roots: Record<string, CEFRoot>;
  
  /**
   * Gets the path to a static asset
   * @param pluginName - The name of the plugin, or null for main CEF assets
   * @param fileName - The file path relative to the static directory
   * @returns The full path to the static asset
   * @example
   * // For main CEF static files:
   * CEF.getStaticPath(null, 'images/logo.png') // -> './static/images/logo.png'
   * // For plugin static files:
   * CEF.getStaticPath('my-plugin', 'icons/icon.svg') // -> './static/plugins/my-plugin/icons/icon.svg'
   */
  getStaticPath(pluginName: string | null, fileName: string): string;
  
  /** Initialize the CEF system */
  init(): void;
  
  /** Get the highest z-index among visible components */
  getHighestZIndex(): number;
  
  /** Bring a component to the front of the stack */
  bringToFront(componentName: string): void;
  
  /** Show a component */
  show(componentName: string): void;
  
  /** Hide a component */
  hide(componentName: string): void;
  
  /** Toggle a component's visibility */
  toggle(componentName: string): void;
  
  /** Check if a component is visible */
  isVisible(componentName: string): boolean;
  
  /** Hide all components */
  hideAll(): void;
  
  /** Show only one component, hiding all others */
  showOnly(componentName: string): void;
  
  /** Get an array of currently visible component names */
  getVisibleComponents(): string[];
}

declare global {
  interface Window {
    CEF: CEFInterface;
  }

  const CEF: CEFInterface;
}

export {};