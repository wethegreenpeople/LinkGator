import { Database } from '~/models/supabase';
import { Plugin } from '../models/plugin';
import { Result } from 'typescript-result';

export interface DatabasePlugin extends Plugin {
    getProfileFromActorUri(actorUri: string): Promise<Result<any, Error>>;
    getKeysForActor(actorUri: string): Promise<Result<{private_key: string, public_key: string}, Error>>;
    addFollower(followerActorUri: string, actorUri: string): Promise<Result<any, Error>>;
    removeFollower(followerActorUri: string): Promise<Result<any, Error>>;
    
    // Added new methods for user management
    signUpUser(email: string, password: string): Promise<Result<{user: any}, Error>>;
    createUserProfile(authId: string, actorUri: string): Promise<Result<any, Error>>;
    createUserKeys(authId: string, actorUri: string, publicKey: string, privateKey: string): Promise<Result<any, Error>>;
    signInUser(email: string, password: string): Promise<Result<any, Error>>;
    
    // Added method for fetching followers
    getFollowers(): Promise<Result<string[], Error>>;
}