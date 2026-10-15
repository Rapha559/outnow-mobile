import * as WebBrowser from 'expo-web-browser';

import { API_BASE, apiRequest } from '@/lib/api';

type GoogleMode='login'|'signup';
type GoogleRole='CUSTOMER'|'PROMOTER';

type OutNowUser={
  id:string;
  name:string;
  email:string;
  phone?:string|null;
  role:GoogleRole;
};

export type MobileGoogleResult={
  sessionToken:string;
  expiresAt:string;
  user:OutNowUser;
  redirect?:string;
};

const CALLBACK='outnowtickets://auth/google';

export async function startMobileGoogleAuth(input:{mode:GoogleMode;role?:GoogleRole;redirect?:string}){
  const url=new URL(`${API_BASE}/api/mobile/auth/google/start`);
  url.searchParams.set('mode',input.mode);
  url.searchParams.set('role',input.role||'CUSTOMER');
  if(input.redirect)url.searchParams.set('redirect',input.redirect);

  const result=await WebBrowser.openAuthSessionAsync(url.toString(),CALLBACK);
  if(result.type!=='success'||!result.url)throw new Error('Google sign-in was cancelled.');
  const callback=new URL(result.url);
  const error=callback.searchParams.get('error');
  if(error){
    const messages:Record<string,string>={
      account_exists:'An account with this Google email already exists. Sign in instead.',
      account_not_found:'No OutNow account was found for this Google email. Create an account first.',
      account_disabled:'This OutNow account is disabled.',
      google_session_expired:'Google sign-in expired. Please try again.',
      google_not_configured:'Google sign-in is not configured yet.',
      google_token_failed:'Google could not complete sign-in. Please try again.',
      google_account_invalid:'Google could not verify this account.',
      google_auth_failed:'Google sign-in failed. Please try again.',
    };
    throw new Error(messages[error]||'Google sign-in failed. Please try again.');
  }

  const challengeToken=callback.searchParams.get('challengeToken')||'';
  if(!/^g_[a-f0-9]{64}$/i.test(challengeToken)){
    throw new Error('Google sign-in did not return a valid session.');
  }

  return apiRequest<MobileGoogleResult>('/api/mobile/auth/google/complete',{
    method:'POST',
    body:JSON.stringify({challengeToken}),
  });
}
