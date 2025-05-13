import { action, createAsync, query, redirect, useAction, useLocation, useNavigate } from "@solidjs/router";
import { createSignal, Show, createEffect, createResource, onMount } from "solid-js";
import { DatabaseTableNames } from "~/models/database-tables";
import { getLogger } from "@logtape/logtape";
import { exportJwk, generateCryptoKeyPair } from "@fedify/fedify";
import { createServerSupabase, supabaseService } from "~/plugins/supabase/supabase-server";
import { supabaseClient } from "~/plugins/supabase/supabase-client";
import { AuthError, Session } from "@supabase/supabase-js";
import { PluginManager } from "~/plugins/manager";
import { DatabasePlugin } from "~/plugins/models/database-plugin";

const logger = getLogger(["LinkGator"]);

const signUp = action(async (formData: FormData) => {
    "use server"

    logger.debug`${formData.get("username")} signup`

    const pluginManager = PluginManager.getInstance();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const username = formData.get("username")?.toString() ?? "";
    const actorUri = `https://${process.env.DOMAIN}/users/${username}`;

    const signUpResult = await pluginManager.executeForPlugins<DatabasePlugin, {user: any}>(
        async (plugin) => await plugin.signUpUser(email, password)
    );

    if (signUpResult.isError()) {
        logger.error`Signup error: ${signUpResult.error}`;
        return new Response("Server Error", { status: 500 });
    }

    const authId = signUpResult.value?.user?.id;
    if (!authId) {
        logger.error`Signup error: No user ID returned`;
        return new Response("Server Error", { status: 500 });
    }

    const profileResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
        async (plugin) => await plugin.createUserProfile(authId, actorUri)
    );

    if (profileResult.isError()) {
        logger.error`Couldn't update profile: ${profileResult.error}`;
        return new Response("Server Error", { status: 500 });
    }

    const { privateKey, publicKey } = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
    const exportedPublicKey = JSON.stringify(await exportJwk(publicKey));
    const exportedPrivateKey = JSON.stringify(await exportJwk(privateKey));

    const keysResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
        async (plugin) => await plugin.createUserKeys(
            authId, 
            actorUri, 
            exportedPublicKey, 
            exportedPrivateKey
        )
    );

    if (keysResult.isError()) {
        logger.error`Couldn't create keys: ${keysResult.error}`;
        return new Response("Server Error", { status: 500 });
    }

    const signInResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
        async (plugin) => await plugin.signInUser(email, password)
    );

    if (signInResult.isError()) {
        logger.error`Couldn't sign in user: ${signInResult.error}`;
        return new Response("Server Error", { status: 500 });
    }

    // Create a proper redirect response that will preserve cookies
    return new Response(null, {
        status: 302,
        headers: {
            Location: "./"
        }
    });
});

const logIn = action(async (formData: FormData) => {
    "use server"

    const pluginManager = PluginManager.getInstance();
    const usernameInput = formData.get("username")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    
    if (!usernameInput || !password) {
        logger.error`Login error: Missing username or password`;
        return new Response("Missing username or password", { status: 400 });
    }
    
    // Check if the input is a federated ID (contains @)
    let username = usernameInput;
    let actorUri;
    
    if (usernameInput.includes('@')) {
        // It's a federated ID: username@domain.com
        const [extractedUsername, domain] = usernameInput.split('@');
        username = extractedUsername;
        actorUri = `https://${domain}/users/${username}`;
    } else {
        // It's a regular username
        actorUri = `https://${process.env.VITE_DOMAIN}/users/${username}`;
    }
    
    // Query the Profiles table to find the auth_id associated with that actor_uri
    const profileResponse = await supabaseService
        .from(DatabaseTableNames.Profiles)
        .select()
        .eq('actor_uri', actorUri)
        .limit(1);
    
    if (profileResponse.error || !profileResponse.data || profileResponse.data.length === 0) {
        logger.error`Login error: User not found for actor URI ${actorUri}`;
        return new Response("User not found", { status: 404 });
    }
    
    const auth_id = profileResponse.data[0].auth_id;
    
    // Get user details from the auth system
    const userResponse = await supabaseService.auth.admin.getUserById(auth_id);
    
    if (userResponse.error || !userResponse.data.user?.email) {
        logger.error`Login error: Could not retrieve user details for auth_id ${auth_id}`;
        return new Response("Could not retrieve user details", { status: 500 });
    }
    
    const email = userResponse.data.user.email;
    const signInResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
        async (plugin) => {
            return await plugin.signInUser(email, password);
        }
    );
    
    if (signInResult.isError()) {
        logger.error`Login error: ${signInResult.error}`;
        return { error: "Login failed" };
    }
    logger.debug `${signInResult}`

    return redirect("./");
});

