import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let vite, api;
const originalFetch = globalThis.fetch;
before(async () => {
 const root = fileURLToPath(new URL("..", import.meta.url));
 vite = await createServer({root,configFile:false,server:{hmr:false,watch:null}});
 api = await vite.ssrLoadModule("/src/lib/snapshot-api.ts");
});
after(async () => { globalThis.fetch=originalFetch;await vite?.close(); });

const id="a".repeat(32), token="b".repeat(42)+"A";
const meta={id,title:"<Title> & covers",createdAt:"2026-10-04T00:00:00Z",expiresAt:"2027-01-02T00:00:00Z",imageBytes:100};
const publication={...meta,publicUrl:`/s/${id}`,imageUrl:`/api/snapshots/${id}/image`,downloadUrl:`/api/snapshots/${id}/download`,managementToken:token,managementUrl:`/manage/${id}#token=${token}`};

test("publication key carries timestamp plus random secret and stays stable across explicit retries",async()=>{
 const now=Date.now();const key=api.newPublicationKey(now);
 const bytes=Buffer.from(key,"base64url");
 assert.equal(bytes.length,40);assert.equal(Number(bytes.readBigUInt64BE()),Math.floor(now/1000));
 assert.notEqual(api.newPublicationKey(now),key);
 let calls=0;
 globalThis.fetch=async(path,init)=>{
  assert.equal(path,"/api/snapshots");assert.equal(init.method,"POST");assert.equal(init.headers["Idempotency-Key"],key);
  assert.equal(init.body.get("title"),meta.title);assert.equal(await init.body.get("image").text(),"png-bytes");
  assert.equal(init.cache,"no-store");assert.equal(init.referrerPolicy,"no-referrer");assert.equal(init.credentials,"omit");assert.equal(init.redirect,"error");
  if (++calls===1) throw new Error("Lost response");
  return Response.json(publication,{status:201});
 };
 const image=new Blob(["png-bytes"],{type:"image/png"});
 await assert.rejects(()=>api.publishSnapshot(image,meta.title,key),/Lost response/);
 assert.equal(calls,1);
 assert.deepEqual(await api.publishSnapshot(image,meta.title,key),publication);
 assert.equal(calls,2);
});

test("public and management requests validate payloads and put credentials only in headers",async()=>{
 globalThis.fetch=async(path,init)=>{
  assert.equal(path,`/api/snapshots/${id}`);assert.equal(init.headers,undefined);return Response.json(meta);
 };
 assert.deepEqual(await api.fetchSnapshot(id),meta);
 globalThis.fetch=async(path,init)=>{
  assert.equal(path,`/api/snapshots/${id}/management`);assert.equal(init.headers.Authorization,`Bearer ${token}`);return Response.json({snapshot:meta,status:"active"});
 };
 assert.deepEqual(await api.fetchSnapshotManagement(id,token),{snapshot:meta,status:"active"});
 globalThis.fetch=async(path,init)=>{
  assert.equal(path,`/api/snapshots/${id}`);assert.equal(init.method,"DELETE");assert.equal(init.headers.Authorization,`Bearer ${token}`);return new Response(null,{status:204});
 };
 await api.revokeSnapshot(id,token);
});

test("malformed responses and unexpected public authorization are rejected without logging secrets",async()=>{
 for(const payload of [{}, {...meta,managementToken:token}, {...meta,id:"wrong"}, {...meta,expiresAt:"bad"}, {...meta,imageBytes:10_000_001}]) {
  globalThis.fetch=async()=>Response.json(payload);
  await assert.rejects(()=>api.fetchSnapshot(id),/validation error/);
 }
 for(const payload of [{...publication,publicUrl:"https://attacker.test"},{...publication,managementToken:"bad"},{...publication,createdAt:"bad"}]) {
  globalThis.fetch=async()=>Response.json(payload);
  await assert.rejects(()=>api.publishSnapshot(new Blob(),"",api.newPublicationKey()),/validation error/);
 }
 globalThis.fetch=async()=>Response.json({snapshot:meta,status:"unknown"});
 await assert.rejects(()=>api.fetchSnapshotManagement(id,token),/validation error/);
 globalThis.fetch=()=>assert.fail("invalid input requested network");
 await assert.rejects(()=>api.fetchSnapshot("bad"));await assert.rejects(()=>api.revokeSnapshot(id,"bad"));
});

test("throttling, capacity, and uncertain errors preserve status and delay without automatic retry",async()=>{
 let calls=0;
 for(const status of [400,404,409,410,429,507,503]) {
  globalThis.fetch=async()=>{calls++;return Response.json({error:"Try again with the same key"},{status,headers:{"Retry-After":"3600"}});};
  await assert.rejects(()=>api.publishSnapshot(new Blob(),"",api.newPublicationKey()),err=>err instanceof api.SnapshotAPIError && err.status===status && err.retryAfter===3600);
 }
 assert.equal(calls,7);
 globalThis.fetch=async()=>new Response("gateway failed",{status:503});
 await assert.rejects(()=>api.fetchSnapshot(id),err=>err instanceof api.SnapshotAPIError && err.status===503 && err.retryAfter===null);
});
