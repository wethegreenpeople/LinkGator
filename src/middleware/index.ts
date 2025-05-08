import { createMiddleware } from "@solidjs/start/middleware";
import { type FetchEvent } from "@solidjs/start/server";
import { Accept, createFederation, exportJwk, Federation, Follow, generateCryptoKeyPair, importJwk, MemoryKvStore, Person, Undo } from "@fedify/fedify";
import { behindProxy } from "x-forwarded-fetch";
import { getLogger } from "@logtape/logtape";
import { openKv } from "@deno/kv";

export const kv = await openKv("kv.db");

const logger = getLogger(["LinkGator"]);

const federation = createFederation<void>({
    kv: new MemoryKvStore()
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    if (identifier !== "me") {
        return null;
    }
    return new Person({
        id: ctx.getActorUri(identifier),
        name: "Me",
        summary: "This is me",
        preferredUsername: identifier,
        url: new URL("/", ctx.url),
        inbox: ctx.getInboxUri(identifier),
        publicKeys: (await ctx.getActorKeyPairs(identifier)).map(keyPair => keyPair.cryptographicKey)
    });
})
    .setKeyPairsDispatcher(async (ctx, identifier) => {
        if (identifier != "me") return [];  // Other than "me" is not found.
        const entry = await kv.get<{
            privateKey: JsonWebKey;
            publicKey: JsonWebKey;
        }>(["key"]);
        if (entry == null || entry.value == null) {
            // Generate a new key pair at the first time:
            const { privateKey, publicKey } = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
            // Store the generated key pair to the Deno KV database in JWK format:
            await kv.set(
                ["key"],
                {
                    privateKey: await exportJwk(privateKey),
                    publicKey: await exportJwk(publicKey),
                }
            );
            return [{ privateKey, publicKey }];
        }
        // Load the key pair from the Deno KV database:
        const privateKey = await importJwk(entry.value.privateKey, "private");
        const publicKey = await importJwk(entry.value.publicKey, "public");
        return [{ privateKey, publicKey }];
    });

federation
    .setInboxListeners("/users/{identifier}/inbox", "/inbox")
    .on(Follow, async (ctx, follow) => {
        if (follow.id == null || follow.actorId == null || follow.objectId == null) {
            return;
        }
        const parsed = ctx.parseUri(follow.objectId);
        if (parsed?.type !== "actor" || parsed.identifier !== "me") return;
        const follower = await follow.getActor(ctx);

        if (follower === null) return;
        await ctx.sendActivity(
            { identifier: parsed.identifier },
            follower,
            new Accept({ actor: follow.objectId, object: follow }),
        );

        logger.debug `Follow request: ${follow}`;
        await kv.set(["followers", follow.actorId.href], follower.preferredUsername);
    })
    .on(Undo, async (ctx, undo) => {
        if (undo.id == null || undo.actorId == null || undo.objectId == null) {
            return;
        }
        logger.debug `Undo request: ${undo} for ${undo.actorId.href}`;
        const doot = kv.list({prefix:["followers"]});
        for await (const item of doot) {
            logger.debug `${item}`
        }
        await kv.delete(["followers", undo.actorId.href]);
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