const checkIfLoggedIn = query(async () => {
    "use server"
    const pluginManager = PluginManager.getInstance();
    
    try {
        const sessionResult = await pluginManager.executeForPlugins<DatabasePlugin, {session: any} | null>(
            async (plugin) => await plugin.checkIfLoggedIn()
        );
        
        if (sessionResult.isError()) {
            logger.error`Session check error: ${sessionResult.error}`;
            return null;
        }
        
        if (sessionResult.value?.session) {
            throw redirect("./");
        }
        
        return null;
    } catch (error) {
        if (error instanceof Response) {
            throw error; // Rethrow redirect responses
        }
        logger.error`Unexpected error in checkIfLoggedIn: ${error}`;
        return null;
    }
}, "checkIfLoggedIn");
  

export default function Login() {
    const [isLogin, setIsLogin] = createSignal(true);
    createAsync(() => checkIfLoggedIn());
    
    return (
        <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div class="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {isLogin() ? "Sign in to your account" : "Create a new account"}
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    {isLogin() ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin());
                        }}
                        class="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                    >
                        {isLogin() ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>

            <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <Show when={isLogin()}>
                        <form action={logIn} method="post" class="text-black">
                            <div class="space-y-6">
                                <Show when={false}>
                                    <div class="bg-red-50 p-4 rounded-md">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <h3 class="text-sm font-medium text-red-800"></h3>
                                            </div>
                                        </div>
                                    </div>
                                </Show>

                                <Show when={false}>
                                    <div class="bg-green-50 p-4 rounded-md">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <h3 class="text-sm font-medium text-green-800">Registration successful! You can now sign in.</h3>
                                            </div>
                                        </div>
                                    </div>
                                </Show>

                                <div>
                                    <label for="username" class="block text-sm font-medium text-gray-700">
                                        Username
                                    </label>
                                    <div class="mt-1">
                                        <input
                                            id="username"
                                            name="username"
                                            type="text"
                                            required
                                            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label for="password" class="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <div class="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autocomplete="new-password"
                                            required
                                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Create account
                                    </button>
                                </div>
                            </div>
                        </form>
                    </Show>
                    <Show when={!isLogin()}>
                        <form action={signUp} method="post" class="text-black">
                            <div class="space-y-6">
                                <Show when={false}>
                                    <div class="bg-red-50 p-4 rounded-md">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <h3 class="text-sm font-medium text-red-800"></h3>
                                            </div>
                                        </div>
                                    </div>
                                </Show>

                                <Show when={false}>
                                    <div class="bg-green-50 p-4 rounded-md">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <h3 class="text-sm font-medium text-green-800">Registration successful! You can now sign in.</h3>
                                            </div>
                                        </div>
                                    </div>
                                </Show>

                                <div>
                                    <label for="username" class="block text-sm font-medium text-gray-700">
                                        Username
                                    </label>
                                    <div class="mt-1">
                                        <input
                                            id="username"
                                            name="username"
                                            type="text"
                                            required
                                            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label for="email" class="block text-sm font-medium text-gray-700">
                                        Email address
                                    </label>
                                    <div class="mt-1">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autocomplete="email"
                                            required
                                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label for="password" class="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <div class="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autocomplete="new-password"
                                            required
                                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Create account
                                    </button>
                                </div>
                            </div>
                        </form>
                    </Show>
                </div>
            </div>
        </div>
    );
}