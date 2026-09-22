import { NextResponse } from 'next/server'
import { createServerClient } from '@novafit/supabase/src/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('--- AUTH CALLBACK ---')
  console.log('URL:', request.url)
  console.log('Code:', code)
  console.log('Next:', next)

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Exchange error:', error)

    if (!error) {
      console.log('Redirecting to:', `${origin}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  console.log('Redirecting to login due to missing code or error')
  return NextResponse.redirect(`${origin}/login?error=invalid_token`)
}
