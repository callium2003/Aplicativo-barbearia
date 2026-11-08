export function requireSandboxDatabaseTarget(value, sharedTestEnabled = false) {
 let url;
 try { url = new URL(value); } catch { throw new Error('Invalid sandbox database target'); }
 const local = url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname) && ['56321','54321'].includes(url.port);
 const shared = sharedTestEnabled === true && url.origin === 'https://irszgnkzqseljowckrgz.supabase.co';
 if ((!local && !shared) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Sandbox database target denied');
 return url.origin;
}
