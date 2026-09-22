const API=process.env.NEXT_PUBLIC_API_URL || (typeof window==='undefined' ? 'http://localhost:4000' : '/api');

let refreshPromise: Promise<string|null>|null = null;

class ApiError extends Error {
  status:number;
  constructor(message:string,status:number){super(message);this.name='ApiError';this.status=status;}
}

async function rawFetch(path:string,opts:any={},token?:string){
  const headers:any={'Content-Type':'application/json',...(opts.headers||{})};
  if(token)headers.Authorization=`Bearer ${token}`;
  try {
    return await fetch(API+path,{...opts,headers,cache:'no-store'});
  } catch (e:any) {
    throw new ApiError(`Impossible de joindre le serveur (${API}). Vérifiez NEXT_PUBLIC_API_URL et que l'API est démarrée.`,0);
  }
}

function storeSession(accessToken:string,refreshToken?:string){
  if(typeof window==='undefined')return;
  localStorage.setItem('token',accessToken);
  if(refreshToken)localStorage.setItem('refreshToken',refreshToken);
  document.cookie=`nova_access_token=${encodeURIComponent(accessToken)}; Max-Age=604800; Path=/; SameSite=Lax`;
}

async function refreshAccessToken():Promise<string|null>{
  if(typeof window==='undefined')return null;
  if(refreshPromise)return refreshPromise;
  const refreshToken=localStorage.getItem('refreshToken');
  if(!refreshToken)return null;
  refreshPromise=(async()=>{
    try{
      const rr=await rawFetch('/auth/refresh',{method:'POST',body:JSON.stringify({refreshToken})});
      const text=await rr.text();
      let data:any={};
      try{data=JSON.parse(text)}catch{}
      if(!rr.ok||!data?.accessToken)return null;
      storeSession(data.accessToken,data.refreshToken);
      return data.accessToken as string;
    }catch{return null}
    finally{refreshPromise=null}
  })();
  return refreshPromise;
}

export async function api(path:string,opts:any={}){
  const token=typeof window!=='undefined'?localStorage.getItem('token'):null;
  let r=await rawFetch(path,opts,token||undefined);

  if(r.status===401&&typeof window!=='undefined'&&localStorage.getItem('refreshToken')&&path!=='/auth/refresh'){
    const accessToken=await refreshAccessToken();
    if(accessToken)r=await rawFetch(path,opts,accessToken);
  }

  const text=await r.text();
  let data:any;
  try{data=JSON.parse(text)}catch{data={message:text}};
  if(!r.ok)throw new ApiError(data?.message||'Erreur',r.status);
  return data;
}

export function money(v:any){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(v||0))+' XOF'}
export function go(path:string){if(typeof window!=='undefined')window.location.href=path}
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hagjibqjpytkwpktdbnx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
export const SUPABASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'projects';
