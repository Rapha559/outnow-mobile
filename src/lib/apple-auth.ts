import * as AppleAuthentication from 'expo-apple-authentication';

import { apiRequest } from '@/lib/api';

type AppleMode='login'|'signup';
type AppleRole='CUSTOMER'|'PROMOTER';
type AppleResponse={success:true;requiresVerification:true;challengeToken:string;email:string;role:AppleRole};

export async function isAppleSignInAvailable(){
  try{return await AppleAuthentication.isAvailableAsync();}catch{return false;}
}

export async function startAppleAuth(input:{mode:AppleMode;role?:AppleRole}){
  const credential=await AppleAuthentication.signInAsync({
    requestedScopes:[
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if(!credential.identityToken)throw new Error('Apple did not return a valid identity token.');
  const data=await apiRequest<AppleResponse>('/api/mobile/auth/apple',{
    method:'POST',
    body:JSON.stringify({
      mode:input.mode,
      role:input.role||'CUSTOMER',
      identityToken:credential.identityToken,
      appleUser:credential.user,
      email:credential.email||undefined,
      firstName:credential.fullName?.givenName||undefined,
      lastName:credential.fullName?.familyName||undefined,
    }),
  });
  return data;
}

export { AppleAuthentication };
