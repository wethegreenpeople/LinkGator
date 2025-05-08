import { createMiddleware } from "@solidjs/start/middleware";
import { type FetchEvent } from "@solidjs/start/server";
import { createFederation, Federation, Follow, MemoryKvStore, Person } from "@fedify/fedify";
import { behindProxy } from "x-forwarded-fetch";
import { getLogger } from "@logtape/logtape";

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
        inbox: ctx.getInboxUri(identifier)
    });
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
    logger.debug(JSON.stringify(follower));
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