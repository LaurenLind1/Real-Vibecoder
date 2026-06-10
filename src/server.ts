import { createStartHandler } from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";

export default createStartHandler({
  createRouter: () => {
    // This dynamically imports the auto-generated route tree
    const { createRouter } = require("./router");
    return createRouter();
  },
  getRouterManifest,
});
