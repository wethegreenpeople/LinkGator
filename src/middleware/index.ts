"use server"

import { createMiddleware } from "@solidjs/start/middleware";
import { type FetchEvent } from "@solidjs/start/server";
import { Accept, createFederation, exportJwk, Federation, Follow, generateCryptoKeyPair, importJwk, MemoryKvStore, Person, Undo } from "@fedify/fedify";
import { behindProxy } from "x-forwarded-fetch";
import { getLogger } from "@logtape/logtape";
import { PostgresKvStore } from "@fedify/postgres";
import postgres from "postgres";
import { supabaseServer } from "~/utils/supabase-server";
import { DatabaseTableNames } from "~/models/database-tables";
import '@dotenvx/dotenvx/config'

const logger = getLogger(["LinkGator"]);

const federation = createFederation<void>({
    kv: new PostgresKvStore(postgres(process.env.SUPABASE_CONNECTION_STRING ?? ""))
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    const response = await supabaseServer.from(DatabaseTableNames.Profiles)
        .select()
        .eq('actor_uri', ctx.getActorUri(identifier).toString())
        .limit(1);

    const user = response.data && response.data.length > 0 ? response.data[0] : null;
    if (user === null) {
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
        // Filter keys by the current user's ID
        const entry = await supabaseServer.from(DatabaseTableNames.Keys)
            .select()
            .eq('actor_uri', `${ctx.getActorUri(identifier)}`)
            .order("created_at", { ascending: false })
            .limit(1);
        
        const entryData = entry.data ? entry.data[0] : null;
        
        // Check if we have valid data before parsing
        if (!entryData || !entryData.private_key || !entryData.public_key) {
            logger.warn`No valid key data found for user ${ctx.getActorUri(identifier).toString()}`;
            return [];
        }
        
        try {
            const privateKeyData = entryData.private_key ? JSON.parse(entryData.private_key) : null;
            const publicKeyData = entryData.public_key ? JSON.parse(entryData.public_key) : null;
            
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
        await supabaseServer.from(DatabaseTableNames.Followers).insert({ follower_actor_uri: follow.actorId.href.toString(), actor_uri: ctx.getActorUri(parsed.identifier).toString() });
    })
    .on(Undo, async (ctx, undo) => {
        if (undo.id == null || undo.actorId == null || undo.objectId == null) {
            return;
        }
        logger.debug`Undo request: ${undo} for ${undo.actorId.href}`;
        await supabaseServer.from(DatabaseTableNames.Followers).delete().eq("follower_actor_uri", undo.actorId.href);
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

export default createMiddleware({
    onRequest: [fedifyMiddleware]
});