import { Plugin, PluginType } from './plugin';
import { Result } from 'typescript-result';

export interface AuthPlugin extends Plugin {
    // Required auth plugin type
    pluginType: PluginType.AUTH | (PluginType & {});
    
    signUpUser(email: string, password: string): Promise<Result<{user: any}, Error>>;
    signInUser(email: string, password: string): Promise<Result<any, Error>>;
    logOutUser(): Promise<Result<any, Error>>;
    checkIfLoggedIn(): Promise<Result<{session: any} | null, Error>>;
}