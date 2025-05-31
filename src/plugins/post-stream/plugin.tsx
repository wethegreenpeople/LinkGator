import { For, JSX } from 'solid-js';
import { ClientPlugin } from '../../models/plugin_models/client-plugin';
import { AbstractBasePlugin } from '../../models/plugin_models/base-plugin';
import { PluginType, BasePluginSettings } from '../../models/plugin_models/plugin';
import { Post } from '../../models/post';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { PostCard } from '~/components/PostCard';

export class PostStreamClientPlugin extends AbstractBasePlugin<BasePluginSettings> implements ClientPlugin {
  id = 'post-stream-client';
  name = 'Post Stream Client Plugin';
  version = '1.0.0';
  description = 'Adds interactive elements to the post stream';
  pluginType = PluginType.CLIENT as const;

  constructor() {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    super(currentDir, { 
      enabled: true
    });
  }

  /**
   * Add content to the main feed
   */
  mainFeed(posts: Post[]): JSX.Element | null {
    if (!this.isEnabled()) return null;
    
    return (
      <For each={posts}>
        {(post) => <PostCard post={post} />}
      </For>
    );
  }
}