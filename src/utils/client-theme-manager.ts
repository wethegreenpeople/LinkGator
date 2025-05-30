// Client-side theme application utility

// Client-side theme application utility

export class ClientThemeManager {
  private static currentTheme: string | null = null;
  private static currentVariables: Record<string, string> | null = null;

  static applyTheme(themeId: string, variables: Record<string, string>): boolean {
    try {
      const root = document.documentElement;
      Object.entries(variables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      this.currentTheme = themeId;
      this.currentVariables = variables;
      localStorage.setItem('selectedTheme', themeId);
      console.log(`Applied theme: ${themeId}`);
      return true;
    } catch (error) {
      console.error(`Failed to apply theme ${themeId}:`, error);
      return false;
    }
  }

  static removeCurrentTheme(): boolean {
    try {
      if (!this.currentVariables) return true;

      const root = document.documentElement;
      Object.keys(this.currentVariables).forEach((property) => {
        root.style.removeProperty(property);
      });

      this.currentTheme = null;
      this.currentVariables = null;
      localStorage.removeItem('selectedTheme');
      console.log('Removed current theme');
      return true;
    } catch (error) {
      console.error('Failed to remove theme:', error);
      return false;
    }
  }

  static getCurrentTheme(): string | null {
    return this.currentTheme;
  }

  static initFromStorage(): void {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
      // Note: Variables would need to be fetched from server/plugin
      console.log(`Found saved theme: ${savedTheme}`);
    }
  }
}
