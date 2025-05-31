import { JSX } from "solid-js"
import { AbstractBasePlugin } from "~/models/plugin_models/base-plugin"
import { ClientPlugin } from "~/models/plugin_models/client-plugin"
import { BasePluginSettings, PluginType } from "~/models/plugin_models/plugin"
import { Post } from "~/models/post"
import { fileURLToPath } from 'url';
import * as path from 'path';

type SidebarInfoSettings = {
    enabled: boolean;
    header: string;
    body: string;
}

export class SidebarInfo extends AbstractBasePlugin<SidebarInfoSettings> implements ClientPlugin {
    id: string = 'sidebarInfo';
    name: string = 'Side Bar Info';
    version: string = '1.0.0';
    description: string = 'Display some simple information in the sidebar';
    pluginType = PluginType.CLIENT as const;    constructor() {
        const currentFilePath = fileURLToPath(import.meta.url);
        const currentDir = path.dirname(currentFilePath);
        super(currentDir, { 
            enabled: true,
            header: "",
            body: ""
        });
    }
    mainFeed?(posts: Post[]): JSX.Element | null {
        return null;
    }    
      homeSidebar?(): JSX.Element | null {
        if (!this.settings.enabled || (!this.settings.header && !this.settings.body)) {
            return null;
        }

        return (
            <article class="bg-surface rounded-lg shadow-sm overflow-hidden mb-4">
                <div class="p-4">
                    {this.settings.header && (
                        <h2 class="text-lg font-semibold text-on-surface mb-3 leading-tight">
                            {this.settings.header}
                        </h2>
                    )}
                    {this.settings.body && (
                        <p class="text-on-surface-variant leading-relaxed">
                            {this.settings.body}
                        </p>
                    )}
                </div>
            </article>
        );
    }
}