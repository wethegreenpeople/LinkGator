import { Database } from '~/models/supabase';
import { PluginType, Plugin } from './plugin';
import { Result } from 'typescript-result';
import { Post } from '../post';

export interface DatabasePlugin extends Plugin {
    // Required database plugin type
    pluginType: PluginType.DATABASE | (PluginType & {});

    getProfileFromActorUri(actorUri: string): Promise<Result<any, Error>>;
    getKeysForActor(actorUri: string): Promise<Result<{private_key: string, public_key: string}, Error>>;
    addFollower(followerActorUri: string, actorUri: string): Promise<Result<any, Error>>;
    removeFollower(followerActorUri: string): Promise<Result<any, Error>>;
    getFollowers(): Promise<Result<string[], Error>>;

    createUserProfile(authId: string, actorUri: string): Promise<Result<any, Error>>;
    createUserKeys(authId: string, actorUri: string, publicKey: string, privateKey: string): Promise<Result<any, Error>>;
    
    // Posts methods
    getAllPosts(): Promise<Result<Post[], Error>>;
    getPostById(id: string): Promise<Result<Post, Error>>;
    createPost(post: any): Promise<Result<Post, Error>>;
}