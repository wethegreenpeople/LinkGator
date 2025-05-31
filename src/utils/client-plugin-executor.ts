import { JSX } from 'solid-js';
import { renderToString } from 'solid-js/web';
import { PluginManager } from '~/plugins/manager';
import { PluginType } from '~/models/plugin_models/plugin';
import { Post } from '~/models/post';
import { ClientPlugin } from '~/models/plugin_models/client-plugin';

export interface PluginContent {
  mainFeed: string[];
  sidebar: string[];
}

export class ClientPluginExecutor {
  private static instance: ClientPluginExecutor;
  private pluginManager: PluginManager;

  private constructor() {
    this.pluginManager = PluginManager.getInstance();
  }

  public static getInstance(): ClientPluginExecutor {
    if (!ClientPluginExecutor.instance) {
      ClientPluginExecutor.instance = new ClientPluginExecutor();
    }
    return ClientPluginExecutor.instance;
  }
  public async executeAllPlugins(posts: Post[]): Promise<PluginContent> {
    await PluginManager.initializePlugins();
    
    const clientPlugins = this.pluginManager.getByType<ClientPlugin>(PluginType.CLIENT)
      .filter(plugin => plugin.isEnabled());
    
    const content: PluginContent = {
      mainFeed: [],
      sidebar: []
    };
    
    for (const plugin of clientPlugins) {
      try {
        // Main feed content
        if (plugin.mainFeed) {
          const mainElement = plugin.mainFeed(posts);
          if (mainElement) {
            const htmlString = renderToString(() => mainElement);
            content.mainFeed.push(htmlString);
          }
        }
        
        // Sidebar content
        if (plugin.homeSidebar) {
          const sidebarElement = plugin.homeSidebar();
          if (sidebarElement) {
            const htmlString = renderToString(() => sidebarElement);
            content.sidebar.push(htmlString);
          }
        }
      } catch (error) {
        console.error(`Error executing plugin ${plugin.id}:`, error);
      }
    }
    
    return content;
  }
  public async executeMainFeedPlugins(posts: Post[]): Promise<string[]> {
    const content = await this.executeAllPlugins(posts);
    return content.mainFeed;
  }

  public async executeSidebarPlugins(posts: Post[]): Promise<string[]> {
    const content = await this.executeAllPlugins(posts);
    return content.sidebar;
  }
}
