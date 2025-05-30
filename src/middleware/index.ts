"use server"

import { createMiddleware } from "@solidjs/start/middleware";
import { type FetchEvent } from "@solidjs/start/server";
import { Accept, createFederation, exportJwk, Federation, Follow, generateCryptoKeyPair, importJwk, MemoryKvStore, Person, Undo } from "@fedify/fedify";
import { behindProxy } from "x-forwarded-fetch";
import { getLogger } from "@logtape/logtape";
import { PostgresKvStore } from "@fedify/postgres";
import postgres from "postgres";
import { createServerSupabaseClient, supabaseService } from "~/plugins/supabase/supabase-server";
import { DatabaseTableNames } from "~/models/database-tables";
import '@dotenvx/dotenvx/config'
import { PluginManager } from "~/plugins/manager";
import { Result } from "typescript-result";
import { PluginType } from "~/models/plugin_models/plugin";
import { DatabasePlugin } from "~/models/plugin_models/database-plugin";

const logger = getLogger(["LinkGator"]);
const pluginManager = PluginManager.getInstance();

const federation = createFederation<void>({
    kv: new PostgresKvStore(postgres(process.env.SUPABASE_CONNECTION_STRING ?? ""))
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    const profileResult = 
        await pluginManager.executeForPlugins<DatabasePlugin, Result<{}, Error>>((plugin) => plugin.getProfileFromActorUri(ctx.getActorUri(identifier).toString()), PluginType.DATABASE);
    
    if (profileResult.isError() || profileResult.value === null) {
        return null;
    }

    return new Person({
        id: ctx.getActorUri(identifier),
        name: identifier,
        summary: "This is me",
        preferredUsername: identifier,
        url: new URL("/", ctx.url),
        inbox: ctx.getInboxUri(identifier),
        publicKeys: (await ctx.getActorKeyPairs(identifier)).map(keyPair => keyPair.cryptographicKey)
    });
})
    .setKeyPairsDispatcher(async (ctx, identifier) => {
        // With the refactored executeForPlugins, we can now pass the Result directly
        const keysResult = await pluginManager.executeForPlugins<DatabasePlugin, { private_key: string; public_key: string }>(async (plugin) => 
            await plugin.getKeysForActor(ctx.getActorUri(identifier).toString()),
            PluginType.DATABASE
        );

        if (keysResult.isError() || !keysResult.value) {
            logger.warn`No valid key data found for user ${ctx.getActorUri(identifier).toString()}`;
            return [];
        }
        
        try {
            const privateKeyData = keysResult.value.private_key ? JSON.parse(keysResult.value.private_key) : null;
            const publicKeyData = keysResult.value.public_key ? JSON.parse(keysResult.value.public_key) : null;
            
            if (!privateKeyData || !publicKeyData) {
                logger.warn`Invalid key data format for user ${ctx.getActorUri(identifier).toString()}`;
                return [];
            }
            
            const privateKey = await importJwk(privateKeyData, "private");
            const publicKey = await importJwk(publicKeyData, "public");
            return [{ privateKey, publicKey }];
        } catch (error) {
            logger.error`Error parsing key data: ${error}`;
            return [];
        }
    });

federation
    .setInboxListeners("/users/{identifier}/inbox", "/inbox")
    .on(Follow, async (ctx, follow) => {
        if (follow.id == null || follow.actorId == null || follow.objectId == null) {
            return;
        }
        const parsed = ctx.parseUri(follow.objectId);
        if (parsed?.type !== "actor") return;
        const follower = await follow.getActor(ctx);

        if (follower === null) return;
        await ctx.sendActivity(
            { identifier: parsed.identifier },
            follower,
            new Accept({ actor: follow.objectId, object: follow }),
        );

        logger.debug`Follow request: ${follow}`;
        await pluginManager.executeForPlugins<DatabasePlugin, Result<any, Error>>(async (plugin) => 
            await plugin.addFollower(
                follow.actorId?.href.toString() ?? "", 
                ctx.getActorUri(parsed.identifier).toString()
            ),
            PluginType.DATABASE
        );
    })
    .on(Undo, async (ctx, undo) => {
        if (undo.id == null || undo.actorId == null || undo.objectId == null) {
            return;
        }
        logger.debug`Undo request: ${undo} for ${undo.actorId.href}`;
        await pluginManager.executeForPlugins<DatabasePlugin, Result<any, Error>>(async (plugin) => 
            await plugin.removeFollower(undo.actorId?.href.toString() ?? ""),
            PluginType.DATABASE
        );
    });


// Create a proxy-aware handler
const handleFederation = behindProxy(async (request: Request) => {
    try {
        const response = await federation.fetch(request, {
            contextData: undefined,
            onNotFound: async (request) => {
                return new Response(null, { status: 404 });
            },
            onNotAcceptable: async (request) => {
                return new Response("Not Acceptable", {
                    status: 406,
                    headers: {
                        "Content-Type": "text/plain",
                        Vary: "Accept"
                    },
                });
            }
        });

        return response;
    } catch (error) {
        // If there was an error, return a 404 to be handled in the middleware
        console.error("Federation error:", error);
        return new Response(null, { status: 404 });
    }
});

async function fedifyMiddleware(event: FetchEvent) {
    const url = new URL(event.request.url);
    
    // Skip processing for SolidStart server actions and login routes
    if (url.pathname.startsWith('/_server') || 
        url.pathname === '/login' || 
        url.pathname.startsWith('/api/')) {
        return undefined;
    }

    // Use the proxy-aware handler with the event request
    const response = await handleFederation(event.request);

    // If the response is a 404, let the request continue through normal routing
    // by returning undefined
    if (response.status === 404) {
        return undefined;
    }

    return response;
}

async function authMiddleware(event: FetchEvent) {
    const url = new URL(event.request.url)
    
    if (
        url.pathname.includes('.') ||
        url.pathname === '/login' ||
        url.pathname === '/logout' ||
        url.pathname.startsWith('/_server') ||
        url.pathname.startsWith('/api/')
    ) {
        return undefined
    }
    
    try {
        // Create a supabase client for this request that can handle cookies
        const supabase = createServerSupabaseClient(event)
        
        // Get the user session to refresh tokens if needed
        // This is the key step that refreshes tokens automatically
        await supabase.auth.getUser()
        
        // Continue the request/response cycle
        return undefined
    } catch (error) {
        console.error("Auth middleware error:", error)
        return undefined
    }
}


export default createMiddleware({
    onRequest: [authMiddleware, fedifyMiddleware]
});