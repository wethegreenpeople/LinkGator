import { Database } from '~/models/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabasePlugin } from '../../models/plugin_models/database-plugin';
import { Result } from 'typescript-result';
import { supabaseService } from '~/plugins/supabase/supabase-server';
import { DatabaseTableNames } from '~/models/database-tables';
import { PluginType, BasePluginSettings } from '../../models/plugin_models/plugin'; // Added BasePluginSettings
import { AbstractBasePlugin } from '../../models/plugin_models/base-plugin'; // Added AbstractBasePlugin
import { getLogger } from '@logtape/logtape';
import { fileURLToPath } from 'url'; // Added for ES Module path resolution
import * as path from 'path'; // Added for path.dirname

// Define specific settings for SupabaseDatabase, extending base settings
interface SupabaseDatabaseSettings extends BasePluginSettings {
  // Add any supabase-database-specific settings here if needed in the future
}

/**
 * Supabase implementation of the DatabasePlugin interface
 */
export class SupabaseDatabasePlugin extends AbstractBasePlugin<SupabaseDatabaseSettings> implements DatabasePlugin {
  id = 'supabase-database';
  name = 'Supabase Database';
  version = '1.0.0';
  description = 'Supabase implementation for database access';
  pluginType = PluginType.DATABASE;

  // Logger is inherited from AbstractBasePlugin

  constructor() {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    // Provide default settings for the database plugin
    super(currentDir, { enabled: true }); // Defaulting to true, can be overridden by settings.json
  }

  // loadSettings() and isEnabled() are inherited from AbstractBasePlugin

  async getProfileFromActorUri(actorUri: string): Promise<Result<{}, Error>> {
    const response = await supabaseService.from(DatabaseTableNames.Profiles)
      .select()
      .eq('actor_uri', actorUri)
      .limit(1);

    if (response.error) {
      return Result.error(new Error(`Couldn't retrieve profile from given actor URI: ${actorUri}`));
    }

    return Result.ok(response.data[0]);
  }

  async getKeysForActor(actorUri: string): Promise<Result<{private_key: string, public_key: string}, Error>> {
    const response = await supabaseService.from(DatabaseTableNames.Keys)
      .select()
      .eq('actor_uri', `${actorUri}`)
      .order("created_at", { ascending: false })
      .limit(1);


    if (response.error) {
      return Result.error(new Error(`Couldn't retrieve keys from given actor URI: ${actorUri}`));
    }

    return Result.ok({private_key: response.data[0].private_key, public_key: response.data[0].public_key});
  }

  async addFollower(followerActorUri: string, actorUri: string): Promise<Result<any, Error>> {
    const response = await supabaseService.from(DatabaseTableNames.Followers).insert({ 
      follower_actor_uri: followerActorUri, 
      actor_uri: actorUri 
    });

    if (response.error) {
      this.logger.error`Error adding follower: ${response.error}`;
      return Result.error(new Error(`Couldn't add follower: ${response.error.message}`));
    }

    return Result.ok(response.data);
  }

  async removeFollower(followerActorUri: string): Promise<Result<any, Error>> {
    const response = await supabaseService.from(DatabaseTableNames.Followers)
      .delete()
      .eq("follower_actor_uri", followerActorUri);

    if (response.error) {
      this.logger.error`Error removing follower: ${response.error}`;
      return Result.error(new Error(`Couldn't remove follower: ${response.error.message}`));
    }

    return Result.ok(response.data);
  }
  
  async createUserProfile(authId: string, actorUri: string): Promise<Result<any, Error>> {
    const updateProfileResponse = await supabaseService.from(DatabaseTableNames.Profiles).insert({
      auth_id: authId,
      actor_uri: actorUri
    });

    if (updateProfileResponse.error) {
      this.logger.error`Couldn't update profile: ${updateProfileResponse.error}`;
      return Result.error(new Error(`Profile creation failed: ${updateProfileResponse.error.message}`));
    }
    
    return Result.ok(updateProfileResponse.data);
  }
  
  async createUserKeys(authId: string, actorUri: string, publicKey: string, privateKey: string): Promise<Result<any, Error>> {
    const keyResponse = await supabaseService.from(DatabaseTableNames.Keys).insert({ 
      auth_id: authId, 
      actor_uri: actorUri, 
      public_key: publicKey, 
      private_key: privateKey 
    });

    if (keyResponse.error) {
      this.logger.error`Couldn't create keys: ${keyResponse.error}`;
      return Result.error(new Error(`Key creation failed: ${keyResponse.error.message}`));
    }
    
    return Result.ok(keyResponse.data);
  }
  
  async getFollowers(): Promise<Result<string[], Error>> {
    try {
      const response = await supabaseService.from(DatabaseTableNames.Followers).select();
      
      if (response.error) {
        this.logger.error`Error fetching followers: ${response.error}`;
        return Result.error(new Error(`Couldn't fetch followers: ${response.error.message}`));
      }
      
      const followers: string[] = [];
      for (const item of response.data || []) {
        if (followers.includes(item.follower_actor_uri)) continue;
        followers.push(item.follower_actor_uri);
      }
      
      return Result.ok(followers);
    } catch (error) {
      this.logger.error`Unexpected error fetching followers: ${error}`;
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }
}