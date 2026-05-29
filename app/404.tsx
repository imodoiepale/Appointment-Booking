"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, FileQuestion } from "lucide-react";

export default function Custom404() {
    const router = useRouter();

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-6">
            {/* Background Ambient Glows */}
            <div className="pointer-events-none absolute -top-40 right-0 z-0 h-[600px] w-[600px] rounded-full bg-blue-100/50 opacity-60 blur-3xl dark:bg-blue-900/20" />
            <div className="pointer-events-none absolute -left-20 bottom-0 z-0 h-[400px] w-[400px] rounded-full bg-indigo-100/40 opacity-50 blur-3xl dark:bg-indigo-900/10" />

            <div className="relative z-10 w-full max-w-lg text-center">
                {/* Visual Element */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-blue-400/20 blur-2xl" />
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                            <FileQuestion className="h-12 w-12 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-8xl font-black tracking-tighter text-slate-950 dark:text-slate-50 sm:text-9xl">
                    404
                </h1>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                    Page not found
                </h2>
                <p className="mt-4 text-base font-medium text-slate-500 dark:text-slate-400">
                    Sorry, we couldn’t find the page you’re looking for. It might have been
                    moved, deleted, or the URL might be incorrect.
                </p>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="h-12 w-full gap-2 rounded-xl border-slate-200 bg-white px-6 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>

                    <Link href="/dashboard" className="w-full sm:w-auto">
                        <Button className="h-12 w-full gap-2 rounded-xl bg-blue-600 px-8 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98]">
                            <Home className="h-4 w-4" />
                            Return Home
                        </Button>
                    </Link>
                </div>

                {/* Support Link */}
                <p className="mt-12 text-sm font-medium text-slate-400">
                    Need help? <Link href="/support" className="text-blue-600 hover:underline">Contact Support</Link>
                </p>
            </div>
        </div>
    );
}