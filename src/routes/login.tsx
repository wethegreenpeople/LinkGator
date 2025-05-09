import { action, redirect, useLocation } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { DatabaseTableNames } from "~/models/database-tables";
import { supabase } from "~/utils/supabase";
import '@dotenvx/dotenvx/config'
import { getLogger } from "@logtape/logtape";
import { createClient } from "@supabase/supabase-js";

const logger = getLogger(["LinkGator"]);

// Create a Supabase client with service role key to bypass RLS during signup
const createServiceRoleClient = () => {
    "use server"
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    return createClient(supabaseUrl, supabaseServiceKey);
};

const signUp = action(async (formData: FormData) => {
    "use server"

    logger.debug`${formData.get("username")} signup`

    // Use regular client for auth signup
    const signUpResponse = await supabase.auth.signUp({ email: formData.get("email")?.toString() ?? "", password: formData.get("password")?.toString() ?? "" });
    if (signUpResponse.error) {
        logger.error`Signup error: ${signUpResponse.error.message}`;
        return new Response("Server Error", { status: 500 });
    }

    // Use service role client for profile creation to bypass RLS
    const serviceClient = createServiceRoleClient();
    const updateProfileResponse = await serviceClient.from(DatabaseTableNames.Profiles).insert({ 
        auth_id: signUpResponse.data.user?.id ?? "", 
        user_name: formData.get("username")?.toString() ?? "", 
        home_domain: process.env.DOMAIN ?? "" 
    });
    
    if (updateProfileResponse.error) {
        logger.info`Couldn't update profile: ${updateProfileResponse}`;
        return new Response("Server Error", { status: 500 });
    }

    return redirect("./");
});

export default function Login() {
    const [isLogin, setIsLogin] = createSignal(true);
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
                    <Show when={isLogin}>
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