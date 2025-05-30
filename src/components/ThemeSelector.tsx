import { For, createSignal, onMount } from "solid-js";
import { ClientThemeManager } from "~/utils/client-theme-manager";

interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function ThemeSelector() {
  const [themes, setThemes] = createSignal<ThemeInfo[]>([]);
  const [currentTheme, setCurrentTheme] = createSignal<string | null>(null);
  onMount(async () => {
    try {
      const response = await fetch('/api/themes');
      const data = await response.json();
      
      if (data.themes) {
        console.log('Available themes:', data.themes);
        setThemes(data.themes);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
    }

    const current = ClientThemeManager.getCurrentTheme();
    setCurrentTheme(current);
    
    // If there's a saved theme, apply it with fresh variables
    if (current) {
      try {
        const response = await fetch(`/api/themes/${current}/variables`);
        if (response.ok) {
          const data = await response.json();
          if (data.variables) {
            ClientThemeManager.applyTheme(current, data.variables);
          }
        }
      } catch (error) {
        console.error('Error reapplying saved theme:', error);
      }
    }
  });
  const handleThemeChange = async (themeId: string) => {
    if (themeId === '') {
      if (ClientThemeManager.removeCurrentTheme()) {
        setCurrentTheme(null);
      }
    } else {
      try {
        // Fetch theme variables from server
        const response = await fetch(`/api/themes/${themeId}/variables`);
        if (response.ok) {
          const data = await response.json();
          if (data.variables && ClientThemeManager.applyTheme(themeId, data.variables)) {
            setCurrentTheme(themeId);
          }
        } else {
          console.error('Failed to fetch theme variables');
        }
      } catch (error) {
        console.error('Error applying theme:', error);
      }
    }
  };
  

  return (
    <div class="flex items-center space-x-3">
      <label class="text-sm font-medium text-on-surface">Theme:</label>      <select
        class="bg-surface-container border border-outline rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        value={currentTheme() || ''}
        onChange={(e) => handleThemeChange(e.target.value)}
      >
        <option value="">Default</option>
        <For each={themes()}>
          {(theme) => {
            if (theme.enabled) {
                return (
                    <option value={theme.id} disabled={!theme.enabled}>
                    {theme.name} {!theme.enabled && '(Disabled)'}
                    </option>
                )
            }
          }}
        </For>
      </select>
    </div>
  );
};
