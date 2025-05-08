import { createMiddleware } from "@solidjs/start/middleware";
import { type FetchEvent } from "@solidjs/start/server";
import { createFederation, Federation, MemoryKvStore } from "@fedify/fedify";
import { integrateFederation, onError } from "@fedify/h3";
import { EventHandlerRequest } from "vinxi/http";


const federation = createFederation<void>({
    kv: new MemoryKvStore()
});

async function fedifyMiddleware(event: FetchEvent) {
    await federation.fetch(event.request, {
        contextData: undefined,
        onNotFound: async (request) => {
            return new Response("Not Found", { status: 404 });
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
}

export default createMiddleware({
    onRequest: [fedifyMiddleware]
});