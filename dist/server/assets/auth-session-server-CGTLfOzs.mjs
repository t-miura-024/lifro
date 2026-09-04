import { T as TSS_SERVER_FUNCTION, c as createServerFn, g as getRequestHeaders } from "../server.mjs";
import { t as toUserId } from "./user-id-DBoM6eed.mjs";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
var createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getSessionUserIdServerFn_createServerFn_handler = createServerRpc({
  id: "d7f7afd587c2e73a5fabe15fd9dde630f3813b9d6699f72c3e89c216fe6aeb19",
  name: "getSessionUserIdServerFn",
  filename: "src/lib/auth-session-server.ts"
}, (opts) => getSessionUserIdServerFn.__executeServer(opts));
const getSessionUserIdServerFn = createServerFn({
  method: "GET"
}).handler(getSessionUserIdServerFn_createServerFn_handler, async () => {
  const {
    auth
  } = await import("./auth-sbdKgJv0.mjs");
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({
    headers
  });
  return {
    userId: toUserId(session?.user?.id)
  };
});
export {
  getSessionUserIdServerFn_createServerFn_handler
};
