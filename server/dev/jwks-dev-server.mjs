// Throwaway dev JWKS server: stands in for hosted Neon Auth so we can mint
// valid RS256 tokens the server's requireAuth middleware will accept.
import http from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint } from 'jose';

const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const pubJwk = await exportJWK(publicKey);
const kid = await calculateJwkThumbprint(pubJwk);
pubJwk.kid = kid;
pubJwk.alg = 'RS256';
pubJwk.use = 'sig';

const jwks = { keys: [pubJwk] };

async function mint(sub) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// Persist a freshly minted token for a demo user so shell/curl can read it.
const demoUser = 'demo-user-1';
writeFileSync('/tmp/devauth/token.txt', await mint(demoUser));

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/jwks.json')) {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(jwks));
  } else if (req.url.startsWith('/token')) {
    const sub = new URL(req.url, 'http://x').searchParams.get('sub') || demoUser;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ token: await mint(sub) }));
  } else {
    res.statusCode = 404;
    res.end('not found');
  }
});

server.listen(9999, () => console.log('JWKS dev server on http://localhost:9999/jwks.json'));
