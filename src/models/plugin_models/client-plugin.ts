import { JSX } from 'solid-js';
import { Plugin, PluginType } from './plugin';
import { Post } from '../post';

/**
 * Interface for client-side plugins that return JSX components
 * These plugins run on the server but return JSX for client rendering
 */
export interface ClientPlugin extends Plugin {
  pluginType: PluginType.CLIENT;
  
  /**
   * Generate JSX content for the main feed
   * @param posts Array of posts to potentially enhance or filter
   * @returns JSX element to insert into the main feed, or null if no content
   */
  mainFeed?(posts: Post[]): JSX.Element | null;
  
  /**
   * Generate JSX content for the home sidebar
   * @returns JSX element to insert into the sidebar, or null if no content
   */
  homeSidebar?(): JSX.Element | null;
}
