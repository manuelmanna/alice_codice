import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // ── Operatore ──
    // Proteggi dashboard operatore
    if (!user && pathname.startsWith('/operatore/dashboard')) {
        const url = request.nextUrl.clone();
        url.pathname = '/operatore/login';
        return NextResponse.redirect(url);
    }

    // Se autenticato e va al login/registrazione operatore, redirect alla dashboard
    if (
        user &&
        (pathname === '/operatore/login' || pathname === '/operatore/registrati')
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/operatore/dashboard';
        return NextResponse.redirect(url);
    }

    // ── Paziente ──
    // Proteggi pagine paziente (home e sotto-pagine)
    if (
        !user &&
        pathname.startsWith('/paziente/') &&
        pathname !== '/paziente/login' &&
        pathname !== '/paziente/registrati'
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/paziente/login';
        return NextResponse.redirect(url);
    }

    // Se autenticato e va al login/registrazione paziente, redirect alla home
    if (
        user &&
        (pathname === '/paziente/login' || pathname === '/paziente/registrati')
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/paziente/home';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/operatore/:path*', '/paziente/:path*'],
};
