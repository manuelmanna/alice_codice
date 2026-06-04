import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const HOME = '/';
const OPERATORE_DASHBOARD = '/operatore/dashboard';
const OPERATORE_LOGIN = '/operatore/login';
const OPERATORE_REGISTRATI = '/operatore/registrati';
const PAZIENTE_HOME = '/paziente/home';
const PAZIENTE_LOGIN = '/paziente/login';
const PAZIENTE_REGISTRATI = '/paziente/registrati';

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

function isPazientePublicRoute(pathname: string) {
  return pathname === PAZIENTE_LOGIN || pathname === PAZIENTE_REGISTRATI;
}

function isPazientePrivateRoute(pathname: string) {
  return pathname.startsWith('/paziente/') && !isPazientePublicRoute(pathname);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Supabase aggiorna i cookie qui quando rinnova la sessione.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Se l'utente loggato torna alla home, lo mando nella sua area principale.
  if (user && pathname === HOME) {
    const role = user.user_metadata?.role;
    return redirectTo(
      request,
      role === 'paziente' ? PAZIENTE_HOME : OPERATORE_DASHBOARD
    );
  }

  if (!user && pathname.startsWith(OPERATORE_DASHBOARD)) {
    return redirectTo(request, OPERATORE_LOGIN);
  }

  if (
    user &&
    (pathname === OPERATORE_LOGIN || pathname === OPERATORE_REGISTRATI)
  ) {
    return redirectTo(request, OPERATORE_DASHBOARD);
  }

  if (!user && isPazientePrivateRoute(pathname)) {
    return redirectTo(request, PAZIENTE_LOGIN);
  }

  if (user && isPazientePublicRoute(pathname)) {
    return redirectTo(request, PAZIENTE_HOME);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/operatore/:path*', '/paziente/:path*'],
};
