import * as WebBrowser from 'expo-web-browser';

import { API_BASE } from '@/lib/api';

type GoogleMode='login'|'signup';
type GoogleRole='CUSTOMER'|'PROMOTER';

export type MobileGoogleResult={
  challengeToken:string;
  email:string;
  role:GoogleRole;
  mode:GoogleMode;
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
    };
    throw new Error(messages[error]||'Google sign-in failed. Please try again.');
  }

  const challengeToken=callback.searchParams.get('challengeToken')||'';
  const email=callback.searchParams.get('email')||'';
  const role=callback.searchParams.get('role')==='PROMOTER'?'PROMOTER':'CUSTOMER';
  const mode=callback.searchParams.get('mode')==='signup'?'signup':'login';
  const redirect=callback.searchParams.get('redirect')||undefined;
  if(!challengeToken||!email)throw new Error('Google sign-in did not return a valid verification session.');
  return {challengeToken,email,role,mode,redirect} as MobileGoogleResult;
}
