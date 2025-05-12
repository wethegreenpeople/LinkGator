export enum PluginManagerErrorType {
    PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
    PLUGIN_ALREADY_REGISTERED = 'PLUGIN_ALREADY_REGISTERED',
    INVALID_PLUGIN = 'INVALID_PLUGIN'
}

export class PluginManagerError extends Error {
    type: PluginManagerErrorType;

    constructor(type: PluginManagerErrorType, message: string) {
        super(message);
        this.type = type;
        this.name = 'PluginManagerError';
    }
}