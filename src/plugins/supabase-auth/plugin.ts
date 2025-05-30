import { Result } from 'typescript-result';
import { AuthPlugin } from '../../models/plugin_models/auth-plugin';
import { PluginType, BasePluginSettings } from '../../models/plugin_models/plugin';
import { createServerSupabase } from '~/plugins/supabase/supabase-server';
import { AbstractBasePlugin } from '../../models/plugin_models/base-plugin';
import { fileURLToPath } from 'url'; // Added for ES Module path resolution
import * as path from 'path'; // Added for path.dirname

// Define specific settings for SupabaseAuth, extending base settings
interface SupabaseAuthSettings extends BasePluginSettings {
  // Add any supabase-specific settings here if needed in the future
}

/**
 * Supabase implementation of the AuthPlugin interface, extending AbstractBasePlugin.
 */
export class SupabaseAuthPlugin extends AbstractBasePlugin<SupabaseAuthSettings> implements AuthPlugin {
  id = 'supabase-auth';
  name = 'Supabase Auth';
  version = '1.0.0';
  description = 'Supabase implementation for authentication';
  pluginType = PluginType.AUTH;

  // constructor calls super to initialize settings and logger
  constructor() {
    // ES Module way to get current directory
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    super(currentDir, { enabled: false }); 
  }

  async signUpUser(email: string, password: string): Promise<Result<{user: any}, Error>> {
    const serverSupabase = createServerSupabase();
    const signUpResponse = await serverSupabase.auth.signUp({ email, password });
    
    if (signUpResponse.error) {
      this.logger.error`Signup error: ${signUpResponse.error.message}`;
      return Result.error(new Error(`Signup failed: ${signUpResponse.error.message}`));
    }
    
    return Result.ok({ user: signUpResponse.data.user });
  }
  
  async signInUser(email: string, password: string): Promise<Result<any, Error>> {
    const serverSupabase = createServerSupabase();
    const signInResponse = await serverSupabase.auth.signInWithPassword({ email, password });

    if (signInResponse.error) {
      this.logger.error`Sign in error: ${signInResponse.error.message}`;
      return Result.error(new Error(`Sign in failed: ${signInResponse.error.message}`));
    }
    this.logger.debug`Sign in successful: ${JSON.stringify(signInResponse.data)}`
    
    return Result.ok(signInResponse.data);
  }

  async logOutUser(): Promise<Result<any, Error>> {
    const serverSupabase = createServerSupabase();
    const signOutResponse = await serverSupabase.auth.signOut();
    
    if (signOutResponse.error) {
      this.logger.error`Sign out error: ${signOutResponse.error.message}`;
      return Result.error(new Error(`Sign out failed: ${signOutResponse.error.message}`));
    }
    
    return Result.ok(signOutResponse);
  }
  
  async checkIfLoggedIn(): Promise<Result<{session: any} | null, Error>> {
    try {
      const serverSupabase = createServerSupabase();
      const { data, error } = await serverSupabase.auth.getSession();
      
      if (error) {
        this.logger.error`Session check error: ${error.message}`;
        return Result.error(new Error(`Session check failed: ${error.message}`));
      }
      
      // Return the session if it exists, otherwise null
      return Result.ok(data.session ? { session: data.session } : null);
    } catch (error) {
      this.logger.error`Unexpected error in checkIfLoggedIn: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }
}