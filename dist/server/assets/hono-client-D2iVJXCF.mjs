import { hc } from "hono/client";
const client = hc("/");
export {
  client as c
};
